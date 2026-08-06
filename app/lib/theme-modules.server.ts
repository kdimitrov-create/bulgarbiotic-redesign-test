import type {ThemeModule, ThemeModules} from './theme-modules';

/**
 * Pulls every theme module the merchant can configure in the admin panel.
 *
 * One request for the lot, keyed by `mapping` — the promo bar, the homepage
 * texts and banners, the product showcases and the product-page note all come
 * from here. Same 30-second cache as the menu and the discounts, so a change in
 * the panel shows up on the next refresh.
 *
 * Needs the admin PAT; without it the storefront simply keeps its designed
 * defaults, which is why every caller treats an empty result as "not
 * configured" rather than as an error.
 */

const CACHE_TTL_MS = 30 * 1000;
const REQUEST_TIMEOUT_MS = 8000;

const QUERY = `query ThemeModules {
  storefrontWidgets { mapping map name settings }
}`;

let cache: {at: number; data: ThemeModules} | null = null;

export async function fetchThemeModules(
  env: Record<string, string | undefined>,
): Promise<ThemeModules | null> {
  const pat = env.CLOUDCART_ADMIN_PAT || env.CLOUDCARTADMINPAT;
  const origin = adminOrigin(env);
  if (!pat || !origin) return null;

  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${origin}/api/gql`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Authorization: `Bearer ${pat}`},
      body: JSON.stringify({query: QUERY}),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`admin api ${res.status}`);
    const json = (await res.json()) as {data?: any; errors?: Array<{message: string}>};
    if (json.errors?.length) throw new Error(json.errors[0].message);

    const rows: ThemeModule[] = json.data?.storefrontWidgets ?? [];
    if (!rows.length) return cache?.data ?? null;

    const out: ThemeModules = {};
    for (const row of rows) {
      if (!row?.mapping) continue;
      out[row.mapping] = {
        mapping: row.mapping,
        map: row.map,
        name: row.name,
        settings: (row.settings as Record<string, any>) ?? {},
      };
    }
    cache = {at: Date.now(), data: out};
    return out;
  } catch (error) {
    console.error('theme modules: keeping the previous set —', (error as Error).message);
    return cache?.data ?? null;
  } finally {
    clearTimeout(timer);
  }
}

/** Must be the platform origin, never the domain this worker serves. */
function adminOrigin(env: Record<string, string | undefined>): string | null {
  const origin = env.PUBLIC_API_ORIGIN || env.PUBLIC_STORE_DOMAIN;
  if (!origin) return null;
  return origin.startsWith('http') ? origin.replace(/\/$/, '') : `https://${origin}`;
}
