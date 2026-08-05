/**
 * The store's own menu, as the merchant built it in Дизайн → Навигация.
 *
 * Client-safe half: just the shape. The fetching lives in
 * `navigation.server.ts` (it needs the admin token).
 *
 * Why not the Storefront API: `menu(handle:"main-menu")` returns **null** for
 * this store (checked 2026-08-05 for `main-menu`, `main`, `header`, `footer`),
 * which is why the header used to fall back to a list hardcoded in the code —
 * the thing the client noticed as "навигацията няма нищо общо с админ панела".
 */

export interface NavNode {
  id: string;
  title: string;
  /** Resolved storefront path, or null for a container / HTML block. */
  url: string | null;
  /** Merchant asked for target="_blank". */
  blank: boolean;
  /** Raw HTML for an item the merchant authored as a widget/HTML block. */
  html: string | null;
  /** CSS class the merchant typed in the panel, passed through untouched. */
  className: string | null;
  children: NavNode[];
}

export interface NavMenu {
  items: NavNode[];
}

/** The mega-menu trigger: the "Продукти" group, whichever way it is named. */
export function productsNode(menu: NavMenu | null | undefined): NavNode | null {
  const items = menu?.items ?? [];
  return (
    items.find((i) => i.children.length > 0) ??
    items.find((i) => i.title.toLowerCase().includes('продукт')) ??
    null
  );
}
