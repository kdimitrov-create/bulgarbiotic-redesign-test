import {number} from './builder-settings';
import {enhanceProducts} from '~/lib/product-images';
import {enhanceArticleImages, setArticleImages} from '~/lib/article-images';
import {fetchArticleImages} from '~/lib/blog-images.server';
import {primaryBlogHandle} from '~/lib/blog.server';

/**
 * Loading what the page-builder's data blocks ask for.
 *
 * A product showcase or an article list cannot fetch on its own — the route has
 * to know, before rendering, which products and how many articles the merchant
 * asked for. This walks the design once, collects every request, and fetches
 * them in as few round-trips as the API allows.
 *
 * Everything degrades quietly: a block whose data fails to load renders nothing
 * rather than an error, because a page must survive one bad product id.
 */

// Imported as a value, not only re-exported: `export {X} from '…'` forwards X
// to consumers without binding it in this module, and this file uses it.
import {EMPTY_BUILDER_DATA} from './builder-data';
import type {BuilderData} from './builder-data';
export {EMPTY_BUILDER_DATA};
export type {BuilderData};

interface Needs {
  productIds: Set<string>;
  poolSize: number;
  articleCount: number;
}

/** Which blocks in this design need catalogue data, and how much. */
export function collectBuilderNeeds(design: any): Needs {
  const needs: Needs = {productIds: new Set(), poolSize: 0, articleCount: 0};
  if (!design) return needs;

  const walk = (node: any) => {
    if (!node || typeof node !== 'object') return;
    const settings = node.settings ?? {};

    switch (node.map) {
      case 'product-showcase':
      case 'bundle-products':
      case 'product': {
        const ids = Array.isArray(settings.filter_value) ? settings.filter_value : [];
        for (const id of ids) {
          const clean = String(id).trim();
          if (clean) needs.productIds.add(clean);
        }
        // No explicit picks means "take them from the catalogue".
        if (!ids.length) {
          needs.poolSize = Math.max(needs.poolSize, number(settings.products) ?? 4);
        }
        break;
      }
      case 'recent-articles':
        needs.articleCount = Math.max(needs.articleCount, number(settings.count) ?? 3);
        break;
      default:
        break;
    }

    for (const child of node.children ?? []) walk(child);
  };

  walk(design);
  // One request cannot reasonably serve more than this, and a runaway setting
  // must not turn one page view into fifty queries.
  needs.poolSize = Math.min(needs.poolSize, 24);
  needs.articleCount = Math.min(needs.articleCount, 12);
  return needs;
}

export async function fetchBuilderData(
  storefront: any,
  env: Record<string, string | undefined>,
  needs: Needs,
): Promise<BuilderData> {
  const wantsProducts = needs.productIds.size > 0 || needs.poolSize > 0;
  if (!wantsProducts && !needs.articleCount) return EMPTY_BUILDER_DATA;

  const [picked, pool, articles, articleImages] = await Promise.all([
    needs.productIds.size ? fetchByIds(env, [...needs.productIds]) : Promise.resolve([]),
    needs.poolSize ? storefront.getProducts(needs.poolSize).catch(() => []) : Promise.resolve([]),
    // The API returns the blog in its own order, not by date — the whole blog
    // comes back and the newest are taken here, the same way the blog listing
    // does it. Asking it for three would have given three arbitrary articles.
    needs.articleCount
      ? primaryBlogHandle(storefront)
          .then((h) => storefront.getArticles(h, ARTICLE_POOL))
          .catch(() => [])
      : Promise.resolve([]),
    // Covers live in the admin: the Storefront API hands back an empty
    // `image.url` for every article, so a block built in the panel would show
    // three blank frames without this.
    needs.articleCount ? fetchArticleImages(env) : Promise.resolve(null),
  ]);

  const productsById: Record<string, any> = {};
  // Same image treatment the homepage gives its own products, so a showcase
  // assembled in the panel cannot end up with different photos.
  for (const product of enhanceProducts(picked.filter(Boolean) as any)) {
    const id = String((product as any)?.id ?? '').match(/Product\/(\d+)/)?.[1];
    if (id) productsById[id] = product;
  }

  setArticleImages(articleImages);
  // Подредбата идва от админа, не от датата на публикуване.
  //
  // Шестте най-скоро добавени статии на този магазин нямат попълнена дата на
  // публикуване, затова подредбата по дата ги слагаше най-отдолу и началната
  // показваше статии отпреди месеци - други от тези, които клиентът вижда в
  // панела (2026-08-13). По-голямото id значи по-скоро добавена статия, точно
  // както ги подрежда и самият панел; датата остава резерва.
  const adminId = (article: any): number | null => {
    const id = articleImages?.[article?.handle]?.id;
    return typeof id === 'number' && Number.isFinite(id) ? id : null;
  };
  const published = (article: any): number =>
    article?.publishedAt ? Date.parse(article.publishedAt) : 0;
  const newestFirst = [...normaliseList(articles)].sort((a, b) => {
    // Двете мерки не се смесват: id-то и датата са различни скали и една
    // статия без id щеше да изпревари всички само защото датата е голямо число.
    const ia = adminId(a);
    const ib = adminId(b);
    if (ia !== null && ib !== null) return ib - ia;
    if (ia !== null) return -1;
    if (ib !== null) return 1;
    return published(b) - published(a);
  });

  return {
    productsById,
    productPool: enhanceProducts(normaliseList(pool) as any),
    articles: enhanceArticleImages(newestFirst.slice(0, needs.articleCount), {
      width: 800,
      height: 600,
    }),
  };
}

