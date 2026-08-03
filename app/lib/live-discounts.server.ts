import type {AutoDiscount} from './active-discounts';

/**
 * LIVE auto-discounts, read from the CloudCart Admin API so the merchant can
 * change a promotion in the admin panel and see it on the storefront without a
 * redeploy.
 *
 * Why the Admin API and not the Storefront API: order-level auto-apply discounts
 * are simply not exposed to the storefront — `product.discount.msrpPrice` and
 * `variant.compareAtPrice` both come back null for them (see the header of
 * `active-discounts.ts`). The hand-maintained mirror in that file stays as the
 * fallback for when this is unconfigured or the call fails.
 *
 * SERVER ONLY — the `.server.ts` suffix keeps the PAT out of the client bundle.
 * The token never reaches the browser: the loader ships only the resulting
 * discount list, which is public information anyway.
 */

// 2 min, not 10: the merchant changes a percentage in admin and expects to see it.
// A long cache made one page show the new value and another the old one.
const CACHE_TTL_MS = 2 * 60 * 1000;
// 8s, not 4: a cold worker plus a slow admin response was timing out and
// silently falling back, which is why some pages showed live data and others did not.
const REQUEST_TIMEOUT_MS = 8000;

export interface LiveDiscounts {
  discounts: AutoDiscount[];
  /** product id → url handle, for the surfaces that only know the handle (cart lines). */
  handles: Record<string, string>;
}

let cache: {at: number; data: LiveDiscounts} | null = null;

/**
 * Step 1 — list the active rules. Deliberately does NOT ask for `targets`:
 * verified 2026-07-31 that the LIST query always returns `targets: []`, while
 * `discount(id:)` returns the real rows for the same discount. Asking here would
 * quietly yield zero targeted products and the feature would never light up.
 */
const LIST_QUERY = `query ActiveDiscounts($first: Int!) {
  discounts(first: $first, active: yes) {
    edges { node { id name type typeValue orderOver dateStart dateEnd active } }
  }
}`;

/** Step 3 — url handles for the targeted products, aliased into one request. */
function handlesQuery(ids: string[]): string {
  const fields = ids.map((id) => `p${id}: product(id: "${id}") { id urlHandle }`);
  return `query DiscountedHandles { ${fields.join(' ')} }`;
}

/** Step 2 — one batched request with an alias per discount to pull the targets. */
function targetsQuery(ids: string[]): string {
  const fields = ids.map((id) => `d${id}: discount(id: "${id}") { id targets { type itemId } }`);
  return `query DiscountTargets { ${fields.join(' ')} }`;
}

interface RawDiscount {
  id: string;
  name: string;
  type: string;
  typeValue: number | null;
  orderOver: number | null;
  dateStart: string | null;
  dateEnd: string | null;
  targets: Array<{type: string; itemId: string}> | null;
}

/**
 * Returns the merchant's currently-running percent discounts, or null when the
 * feature is not configured / the call failed — callers then keep the static
 * mirror. Never throws.
 */
export async function fetchAutoDiscounts(
  env: Record<string, string | undefined>,
): Promise<LiveDiscounts | null> {
  // Accept both spellings: the panel's Custom Variables were saved once as
  // CLOUDCARTADMINPAT, and a silently-unread token looks exactly like "the
  // feature is off" — not worth losing an afternoon to again.
  const pat = env.CLOUDCART_ADMIN_PAT || env.CLOUDCARTADMINPAT;
  const origin = adminOrigin(env);
  if (!pat || !origin) return null;

  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;

  try {
    const listed = (await gql<{discounts?: {edges?: Array<{node: RawDiscount}>}}>(
      origin, pat, LIST_QUERY, {first: 100},
    ))?.discounts?.edges?.map((e) => e.node).filter(isLiveOnStorefront) ?? [];

    if (listed.length === 0) {
      cache = {at: Date.now(), data: {discounts: [], handles: {}}};
      return cache.data;
    }

    // Step 2: targets, aliased into a single request (d<id>: discount(id:)).
    const targets = await gql<Record<string, {targets?: Array<{type: string; itemId: string}>} | null>>(
      origin, pat, targetsQuery(listed.map((d) => String(d.id))), {},
    );

    const mapped = listed
      .map((d) => toAutoDiscount(d, targets?.[`d${d.id}`]?.targets ?? []))
      .filter((d): d is AutoDiscount => d !== null);

    // Step 3: the cart only knows a line's handle, so ship a handle→id map too.
    // Without it a live discount on a product outside the old static map is
    // found on product cards (they have the id) but not in the cart.
    const ids = [...new Set(mapped.flatMap((d) => d.productIds))];
    const handleRows = ids.length
      ? await gql<Record<string, {id: string; urlHandle: string} | null>>(
          origin, pat, handlesQuery(ids), {},
        )
      : {};
    const handles: Record<string, string> = {};
    for (const id of ids) {
      const row = handleRows?.[`p${id}`];
      if (row?.urlHandle) handles[id] = row.urlHandle;
    }

    cache = {at: Date.now(), data: {discounts: mapped, handles}};
    return cache.data;
  } catch (error) {
    console.error('live-discounts: falling back to the static mirror —', (error as Error).message);
    // Serve a stale cache rather than nothing; otherwise let the caller fall back.
    return cache?.data ?? null;
  }
}

/** One Admin API call with a timeout; throws on transport or GraphQL errors. */
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

function isLiveOnStorefront(d: RawDiscount): boolean {
  if (d.type !== 'percent' || !d.typeValue) return false;
  const now = Date.now();
  if (d.dateStart && Date.parse(d.dateStart) > now) return false;
  if (d.dateEnd && Date.parse(d.dateEnd) < now) return false;
  return true;
}

function toAutoDiscount(
  d: RawDiscount,
  targets: Array<{type: string; itemId: string}>,
): AutoDiscount | null {
  // Only product-scoped targets resolve without extra round-trips. Category-scoped
  // rules would need the category expanded to its products — if the merchant uses
  // those, this covers fewer products than checkout applies. Verify against real
  // data before relying on it.
  // CloudCart expresses "the whole catalogue" as a single target of type "all".
  // Verified 2026-08-03: a 38% store-wide rule arrives as targets [{type:"all"}]
  // with no product rows, and treating it as "no targets" made it invisible.
  const appliesToAll = targets.some((t) => t.type === 'all');
  const productIds = targets.filter((t) => t.type === 'product').map((t) => String(t.itemId));
  if (!appliesToAll && productIds.length === 0) return null;
  const percent = toPercent(d.typeValue as number);
  if (percent <= 0) return null;
  return {
    id: String(d.id),
    name: d.name,
    percent,
    dateEnd: d.dateEnd,
    orderOver: d.orderOver,
    productIds,
    appliesToAll,
  };
}

/**
 * `typeValue` is not always a plain percentage: the live store returned 10000 for a
 * percent rule, i.e. hundredths. Anything above 100 is therefore read as hundredths;
 * the result is clamped so a bad value can never print "−10000%" on a product card.
 */
function toPercent(typeValue: number): number {
  const raw = typeValue > 100 ? typeValue / 100 : typeValue;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

/**
 * Admin API host. Must be the platform service origin, never the public domain
 * once that is routed to this storefront — otherwise the worker calls itself.
 * Same rule as the Storefront API origin in `server.ts`.
 */
function adminOrigin(env: Record<string, string | undefined>): string | null {
  const origin = env.PUBLIC_API_ORIGIN || env.PUBLIC_STORE_DOMAIN;
  if (!origin) return null;
  return origin.startsWith('http') ? origin.replace(/\/$/, '') : `https://${origin}`;
}
