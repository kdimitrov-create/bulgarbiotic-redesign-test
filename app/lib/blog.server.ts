import type {Blog} from '@cloudcart/nitro';

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

/** Всички блогове, за когато магазинът добави втора категория. */
export async function allBlogs(storefront: BlogSource): Promise<Blog[]> {
  try {
    return (await storefront.getBlogs(50)) ?? [];
  } catch {
    return [];
  }
}
