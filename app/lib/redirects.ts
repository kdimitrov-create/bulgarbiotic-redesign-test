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
export const REDIRECTS: Record<string, string> = {
  // (пусто — попълни от експорта на старите URL-и преди cutover)
};

/** Returns the redirect target for a pathname, or null if none is mapped. */
export function lookupRedirect(pathname: string): string | null {
  const key =
    pathname !== '/' ? pathname.replace(/\/+$/, '').toLowerCase() : pathname;
  return REDIRECTS[key] ?? null;
}