/** One request covers the blog; the merchant's `count` picks from the newest. */
const ARTICLE_POOL = 100;

// Every money field carries its currency: `Money` throws without one, and a
// single missing `currencyCode` on a struck-through price took the whole page
// down with a 500 (2026-08-07).
const PRODUCT_FIELDS = `
  id handle title availableForSale
  featuredImage { url altText width height }
  priceRange { minVariantPrice { amount currencyCode } }
  compareAtPriceRange { minVariantPrice { amount currencyCode } }
  variants(first: 1) {
    nodes {
      id availableForSale
      price { amount currencyCode }
      compareAtPrice { amount currencyCode }
    }
  }
  discount { msrpPrice { amount currencyCode } }
  labels { name color textColor }
  reviewSummary { averageRating totalCount }
`;

/**
 * Every picked product in ONE request, using aliases.
 *
 * The nitro client only fetches by handle, and the panel stores numeric ids —
 * so this goes straight to the Storefront API with the public token. Aliases
 * keep it to a single round-trip no matter how many products a showcase names.
 */
async function fetchByIds(
  env: Record<string, string | undefined>,
  ids: string[],
): Promise<any[]> {
  const origin = apiOrigin(env);
  const token = env.PUBLIC_STOREFRONT_API_TOKEN;
  if (!origin || !token || !ids.length) return [];

  const fields = ids
    .filter((id) => /^\d+$/.test(id))
    .map((id) => `p${id}: product(id: "${id}") { ${PRODUCT_FIELDS} }`);
  if (!fields.length) return [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${origin}/api/sf`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'X-Storefront-Access-Token': token},
      body: JSON.stringify({query: `query BuilderProducts { ${fields.join(' ')} }`}),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`storefront api ${res.status}`);
    const json = (await res.json()) as {data?: Record<string, any>; errors?: Array<{message: string}>};
    if (json.errors?.length) throw new Error(json.errors[0].message);
    return Object.values(json.data ?? {});
  } catch (error) {
    console.warn('builder data: showcase products skipped —', (error as Error).message);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/** Never the domain this worker serves — same rule as everywhere else. */
function apiOrigin(env: Record<string, string | undefined>): string | null {
  const origin = env.PUBLIC_API_ORIGIN || env.PUBLIC_STORE_DOMAIN;
  if (!origin) return null;
  return origin.startsWith('http') ? origin.replace(/\/$/, '') : `https://${origin}`;
}

/** The client returns either an array or a `{nodes}` connection. */
function normaliseList(value: any): any[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (Array.isArray(value.nodes)) return value.nodes;
  return [];
}
