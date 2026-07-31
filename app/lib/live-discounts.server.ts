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

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 min — promos change rarely; keep edge calls cheap
const REQUEST_TIMEOUT_MS = 4000;

let cache: {at: number; data: AutoDiscount[]} | null = null;

const QUERY = `query ActiveDiscounts($first: Int!) {
  discounts(first: $first, active: yes) {
    edges { node { id name type typeValue orderOver dateStart dateEnd active targets { type itemId } } }
  }
}`;

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
): Promise<AutoDiscount[] | null> {
  const pat = env.CLOUDCART_ADMIN_PAT;
  const origin = adminOrigin(env);
  if (!pat || !origin) return null;

  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const res = await fetch(`${origin}/api/gql`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Authorization: `Bearer ${pat}`},
      body: JSON.stringify({query: QUERY, variables: {first: 100}}),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`admin api ${res.status}`);

    const json = (await res.json()) as {
      data?: {discounts?: {edges?: Array<{node: RawDiscount}>}};
      errors?: Array<{message: string}>;
    };
    if (json.errors?.length) throw new Error(json.errors[0].message);

    const mapped = (json.data?.discounts?.edges ?? [])
      .map((e) => e.node)
      .filter(isLiveOnStorefront)
      .map(toAutoDiscount)
      .filter((d): d is AutoDiscount => d !== null);

    cache = {at: Date.now(), data: mapped};
    return mapped;
  } catch (error) {
    console.error('live-discounts: falling back to the static mirror —', (error as Error).message);
    // Serve a stale cache rather than nothing; otherwise let the caller fall back.
    return cache?.data ?? null;
  }
}

/**
 * Only percent rules matter here — flat/shipping/volume discounts are applied by
 * checkout but are not what the "−N%" sticker on a card represents. `active: yes`
 * is already filtered server-side; the date window is not, so check it here.
 * This is the bug the static mirror has: it lists rules that ended in June and
 * shows their badges anyway.
 */
function isLiveOnStorefront(d: RawDiscount): boolean {
  if (d.type !== 'percent' || !d.typeValue) return false;
  const now = Date.now();
  if (d.dateStart && Date.parse(d.dateStart) > now) return false;
  if (d.dateEnd && Date.parse(d.dateEnd) < now) return false;
  return true;
}

function toAutoDiscount(d: RawDiscount): AutoDiscount | null {
  // Only product-scoped targets can be resolved without extra round-trips.
  // Category-scoped rules would need the category's product list expanded —
  // if the merchant uses those, this returns fewer products than checkout
  // applies, so verify against real data before relying on it.
  const productIds = (d.targets ?? [])
    .filter((t) => t.type === 'product')
    .map((t) => String(t.itemId));
  if (productIds.length === 0) return null;
  return {
    id: String(d.id),
    name: d.name,
    percent: Math.round(d.typeValue as number),
    dateEnd: d.dateEnd,
    orderOver: d.orderOver,
    productIds,
  };
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
