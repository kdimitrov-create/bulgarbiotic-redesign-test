import {dedupeGifts, type CartOffers, type GiftOffer, type CartRuleNotice} from './cart-offers';
import {adminGql, adminListAll, adminOrigin, adminPat} from './admin-api.server';
import {envValue} from './env.server';

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

/**
 * Двата списъка се обхождат докрай, всеки поотделно. Магазинът има 37 кръстосани
 * оферти и 12 правила за количката днес; таван от сто е близо, а изчезнала
 * оферта не казва нищо за себе си. Виж `admin-api.server.ts`.
 */
const CROSS_SELL_FIELDS = 'id name status event offerTitle activeFrom activeTo discountType freeProducts';
const CART_RULE_FIELDS = 'id name title status statusKey activeFrom activeTo';

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
  /** Кога се задейства офертата: add_to_cart | cart | checkout | … */
  event: string | null;
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
  const pat = adminPat(env);
  const origin = adminOrigin(env);
  if (!pat || !origin) return null;

  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;

  try {
    const [allCrossSells, allCartRules] = await Promise.all([
      adminListAll<RawCrossSell>(origin, pat, {
        root: 'crossSells',
        nodeFields: CROSS_SELL_FIELDS,
        label: 'cart-offers/crossSells',
      }),
      adminListAll<RawCartRule>(origin, pat, {
        root: 'cartRules',
        nodeFields: CART_RULE_FIELDS,
        label: 'cart-offers/cartRules',
      }),
    ]);

    const running = allCrossSells.filter(
      (c) => c.status === 1 && c.freeProducts && isRunning(c.activeFrom, c.activeTo),
    );
    const crossSells = running.filter((c) => firesOnNitrogen(c.event));

    // Оферта, която платформата няма как да задейства, се пропуска нарочно, но
    // не мълчаливо: иначе изглежда, че кодът е счупен, а разликата е една
    // настройка в панела.
    for (const skipped of running.filter((c) => !firesOnNitrogen(c.event))) {
      console.warn(
        `cart-offers: офертата „${skipped.offerTitle || skipped.name}" (№${skipped.id}) е с изполване „${skipped.event}" и не се обявява. ` +
          `Това е събитие на класическата тема; в Nitrogen смени изполването на „checkout".`,
      );
    }
    const cartRules = allCartRules.filter(
      (r) => r.status === 1 && isRunning(r.activeFrom, r.activeTo),
    );

    if (!crossSells.length && !cartRules.length) {
      cache = {at: Date.now(), data: {gifts: [], rules: []}};
      return cache.data;
    }

    const details = await adminGql<Record<string, any>>(
      origin, pat,
      detailQuery(crossSells.map((c) => String(c.id)), cartRules.map((r) => String(r.id))),
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

/**
 * Ще види ли платформата тази оферта, когато количката стигне до нея.
 *
 * `add_to_cart` и `cart` са събития на КЛАСИЧЕСКАТА тема - неин скрипт ги праща
 * при добавяне и при отваряне на количката. Nitrogen рисува свой DOM и такова
 * събитие никога не стига до платформата, значи подарък по такава оферта не се
 * дава. Проверено на живо 2026-08-12 и на двата магазина: с „checkout" редът
 * идва с `cross_sell_id` и 0,00 €, с „add_to_cart" не идва изобщо.
 *
 * Затова офертата не само не работи - тя не бива и да се ОБЯВЯВА. Лентата
 * „Печелиш хавлия за 0,00 €" върху оферта, която няма да се задейства, е
 * обещание, което касата не изпълнява.
 *
 * Събитията вътре в самата каса минават: там платформата води клиента.
 */
const NITROGEN_EVENTS = new Set([
  'checkout',
  'checkout_select_payment',
  'checkout_select_shipping',
]);

function firesOnNitrogen(event: string | null | undefined): boolean {
  return NITROGEN_EVENTS.has(String(event ?? ''));
}

function isRunning(from: string | null, to: string | null): boolean {
  const now = Date.now();
  if (from && Date.parse(from) > now) return false;
  if (to && Date.parse(to) < now) return false;
  return true;
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
  const origin = adminOrigin(env);
  const token = envValue(env, 'PUBLIC_STOREFRONT_API_TOKEN');
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
