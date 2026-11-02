import type {Article, Blog, PaginationConnection} from '@cloudcart/nitro';

/**
 * Кой е блогът на магазина - според админ панела, не според кода.
 *
 * До сега handle-ът `beauty-and-health` беше изписан на шест места. Работеше,
 * защото магазинът има точно една блог категория (проверено през Admin API:
 * `blogCategories` връща една, id 1). Но всяко преименуване в панела или втора
 * категория щеше да остави сайта да сочи към несъществуващ блог, при това тихо.
 *
 * Тук handle-ът идва от `getBlogs()`. Резултатът се кешира за 5 минути, защото
 * блоговете се сменят веднъж на никога, а всеки loader би плащал заявка.
 *
 * Резервният вариант остава закованият handle: ако Storefront API-то е
 * недостъпно, по-добре блогът да работи по стария начин, отколкото да изчезне.
 */

/** Пази се, защото беше единственият блог на магазина към 2026-08-07. */
export const FALLBACK_BLOG_HANDLE = 'beauty-and-health';

const CACHE_TTL_MS = 5 * 60 * 1000;

let cache: {at: number; handle: string} | null = null;

type BlogSource = {getBlogs(first?: number): Promise<Blog[]>};

/**
 * Handle-ът на основния блог. Първият, който API-то върне - CloudCart ги дава
 * подредени, а магазинът има само един.
 */
export async function primaryBlogHandle(storefront: BlogSource): Promise<string> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.handle;
  try {
    const blogs = await storefront.getBlogs(10);
    const handle = blogs?.[0]?.handle;
    if (!handle) return FALLBACK_BLOG_HANDLE;
    cache = {at: Date.now(), handle};
    return handle;
  } catch {
    // Без кеширане на провала: следващата заявка да пробва пак.
    return FALLBACK_BLOG_HANDLE;
  }
}

/* Всички статии на един блог, на страници по сто.
 *
 * Storefront API-то връща най-много 100 статии на заявка (поискани 200, идват
 * 100) и пренебрегва `sortKey: PUBLISHED_AT, reverse: true`: подрежда ги от
 * най-старата към най-новата, бездатните първи. Проверено на 26.10.2026.
 * Затова `getArticles(handle, 100)` отрязва точно НАЙ-НОВИТЕ: когато блогът
 * мина 100 статии (105 към 26.10), статиите от октомври изчезнаха от /blog и
 * от началната, макар да са активни в панела.
 *
 * Курсорът на `getArticlesPaginated` работи: три страници по 50 дават всички
 * 105, без повторения. Подредбата по дата остава на извикващия. */
const ARTICLES_PAGE = 100;
/** Хиляда статии - таван срещу безкраен цикъл, ако API-то върти курсора. */
const ARTICLES_MAX_PAGES = 10;

type ArticleSource = {
  getArticlesPaginated(
    blogHandle: string,
    options: {first?: number; after?: string},
  ): Promise<PaginationConnection<Article>>;
};

/**
 * Всички статии на блога, в реда на API-то. Ако страница след първата откаже,
 * връща изтеглените дотук: непълен блог е по-добре от празен. Отказ на първата
 * страница се хвърля - извикващият си има резервна стойност.
 */
export async function allArticles(storefront: ArticleSource, blogHandle: string): Promise<Article[]> {
  const out: Article[] = [];
  let after: string | undefined;
  for (let page = 0; page < ARTICLES_MAX_PAGES; page++) {
    let conn: PaginationConnection<Article>;
    try {
      conn = await storefront.getArticlesPaginated(blogHandle, {first: ARTICLES_PAGE, after});
    } catch (error) {
      if (page === 0) throw error;
      console.error('[блог] страница %d на статиите се отказа: %s', page + 1, (error as Error).message);
      break;
    }
    out.push(...(conn?.nodes ?? []));
    const next = conn?.pageInfo?.hasNextPage ? conn.pageInfo.endCursor : null;
    if (!next) break;
    after = next;
  }
  return out;
}

/** Всички блогове, за когато магазинът добави втора категория. */
export async function allBlogs(storefront: BlogSource): Promise<Blog[]> {
  try {
    return (await storefront.getBlogs(50)) ?? [];
  } catch {
    return [];
  }
}
