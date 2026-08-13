import type {Product, Article} from '@cloudcart/nitro';
import {enhanceProducts} from '~/lib/product-images';
import {enhanceArticleImage} from '~/lib/article-images';
import type {SectionData} from '~/components/home/SectionRegistry';
import {primaryBlogHandle} from '~/lib/blog.server';

/**
 * The data every homepage section needs.
 *
 * Extracted from the homepage route so the builder PREVIEW can load exactly the
 * same thing. Without it the preview drew the markers with empty hands — the
 * product rail, the monthly bundle, the reviews and the blog cards all came out
 * blank, which read as "sections are missing" rather than "data is missing".
 */

const FEATURED_HANDLES = [
  'bactology-probiotik-za-jeni-femin', // Femin
  'paket-beauty', // Пакет Beauty
  'probiotik-za-bebe-deca-i-podrastvashti-babies-and-kids', // Babies & kids
  'probiotic-tablets-in-precisely-balanced-combination-copy', // Bactology Tablets (за зъби)
  'probiotici-za-plosko-koremche-promociya-femin-gastro-balance', // Плоско Коремче ПРОМОЦИЯ
  'bactology-anti-stress', // Anti Stress
  'smart-start-paket-za-silen-imunitet', // Smart Start (за деца)
  'dietary-probiotic-pearls-with-natural-chocolate-coating-without-added-sugar-copy', // КЕТО перли
  'bactology-colongic-probiotik-za-debeloto-chervo', // Colongic
  'probiotik-za-bremenni-paket', // Пакет за бременни
];

// "Продукт на фокус" / Пакет на месеца — the single product showcased in the
// BundleFeature block on the homepage. Client (2026-07): the monthly focus is
// the "Плоско Коремче" bundle. Change this handle to feature a different one.
const FOCUS_PRODUCT_HANDLE = 'probiotici-za-plosko-koremche-promociya-femin-gastro-balance';

// Real blog articles to feature on home page. All live in the
// "Beauty and Health" blog (id=1) on bulgarbiotic.bg.
// Cover image URLs are decorated via the shared helper in
// app/lib/article-images.ts (Storefront API doesn't surface them).
/* Блогът идва от панела през `primaryBlogHandle`, не се кова тук. */

const BLOG_HIGHLIGHT_HANDLES: string[] = [
  'top-10-saveta-kak-da-podobrish-metabolizma-si',
  'top-5-uprajneniya-za-korem-u-doma-za-stegnato-i-silno-tyalo',
  'roza-damascena-taynata-na-jenskata-krasota-balans-i-dalgoletie',
];

