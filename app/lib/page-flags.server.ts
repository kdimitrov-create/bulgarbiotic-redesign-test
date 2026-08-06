/**
 * Is a CMS page switched on in the admin panel?
 *
 * The Storefront API hands back a page's body whether or not the merchant has
 * deactivated it — `Page` there has no `active` field at all (checked
 * 2026-08-06). That matters for the builder-driven homepage: "switch the page
 * off and the old homepage comes back" has to actually work, and only the Admin
 * API knows the flag.
 *
 * Cached for 30 s like the rest of the admin reads. Without a PAT the answer is
 * `true`, i.e. the page is trusted — the same behaviour as before this existed.
 */

const CACHE_TTL_MS = 30 * 1000;
const REQUEST_TIMEOUT_MS = 6000;

let cache: {at: number; byHandle: Record<string, boolean>} | null = null;

export async function pageIsActive(
  env: Record<string, string | undefined>,
  handle: string,
): Promise<boolean> {
  const pat = env.CLOUDCART_ADMIN_PAT || env.CLOUDCARTADMINPAT;
  const origin = adminOrigin(env);
  if (!pat || !origin) return true;

  if (cache && Date.now() - cache.at < CACHE_TTL_MS && handle in cache.byHandle) {
    return cache.byHandle[handle];
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${origin}/api/gql`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Authorization: `Bearer ${pat}`},
      body: JSON.stringify({query: '{ pages(first: 200) { nodes { urlHandle active } } }'}),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`admin api ${res.status}`);
    const json = (await res.json()) as {data?: any; errors?: Array<{message: string}>};
    if (json.errors?.length) throw new Error(json.errors[0].message);

    const byHandle: Record<string, boolean> = {};
    for (const node of json.data?.pages?.nodes ?? []) {
      if (node?.urlHandle) byHandle[node.urlHandle] = String(node.active) === 'yes';
    }
    cache = {at: Date.now(), byHandle};
    return byHandle[handle] ?? true;
  } catch (error) {
    console.warn('page flags: assuming the page is on —', (error as Error).message);
    return cache?.byHandle[handle] ?? true;
  } finally {
    clearTimeout(timer);
  }
}

function adminOrigin(env: Record<string, string | undefined>): string | null {
  const origin = env.PUBLIC_API_ORIGIN || env.PUBLIC_STORE_DOMAIN;
  if (!origin) return null;
  return origin.startsWith('http') ? origin.replace(/\/$/, '') : `https://${origin}`;
}
