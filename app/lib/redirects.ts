import {data, redirect} from 'react-router';

/**
 * 301 redirect map for the redesign cutover (ACTION-PLAN blocker #6).
 *
 * Maps OLD paths from the classic CloudCart theme → NEW Nitrogen paths, so the
 * store's existing indexed URLs don't 404 when the domain switches to Nitrogen.
 *
 * Populate this from the exported old-URL list BEFORE cutover. Keys are the
 * pathname only — no origin, no query string, lowercased, no trailing slash.
 *
 *   export const REDIRECTS = {
 *     '/probiotici-za-jeni': '/category/probiotici-za-jeni',
 *     '/staryat-produkt-url': '/product/noviyat-handle',
 *   };
 *
 * An empty map is a no-op: unmapped paths fall through to the 404 route ($.tsx).
 */
/**
 * Попълнено 2026-08-07 от два източника, слети и проверени един по един срещу
 * живия Nitrogen деплой:
 *   • Google Search Console, „All known pages" — 223 адреса
 *   • шестте sitemap-а на bulgarbiotic.bg — 161 адреса
 * = 173 уникални пътя. 163 върнаха 200 и не се нуждаят от нищо.
 *
 * Тук са само десетте, които дадоха 404.
 */
/**
 * Ревизия 2026-08-12: вместо да пренасочваме, изравнихме адресите.
 *
 * Три от правилата тук отпаднаха, защото съответните адреси вече са истински
 * страници в дизайна, точно както са на класическата тема:
 *   • `/blog/category/{handle}` → маршрут `blog.category.$blogHandle._index`
 *   • `/blog`                   → рендира се на място вместо да 302-ва
 *   • `/contacts`               → маршрут `contacts.tsx`
 * Останалото долу са адреси, които и старият сайт не отдава като съдържание -
 * при тях 301 е правилният ход, не липса на работа.
 */
export const REDIRECTS: Record<string, string> = {
  // --- еднозначни, проверени ---

  // Класическата тема сама 301-ва /vendors натам. Пазим същото поведение.
  '/vendors': '/page/probiotik-ot-bactology',

  // --- страници по свойство: старата тема има /tags/*, новата няма такъв тип ---
  // Съответствията са избрани от клиента (2026-08-09), не са отгатнати.
  //
  // Тези пет остават 301 нарочно, а не по недоглеждане: `robots.txt` на живия
  // сайт забранява `/tags` и `/tags/*`, тоест Google никога не ги е обхождал -
  // има ги в индекса само като адреси, без събрано съдържание. Да им направим
  // истински страници значеше да произведем дубликат на категория под втори
  // адрес, което е по-лошо от едно пренасочване.
  '/tags/za-deca': '/category/probiotik-za-deca',
  '/tags/dietichni': '/category/probiotik-za-otslabvane',
  '/tags/protiv-gadene': '/category/all-products',
  '/tags/protiv-gazove-i-podut-stomah': '/category/all-products',
  '/tags/silen-imunitet': '/product/paket-otslabvane',

  // '/contacts' вече не е тук: на 2026-08-12 стана истински маршрут
  // (`app/routes/contacts.tsx`) със същите данни като старата страница.

  // Две стари статии. Първо ги взех за липсващо съдържание, но проверката
  // показа друго: няма ги и в СТАРИЯ sitemap - тоест магазинът отдавна ги е
  // извадил, а класическата тема просто още ги отдава на познат адрес.
  // Пенсионирано съдържание, значи редирект към блога е правилният ход.
  '/article/oshte-edna-vkusna-recepta-s-shoko-perli': '/blog',
  '/article/probiotikat-bactojoy-immune-complex-predpazva-ot-covid-19': '/blog',
};

/**
 * Адреси, при които филтърът в query string-а сменя целта.
 *
 * `/tags/dietichni` води на две различни места според ценовия обхват, а
 * `/tags/za-deca?price_range=…` носи и таван на цената. Затова тези правила се
 * проверяват ПРЕДИ картата по път - иначе всички варианти на един таг щяха да
 * се слеят в едно място и филтърът, довел човека дотук, щеше да се изгуби.
 *
 * Ключът е `път?query`, точно както е индексиран в Google.
 */
export const REDIRECTS_WITH_QUERY: Record<string, string> = {
  '/tags/dietichni?price_range=from_35-to_100': '/category/probiotik-za-otslabvane',
  '/tags/dietichni?price_range=from_15-to_55': '/category/perli?maxPrice=55',
  '/tags/za-deca?price_range=from_20.00-to_45.00': '/category/probiotik-za-deca?maxPrice=45',
};

/**
 * 404, но чак след проверка в картата.
 *
 * `$.tsx` хваща само адреси, които НЕ съвпадат с никой маршрут. `/article/x`
 * обаче съвпада с `article/:handle` и умира в неговия loader - тоест правилата
 * за `/article/*` горе никога не се изпълняваха и двата пенсионирани адреса
 * връщаха 404 вместо 301 (открито при проверката на 2026-08-12).
 *
 * Затова маршрутите с `:handle` не хвърлят 404 сами, а минават оттук. Така
 * всяко бъдещо правило от вида „стар handle → нов handle" ще проработи, без да
 * се сеща някой за този капан.
 */
export function notFoundOrRedirect(request: Request, message: string): never {
  const url = new URL(request.url);
  const target = lookupRedirect(url.pathname, url.search);
  if (target) throw redirect(target, 301);
  throw data(message, {status: 404});
}

function normalisePath(pathname: string): string {
  return pathname !== '/' ? pathname.replace(/\/+$/, '').toLowerCase() : pathname;
}

/**
 * Целта за даден адрес, или null ако няма правило.
 *
 * `search` е по избор, за да не се чупят стари извиквания: без него важи само
 * картата по път.
 */
export function lookupRedirect(pathname: string, search = ''): string | null {
  const path = normalisePath(pathname);
  if (search) {
    const query = search.startsWith('?') ? search : `?${search}`;
    const withQuery = REDIRECTS_WITH_QUERY[`${path}${query}`];
    if (withQuery) return withQuery;
  }
  return REDIRECTS[path] ?? null;
}
