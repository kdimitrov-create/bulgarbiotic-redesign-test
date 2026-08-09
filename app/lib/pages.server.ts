import type {Page} from '@cloudcart/nitro';
import {envValue} from './env.server';

/**
 * Кои CMS страници влизат в sitemap-а.
 *
 * Досега това беше закован списък от 8 handle-а, защото Storefront API-то няма
 * `getPages()`. Реалните страници обаче са 35 активни - тоест **27 страници,
 * които се отварят нормално, не бяха подавани на Google изобщо**.
 * (Сравнено 2026-08-07: старият sitemap изброява 33, новият изброяваше 8.)
 *
 * Списъкът идва от Admin API-то, но не му се вярва сляпо: всеки handle се
 * проверява през Storefront API-то и влиза само ако наистина се рендерира.
 * Причината е конкретна - `nachalna-stranica` (`systemPage: home`) и
 * `nachalna-nova` са активни в админа, а дават 404 на сайта. Sitemap, който
 * сочи 404, е по-лош от непълен sitemap.
 *
 * SERVER ONLY: `.server.ts` пази PAT-а извън клиентския бъндъл.
 */

const CACHE_TTL_MS = 60 * 60 * 1000; // страниците се менят рядко
const REQUEST_TIMEOUT_MS = 8000;
const VERIFY_CHUNK = 8;

/** Резервният списък: закованите handle-и отпреди. По-добре 8, отколкото нула. */
export const FALLBACK_PAGE_HANDLES = [
  'naukata-zad-bulgar-biotic',
  'chesto-zadavani-vaprosi',
  'probiotik-za-bremenni',
  'kosa-koja-i-nokti',
  'probiotik-ot-bactology',
  'mediite-za-nas',
  'pateshestvie',
  'events',
];

const LIST_QUERY = `query SitemapPages {
  pages(first: 100) { edges { node { urlHandle active systemPage } } }
}`;

type Row = {urlHandle: string | null; active: unknown; systemPage: string | null};

let cache: {at: number; handles: string[]} | null = null;

function adminOrigin(env: Record<string, string | undefined>): string | null {
  const raw = envValue(env, 'PUBLIC_API_ORIGIN') || envValue(env, 'PUBLIC_STORE_DOMAIN');
  if (!raw) return null;
  return raw.startsWith('http') ? raw.replace(/\/$/, '') : `https://${raw}`;
}

function isActive(v: unknown): boolean {
  const s = String(v).toLowerCase();
  return s === 'yes' || s === 'true' || s === '1';
}

/**
 * Handle-ите на страниците за sitemap-а. Никога не хвърля - при всякакъв
 * проблем връща резервния списък, тоест sitemap-ът остава валиден.
 */
export async function sitemapPageHandles(
  env: Record<string, string | undefined>,
  storefront: {getPage(handle: string): Promise<Page | null>},
): Promise<string[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.handles;

  const pat = envValue(env, 'CLOUDCART_ADMIN_PAT') || envValue(env, 'CLOUDCARTADMINPAT');
  const origin = adminOrigin(env);
  if (!pat || !origin) return FALLBACK_PAGE_HANDLES;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${origin}/api/gql`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Authorization: `Bearer ${pat}`},
      body: JSON.stringify({query: LIST_QUERY}),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`admin api ${res.status}`);
    const json = (await res.json()) as {data?: any; errors?: Array<{message: string}>};
    if (json.errors?.length) throw new Error(json.errors[0].message);

    const rows: Row[] = (json.data?.pages?.edges ?? []).map((e: any) => e.node);
    const candidates = rows
      .filter((r) => r.urlHandle && isActive(r.active) && !r.systemPage)
      .map((r) => r.urlHandle as string);

    if (!candidates.length) return FALLBACK_PAGE_HANDLES;

    // Проверка, че страницата наистина се отваря. На парчета, за да не се
    // изстрелят 35 заявки едновременно от worker-а.
    const good: string[] = [];
    for (let i = 0; i < candidates.length; i += VERIFY_CHUNK) {
      const chunk = candidates.slice(i, i + VERIFY_CHUNK);
      const checked = await Promise.all(
        chunk.map((h) =>
          storefront
            .getPage(h)
            .then((p) => (p ? h : null))
            .catch(() => null),
        ),
      );
      good.push(...(checked.filter(Boolean) as string[]));
    }

    // Списъкът отдолу не е само резервен - това са страниците, чието
    // съдържание пише самият дизайн. За тях `getPage` връща null (няма ги в
    // CMS-а), но адресът се отваря нормално. Без обединението проверката ги
    // изхвърляше: `chesto-zadavani-vaprosi` и `probiotik-ot-bactology` изпадаха,
    // а вторият е и целта на редиректа от `/vendors`.
    const handles = Array.from(new Set([...good, ...FALLBACK_PAGE_HANDLES]));
    cache = {at: Date.now(), handles};
    return handles;
  } catch (error) {
    console.error('sitemap pages: keeping the fallback list —', (error as Error).message);
    return FALLBACK_PAGE_HANDLES;
  } finally {
    clearTimeout(timer);
  }
}
