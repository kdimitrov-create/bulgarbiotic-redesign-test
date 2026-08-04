/**
 * REAL best-sellers — how many units of each product the store has actually
 * sold, read from the CloudCart Admin API.
 *
 * Why the Admin API: the Storefront API only offers `sortKey: BEST_SELLING`,
 * whose definition is the platform's and is not visible to us. `orderedProducts`
 * is the merchant's own order data — it aggregates the line items of real orders
 * and returns `ordered_quantity` per product, which is what "най-продавани"
 * actually means to the client.
 *
 * SERVER ONLY — the `.server.ts` suffix keeps the PAT out of the client bundle.
 * Only the resulting ranking (public information: which products sell best)
 * reaches the browser.
 */
import {markProductId} from './product-marks';

// 30 min. Sales move far slower than a discount percentage, and this ranking is
// awaited in the root loader, so a miss costs the page a round-trip.
const CACHE_TTL_MS = 30 * 60 * 1000;
// Same 8s as live-discounts: a cold worker plus a slow admin reply was timing
// out at 4s and silently falling back.
const REQUEST_TIMEOUT_MS = 8000;
const PAGE_SIZE = 200;
const MAX_PAGES = 10;

/**
 * Statuses that mean money actually came in. Cancelled / failed / pending
 * orders would otherwise inflate the ranking of whatever people abandon most.
 */
const SOLD_STATUSES = ['completed', 'paid'];

export interface BestSellers {
  /** Numeric product id → units sold. */
  units: Record<string, number>;
  /** Product ids, most sold first. */
  order: string[];
  /** Which statuses produced this ranking — 'paid' normally, 'all' on fallback. */
  basis: 'paid' | 'all';
}

let cache: {at: number; data: BestSellers} | null = null;

const QUERY = `query BestSellers($first: Int!, $page: Int!, $status: [String!]) {
  orderedProducts(first: $first, page: $page, order_status: $status) {
    product_id
    ordered_quantity
  }
}`;

interface RawRow {
  product_id: string | null;
  ordered_quantity: number | null;
}

/**
 * Units sold per product, or null when the PAT is missing / the call failed —
 * callers then keep whatever order the Storefront API gave them. Never throws.
 */
export async function fetchBestSellers(
  env: Record<string, string | undefined>,
): Promise<BestSellers | null> {
  // Both spellings, for the same reason as live-discounts: the panel's Custom
  // Variables were once saved as CLOUDCARTADMINPAT.
  const pat = env.CLOUDCART_ADMIN_PAT || env.CLOUDCARTADMINPAT;
  const origin = adminOrigin(env);
  if (!pat || !origin) return null;

  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;

  try {
    let rows = await collect(origin, pat, SOLD_STATUSES);
    let basis: BestSellers['basis'] = 'paid';

    // A store whose statuses are named differently would come back empty, and an
    // empty ranking is indistinguishable from "feature off". Retry unfiltered
    // rather than silently ordering nothing.
    if (rows.length === 0) {
      rows = await collect(origin, pat, null);
      basis = 'all';
    }

    const units: Record<string, number> = {};
    for (const row of rows) {
      const id = row.product_id ? String(row.product_id) : null;
      if (!id) continue;
      units[id] = (units[id] ?? 0) + (Number(row.ordered_quantity) || 0);
    }

    const order = Object.keys(units).sort((a, b) => units[b] - units[a]);
    cache = {at: Date.now(), data: {units, order, basis}};
    return cache.data;
  } catch (error) {
    console.error('best-sellers: keeping the storefront order —', (error as Error).message);
    return cache?.data ?? null;
  }
}

/**
 * Order a listing page by units sold, most sold first. Products the store has
 * never sold (and everything else, when the ranking is unavailable) keep the
 * order the Storefront API gave them, after the ones that did sell.
 */
export function orderByRealSales<T extends {id?: string}>(
  nodes: T[],
  sales: BestSellers | null,
): T[] {
  if (!sales || !nodes?.length) return nodes ?? [];

  const rank = new Map<string, number>();
  sales.order.forEach((id, i) => rank.set(id, i));
  const rankOf = (node: T) => {
    const id = markProductId(node?.id);
    const r = id ? rank.get(id) : undefined;
    return r ?? Number.MAX_SAFE_INTEGER;
  };

  // Decorate with the original index so ties stay in the API's order — a plain
  // sort on equal keys is not guaranteed to be stable across engines.
  return nodes
    .map((node, i) => ({node, i, r: rankOf(node)}))
    .sort((a, b) => (a.r !== b.r ? a.r - b.r : a.i - b.i))
    .map((x) => x.node);
}

/**
 * Every product of a listing, not just the first page.
 *
 * Asking for `first: 100` is not enough: the Storefront API silently caps the
 * page and returned 12 of 25 products (measured 2026-08-04), which left page 2
 * of the sales-ordered listing empty. So walk the cursor until it runs out.
 */
export async function collectAllNodes(
  first: {nodes?: any[]; pageInfo?: {hasNextPage?: boolean; endCursor?: string | null}} | null,
  fetchNext: (after: string) => Promise<{nodes?: any[]; pageInfo?: any} | null>,
  maxPages = 8,
): Promise<any[]> {
  const nodes = [...(first?.nodes ?? [])];
  let info = first?.pageInfo;
  for (let i = 1; i < maxPages; i++) {
    if (!info?.hasNextPage || !info?.endCursor) break;
    const next = await fetchNext(info.endCursor);
    if (!next) break;
    nodes.push(...(next.nodes ?? []));
    info = next.pageInfo;
  }
  return nodes;
}

/** The slice of an already-ordered list that belongs on `?page=N`. */
export function pageSlice<T>(nodes: T[], page: number, size: number) {
  const start = Math.max(0, (page - 1) * size);
  return {
    nodes: nodes.slice(start, start + size),
    hasNextPage: start + size < nodes.length,
    hasPreviousPage: page > 1,
  };
}

/** Walk `orderedProducts` pages until one comes back short. */
async function collect(
  origin: string,
  pat: string,
  status: string[] | null,
): Promise<RawRow[]> {
  const all: RawRow[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const data = await gql<{orderedProducts?: RawRow[]}>(origin, pat, QUERY, {
      first: PAGE_SIZE,
      page,
      status,
    });
    const rows = data?.orderedProducts ?? [];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
  }
  return all;
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

/**
 * Admin API host. Must be the platform service origin, never the public domain
 * once that is routed to this storefront — otherwise the worker calls itself.
 */
function adminOrigin(env: Record<string, string | undefined>): string | null {
  const origin = env.PUBLIC_API_ORIGIN || env.PUBLIC_STORE_DOMAIN;
  if (!origin) return null;
  return origin.startsWith('http') ? origin.replace(/\/$/, '') : `https://${origin}`;
}