export async function fetchHomeSectionData(ctx: any): Promise<SectionData> {
  // Блогът се резолвва преди останалото: статиите се искат по неговия handle.
  const blogHandle = await primaryBlogHandle(ctx.storefront);
  // Featured products + Family Pack bundle + blog highlights + catalog pool
  // fetched in parallel. The catalog pool (getProducts) supplies the extra
  // cards that turn the homepage rail into a slider — see merge below.
  const [featuredProductsRaw, familyPackRaw, articlesRaw, catalogRaw] = await Promise.all([
    Promise.all(
      FEATURED_HANDLES.map((h) =>
        ctx.storefront.getProduct(h).catch((error: Error) => {
          console.error(`Failed to load product ${h}:`, error.message);
          return null;
        }),
      ),
    ),
    ctx.storefront.getProduct(FOCUS_PRODUCT_HANDLE).catch((error: Error) => {
      console.error(`Failed to load focus product ${FOCUS_PRODUCT_HANDLE}:`, error.message);
      return null;
    }),
    Promise.all(
      BLOG_HIGHLIGHT_HANDLES.map((handle) =>
        ctx.storefront.getArticle(blogHandle, handle).catch((error: Error) => {
          console.error(`Failed to load article ${handle}:`, error.message);
          return null;
        }),
      ),
    ),
    ctx.storefront.getProducts(16).catch(() => [] as Product[]),
  ]);

  const familyPack = familyPackRaw ? enhanceProducts([familyPackRaw])[0] : null;

  const featuredPicks = featuredProductsRaw.filter((p): p is Product => p !== null);

  // Homepage rail = the client-chosen FEATURED_HANDLES (10 products, in order).
  // The catalog pool only tops up if some hand-picks fail to load (cold cache),
  // so the slider is never short; picked handles are never duplicated.
  const pickedHandles = new Set(featuredPicks.map((p) => p.handle));
  const catalogPool = (catalogRaw as Product[]).filter(
    (p): p is Product => !!p && !pickedHandles.has(p.handle),
  );
  // Client (т.3): carousel of up to 12 products.
  const rail = [...featuredPicks, ...catalogPool].slice(0, 12);
  // If the hand-picks all failed (cold cache etc.) fall back to catalog order.
  const railFinal = rail.length > 0 ? rail : (catalogRaw as Product[]).slice(0, 12);

  // Patch missing cover URLs via the centralized article-images map
  // (Storefront API returns image.url === "" today).
  const articles = articlesRaw
    .filter((a): a is Article => a !== null)
    .map((a) => enhanceArticleImage(a as any, {width: 800, height: 600}) as Article);

  const featuredProducts = enhanceProducts(railFinal);

  // Real customer reviews for the homepage social-proof section (client #11).
  // The storefront ProductReview app exposes reviews per-product, so we pull
  // approved 5★ reviews (with a real comment) from the featured products —
  // getProduct returns each product's reviews.nodes — newest first. The Reviews
  // component falls back to a curated set if the API returns none.
  const homeReviews = (featuredProducts as any[])
    .flatMap((p) =>
      (p?.reviews?.nodes ?? []).map((r: any) => ({
        quote: (r?.comment as string) ?? '',
        name: (r?.author?.name as string) ?? 'Клиент',
        initials: (r?.author?.initials as string) ?? '',
        rating: (r?.rating as number) ?? 0,
        product: (p?.title as string) ?? '',
        createdAt: (r?.createdAt as string) ?? '',
      })),
    )
    .filter((r) => r.rating >= 5 && typeof r.quote === 'string' && r.quote.trim().length >= 60)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    // Един клиент, оставил отзив на два продукта, излизаше два пъти един до
    // друг с почти същите думи (клиент, 2026-08-10). Държим по един на човек.
    .filter((r, i, all) => all.findIndex((o) => o.name === r.name) === i)
    .slice(0, 6);
  /* Оттук нататък пътува само това, което началната наистина рисува.
   *
   * ⚠️ Досега страницата носеше в кода си пълните описания на дузина продукта
   * и целите текстове на статиите - хиляди думи, които никой компонент не
   * чете. Проверено: картите ползват `title`, `handle`, `featuredImage`,
   * `priceRange`, `variants`, `availableForSale`, `reviewSummary`; статиите -
   * `title`, `handle`, `image`, `excerpt`. Нито едно от махнатите полета не се
   * ползва на тази страница.
   *
   * Освен теглото, това е и дублирано съдържание: началната повтаряше дума по
   * дума текста на дванадесет продуктови страници и три статии, което ги
   * кара да си конкурират темата.
   *
   * Отзивите се четат ТУК, на сървъра, и излизат готови в `homeReviews` -
   * затова суровият списък също не заминава надолу.
   */
  const slimProduct = (p: any) => {
    if (!p) return p;
    const {description, descriptionHtml, reviews, seo, ...rest} = p;
    return rest;
  };
  const slimArticle = (a: any) => {
    if (!a) return a;
    const {contentHtml, content, body, seo, ...rest} = a;
    return rest;
  };

  return {
    featuredProducts: (featuredProducts as any[]).map(slimProduct),
    familyPack: slimProduct(familyPack),
    homeReviews,
    articles: (articles as any[]).map(slimArticle),
  };
}
