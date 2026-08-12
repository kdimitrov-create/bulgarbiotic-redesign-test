import {toMarkDiscount, type ProductMark} from './product-marks';

/**
 * Pulls the label + banner marks for the WHOLE catalogue in one go, so every
 * listing can show exactly what the product page shows.
 *
 * Why this is needed at all: `banners`, `isNew` and `isFeatured` are only
 * requested by the Nitrogen client's single-product query. Its list query asks
 * for `labels` alone — which is why the strains mark could never appear on a
 * listing without hardcoding it, and why /selection/sale and the home carousel
 * disagreed with the category grid.
 *
 * The Storefront API itself returns all three fields for a list query, so this
 * asks for them directly instead of going through the client's fixed fragments.
 * Public token only — nothing secret ships to the browser.
 */

// Matches the discount cache: the merchant changes a banner and expects to see
// it, and this is one small request for the whole shop.
const CACHE_TTL_MS = 30 * 1000;
const REQUEST_TIMEOUT_MS = 8000;
const PAGE_SIZE = 100;
/** 5 pages = 500 products. Above that the marks map stops growing — see the warn below. */
const MAX_PAGES = 5;

const QUERY = `query ProductMarks($first: Int!, $after: String) {
  products(first: $first, after: $after) {
    nodes {
      id
      handle
      isNew
      isFeatured
      labels { name color textColor }
      banners { id name imageUrl position }
      priceRange { minVariantPrice { amount currencyCode } }
      compareAtPriceRange { minVariantPrice { amount currencyCode } }
      discount {
        name
        typeValueFormatted
        hideDiscountPrice
        countdownOnListing
        countdownOnDetail
        endDate
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}`;

interface RawMoney {
  amount: string;
  currencyCode: string;
}

interface RawNode {
  id: string;
  handle: string;
  isNew: boolean;
  isFeatured: boolean;
  labels: Array<{name: string; color: string | null; textColor: string | null}> | null;
  banners: Array<{id: string; name: string | null; imageUrl: string; position: string}> | null;
  priceRange: {minVariantPrice: RawMoney | null} | null;
  compareAtPriceRange: {minVariantPrice: RawMoney | null} | null;
  discount: {
    name: string | null;
    typeValueFormatted: string | null;
    hideDiscountPrice: boolean | null;
    countdownOnListing: boolean | null;
    countdownOnDetail: boolean | null;
    endDate: string | null;
  } | null;
}

let cache: {at: number; data: Record<string, ProductMark>} | null = null;

/**
 * Numeric product id → its marks. Returns null when the call fails, in which
 * case callers keep whatever each product carries on its own. Never throws.
 */
export async function fetchProductMarks(
  env: Record<string, string | undefined>,
): Promise<Record<string, ProductMark> | null> {
  const origin = apiOrigin(env);
  const token = env.PUBLIC_STOREFRONT_API_TOKEN;
  if (!origin || !token) return null;

  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;

  try {
    const out: Record<string, ProductMark> = {};
    let after: string | null = null;
    let pages = 0;
    let truncated = false;

    do {
      const page: {
        nodes?: RawNode[];
        pageInfo?: {hasNextPage: boolean; endCursor: string | null};
      } | null = (
        await sf<{products?: {nodes?: RawNode[]; pageInfo?: {hasNextPage: boolean; endCursor: string | null}}}>(
          origin, token, {first: PAGE_SIZE, after},
        )
      )?.products ?? null;

      for (const node of page?.nodes ?? []) {
        const id = node.id.match(/Product\/(\d+)/)?.[1];
        if (!id) continue;
        out[id] = {
          handle: node.handle ?? null,
          isNew: !!node.isNew,
          isFeatured: !!node.isFeatured,
          labels: node.labels ?? [],
          banners: (node.banners ?? []).map((b) => ({
            id: b.id,
            name: b.name,
            imageUrl: b.imageUrl,
            position: (String(b.position || 'bl').toLowerCase() as ProductMark['banners'][number]['position']),
          })),
          // The listing fragment CloudCart ships asks for `priceRange` only, so
          // without these two a category card cannot tell a discounted price
          // from a regular one. That gap is what produced a second 44 % cut.
          price: node.priceRange?.minVariantPrice ?? null,
          compareAtPrice: node.compareAtPriceRange?.minVariantPrice ?? null,
          // Как търговецът е поискал промоцията да изглежда. Списъчната заявка
          // го връща (проверено 2026-08-12), значи картата в категорията може да
          // спазва същите настройки като продуктовата страница.
          discount: toMarkDiscount(node.discount),
        };
      }

      pages += 1;
      after = page?.pageInfo?.hasNextPage ? page.pageInfo.endCursor : null;
      if (after && pages >= MAX_PAGES) {
        truncated = true;
        after = null;
      }
    } while (after);

    if (truncated) {
      console.warn(
        `product-marks: stopped after ${MAX_PAGES * PAGE_SIZE} products — the rest will fall back to whatever each product carries. Raise MAX_PAGES.`,
      );
    }

    cache = {at: Date.now(), data: out};
    return out;
  } catch (error) {
    console.error('product-marks: could not load labels/banners —', (error as Error).message);
    // A stale map is better than none; badges would otherwise vanish mid-session.
    return cache?.data ?? null;
  }
}

async function sf<T>(
  origin: string,
  token: string,
  variables: Record<string, unknown>,
): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${origin}/api/sf`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'X-Storefront-Access-Token': token},
      body: JSON.stringify({query: QUERY, variables}),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`storefront api ${res.status}`);
    const json = (await res.json()) as {data?: T; errors?: Array<{message: string}>};
    if (json.errors?.length) throw new Error(json.errors[0].message);
    return json.data ?? null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Must be the platform service origin, never the public domain once that is
 * routed to this storefront — otherwise the worker calls itself and every
 * page 500s. Same rule as `server.ts` and `live-discounts.server.ts`.
 */
function apiOrigin(env: Record<string, string | undefined>): string | null {
  const origin = env.PUBLIC_API_ORIGIN || env.PUBLIC_STORE_DOMAIN;
  if (!origin) return null;
  return origin.startsWith('http') ? origin.replace(/\/$/, '') : `https://${origin}`;
}
