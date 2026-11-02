/**
 * The merchant's own CSS, written in the panel.
 *
 * The builder lets them put a class on any row; this is what makes that class
 * useful — they style it in Дизайн → Персонализиран CSS/JS and the storefront
 * picks it up within 30 seconds, no deploy.
 *
 * ⚠️ Only a MARKED region is taken:
 *
 *     /* bb:css:start *\/
 *     .my-row { … }
 *     /* bb:css:end *\/
 *
 * That field also holds the classic theme's stylesheet and third-party scripts
 * (Microsoft Clarity, ~222 KB on this store). Injecting all of it would drag
 * the old theme's rules into the redesign and run other people's JavaScript, so
 * everything outside the markers is ignored on purpose.
 */
import {fetchConfigBundle} from './config-bundle.server';

/* 15 минути, не 30 секунди.
 *
 * Този кеш живее в паметта на ЕДИН изолат, а Cloudflare пуска нов при всеки
 * снопче трафик - тоест на 30 секунди почти всяка заявка тръгваше пак към
 * админа. При единайсет такива извиквания на страница живият магазин изяде
 * ограничението на магазина и повали и админ панела с 429 (17.08.2026).
 * Промяна от панела се вижда до петнайсет минути; при спешност - едно
 * преразгръщане вдига нови изолати с празен кеш. */
/* Минута в паметта на изолата. Общият кеш (`shared-cache.server.ts`) поема
 * товара между изолатите, затова тук не е нужен дълъг срок - и промяна от
 * панела се вижда до около три минути, вместо до петнайсет. */
const CACHE_TTL_MS = 60 * 1000;
const REQUEST_TIMEOUT_MS = 8000;
/** A runaway paste must not become a megabyte in every page. */
const MAX_CSS_CHARS = 60_000;

let cache: {at: number; css: string} | null = null;

export async function fetchCustomCss(
  env: Record<string, string | undefined>,
): Promise<string> {
  const pat = env.CLOUDCART_ADMIN_PAT || env.CLOUDCARTADMINPAT;
  const origin = adminOrigin(env);
  if (!pat || !origin) return '';

  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.css;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    /* CSS-ът идва от общия пакет с настройките. Падне ли той, се пита сам. */
    const bundled = await fetchConfigBundle(env);
    const raw = bundled
      ? bundled.customCssJs ?? ''
      : await (async () => {
          const res = await fetch(`${origin}/api/gql`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', Authorization: `Bearer ${pat}`},
            body: JSON.stringify({query: '{ customCssJs }'}),
            signal: controller.signal,
          });
          if (!res.ok) throw new Error(`admin api ${res.status}`);
          const json = (await res.json()) as {
            data?: {customCssJs?: string};
            errors?: Array<{message: string}>;
          };
          if (json.errors?.length) throw new Error(json.errors[0].message);
          return json.data?.customCssJs ?? '';
        })();

    const css = extractMarked(raw);
    cache = {at: Date.now(), css};
    return css;
  } catch (error) {
    console.warn('custom css: keeping the previous copy —', (error as Error).message);
    return cache?.css ?? '';
  } finally {
    clearTimeout(timer);
  }
}

/** Everything between the start and end markers, with any tags stripped. */
function extractMarked(raw: string): string {
  if (!raw) return '';
  const blocks = raw.match(/\/\*\s*bb:css:start\s*\*\/([\s\S]*?)\/\*\s*bb:css:end\s*\*\//gi);
  if (!blocks?.length) return '';

  const css = blocks
    .map((block) =>
      block
        .replace(/\/\*\s*bb:css:(start|end)\s*\*\//gi, '')
        // A stray <style> or <script> tag inside the region would break out of
        // the element we inject into.
        .replace(/<\/?[a-z][^>]*>/gi, ''),
    )
    .join('\n')
    .trim();

  return css.length > MAX_CSS_CHARS ? css.slice(0, MAX_CSS_CHARS) : css;
}

function adminOrigin(env: Record<string, string | undefined>): string | null {
  const origin = env.PUBLIC_API_ORIGIN || env.PUBLIC_STORE_DOMAIN;
  if (!origin) return null;
  return origin.startsWith('http') ? origin.replace(/\/$/, '') : `https://${origin}`;
}
