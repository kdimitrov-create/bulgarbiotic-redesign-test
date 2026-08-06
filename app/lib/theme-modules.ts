/**
 * The store's theme modules, as configured in the admin panel.
 *
 * CloudCart exposes ~52 of them (`storefrontWidgets`), each identified by a
 * unique `mapping` key. They are the merchant's own switches for storefront
 * content — the promo bar, the homepage texts and banners, the product
 * showcases, the product-page note. Reading them is what lets the owner change
 * the shop without a deploy.
 *
 * Client-safe half: shape and helpers. The fetching needs the admin token and
 * lives in `theme-modules.server.ts`.
 */

export interface ThemeModule {
  /** Unique key, e.g. `htmlLine`, `text1`, `showcaseProducts1`. */
  mapping: string;
  /** Widget type, e.g. `extra.htmlLine`. */
  map: string;
  name: string;
  settings: Record<string, any>;
}

export type ThemeModules = Record<string, ThemeModule>;

let current: ThemeModules = {};

/** Install the modules fetched by the server. An empty payload changes nothing. */
export function setThemeModules(next: ThemeModules | null | undefined) {
  if (!next || !Object.keys(next).length) return;
  current = next;
}

export function themeModule(mapping: string): ThemeModule | null {
  return current[mapping] ?? null;
}

/** `true` / `"1"` / `"yes"` all count as on. */
export function moduleEnabled(mod: ThemeModule | null): boolean {
  if (!mod) return false;
  const v = mod.settings?.enabled;
  if (v == null) return true;
  const s = String(v).trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

/**
 * Is the module inside its scheduled window?
 *
 * The panel stores `period: {from, to}` as `YYYY-MM-DD HH:MM:SS` in the store's
 * own time. Treating them as UTC would shift the switch-off by a couple of
 * hours, which matters for a campaign that ends at midnight — so the comparison
 * is done on the plain string, which sorts correctly in this format.
 */
export function moduleInPeriod(mod: ThemeModule | null, now = new Date()): boolean {
  const period = mod?.settings?.period;
  if (!period) return true;
  const stamp = toStamp(now);
  const from = typeof period.from === 'string' ? period.from.trim() : '';
  const to = typeof period.to === 'string' ? period.to.trim() : '';
  if (from && stamp < from) return false;
  if (to && stamp > to) return false;
  return true;
}

function toStamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
    `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  );
}

/** A module that is switched on, in its window, and has content to show. */
export function liveModule(mapping: string): ThemeModule | null {
  const mod = themeModule(mapping);
  if (!mod || !moduleEnabled(mod) || !moduleInPeriod(mod)) return null;
  return mod;
}
