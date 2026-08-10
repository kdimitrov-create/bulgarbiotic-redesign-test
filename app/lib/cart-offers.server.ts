import {dedupeGifts, type CartOffers, type GiftOffer, type CartRuleNotice} from './cart-offers';

/**
 * Reads the merchant's cart promotions from the Admin API.
 *
 * Same two traps as everywhere else in this codebase:
 *   • the LIST query returns hollow rows — `targets`/`actions` on a cross-sell
 *     and `rows` on a cart rule only come back from the single-item query, so
 *     the ids are listed first and then pulled in one aliased request;
 *   • money arrives in hundredths (69.99 € shows up as 6999).
 *
 * SERVER ONLY — the `.server.ts` suffix keeps the PAT out of the client bundle.
 */

const CACHE_TTL_MS = 30 * 1000;
const REQUEST_TIMEOUT_MS = 8000;

const LIST_QUERY = `query CartOfferIds($first: Int!) {
  crossSells(first: $first) {
    edges { node { id name status offerTitle activeFrom activeTo discountType freeProducts } }
  }
  cartRules(first: $first) {
    edges { node { id name title status statusKey activeFrom activeTo } }
  }
}`;

function detailQuery(crossSellIds: string[], cartRuleIds: string[]): string {
  const cs = crossSellIds.map(
    (id) => `c${id}: crossSell(id: "${id}") {
      id offerTitle
      targets { action comparison amount }
      actions { itemId itemType itemName }
    }`,
  );
  const cr = cartRuleIds.map(
    (id) => `r${id}: cartRule(id: "${id}") { id title rows { message } }`,
  );
  return `query CartOfferDetails { ${[...cs, ...cr].join(' ')} }`;
}

interface RawCrossSell {
  id: string;
  name: string;
  status: number;
  offerTitle: string | null;
  activeFrom: string | null;
  activeTo: string | null;
  discountType: string | null;
  freeProducts: boolean;
}

interface RawCartRule {
  id: string;
  name: string;
  title: string | null;
  status: number;
  statusKey: string | null;
  activeFrom: string | null;
  activeTo: string | null;
}

let cache: {at: number; data: CartOffers} | null = null;

/** Never throws; returns null when unconfigured or the call failed. */
export async function fetchCartOffers(
  env: Record<string, string | undefined>,
): Promise<CartOffers | null> {
  const pat = env.CLOUDCART_ADMIN_PAT || env.CLOUDCARTADMINPAT;
  const origin = apiOrigin(env);
  if (!pat || !origin) return null;

  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;

  try {
    const listed = await gql<{
      crossSells?: {edges?: Array<{node: RawCrossSell}>};
      cartRules?: {edges?: Array<{node: RawCartRule}>};
    }>(origin, pat, LIST_QUERY, {first: 100});

    const crossSells = (listed?.crossSells?.edges ?? [])
      .map((e) => e.node)
      .filter((c) => c.status === 1 && c.freeProducts && isRunning(c.activeFrom, c.activeTo));
    const cartRules = (listed?.cartRules?.edges ?? [])
      .map((e) => e.node)
      .filter((r) => r.status === 1 && isRunning(r.activeFrom, r.activeTo));

    if (!crossSells.length && !cartRules.length) {
      cache = {at: Date.now(), data: {gifts: [], rules: []}};
      return cache.data;
    }

    const details = await gql<Record<string, any>>(
      origin, pat,
      detailQuery(crossSells.map((c) => String(c.id)), cartRules.map((r) => String(r.id))),
      {},
    );

    const gifts: GiftOffer[] = [];
    for (const offer of crossSells) {
      const detail = details?.[`c${offer.id}`];
      // The threshold lives on a target with action "cart"; without one the
      // offer is not a "spend X, get Y" and this surface cannot express it.
      const threshold = (detail?.targets ?? []).find((t: any) => t.action === 'cart' && t.amount);
      const reward = (detail?.actions ?? []).find((a: any) => a.itemType === 'product');
      if (!threshold || !reward) continue;
      gifts.push({
        id: String(offer.id),
        title: offer.offerTitle || offer.name,
        minTotal: Number(threshold.amount) / 100,
        productTitle: reward.itemName ?? 'Подарък',
        imageUrl: null,
        handle: null,
        productId: String(reward.itemId),
        free: offer.discountType === 'free_product',
        variantId: null,
      });
    }

    // The offer names a product; the cart needs a variant. One batched request
    // turns every rewarded product into the variant the line will carry.
    await attachVariants(env, gifts);

    const rules: CartRuleNotice[] = cartRules.map((rule) => {
      const detail = details?.[`r${rule.id}`];
      const message = (detail?.rows ?? []).map((row: any) => row?.message).find(Boolean) ?? null;
      return {id: String(rule.id), title: rule.title || rule.name, message};
    });

    const data: CartOffers = {gifts: dedupeGifts(gifts), rules};
    cache = {at: Date.now(), data};
    return data;
  } catch (error) {
    console.error('cart-offers: could not load promotions —', (error as Error).message);
    return cache?.data ?? null;
  }
}

function isRunning(from: string | null, to: string | null): boolean {
  const now = Date.now();
  if (from && Date.parse(from) > now) return false;
  if (to && Date.parse(to) < now) return false;
  return true;
}

async function gql<T>(
  origin: string,
  pat: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${origin}/api/gql`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Authorization: `Bearer ${pat}`},
      body: JSON.stringify({query, variables}),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`admin api ${res.status}`);
    const json = (await res.json()) as {data?: T; errors?: Array<{message: string}>};
    if (json.errors?.length) throw new Error(json.errors[0].message);
    return json.data ?? null;
  } finally {
    clearTimeout(timer);
  }
}

/** Platform origin, never the public domain — otherwise the worker calls itself. */
function apiOrigin(env: Record<string, string | undefined>): string | null {
  const origin = env.PUBLIC_API_ORIGIN || env.PUBLIC_STORE_DOMAIN;
  if (!origin) return null;
  return origin.startsWith('http') ? origin.replace(/\/$/, '') : `https://${origin}`;
}


/**
 * The first variant of every rewarded product, in one request.
 *
 * The admin names the gift by product id, the cart adds by variant id. Without
 * this the storefront knows what it owes the shopper and cannot hand it over.
 */
async function attachVariants(
  env: Record<string, string | undefined>,
  gifts: GiftOffer[],
): Promise<void> {
  const ids = [...new Set(gifts.map((g) => g.productId).filter(Boolean))] as string[];
  const origin = apiOrigin(env);
  const token = env.PUBLIC_STOREFRONT_API_TOKEN;
  if (!ids.length || !origin || !token) return;

  const fields = ids
    .filter((id) => /^\d+$/.test(id))
    .map((id) => `p${id}: product(id: "${id}") { id handle featuredImage { url } variants(first: 1) { nodes { id } } }`);
  if (!fields.length) return;

  try {
    const res = await fetch(`${origin}/api/sf`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'X-Storefront-Access-Token': token},
      body: JSON.stringify({query: `query GiftVariants { ${fields.join(' ')} }`}),
    });
    if (!res.ok) return;
    const json = (await res.json()) as {data?: Record<string, any>};
    for (const gift of gifts) {
      const node = json.data?.[`p${gift.productId}`];
      if (!node) continue;
      gift.variantId = node.variants?.nodes?.[0]?.id ?? null;
      gift.handle = node.handle ?? null;
      gift.imageUrl = node.featuredImage?.url ?? null;
    }
  } catch (error) {
    console.warn('cart-offers: gift variants unresolved —', (error as Error).message);
  }
}
