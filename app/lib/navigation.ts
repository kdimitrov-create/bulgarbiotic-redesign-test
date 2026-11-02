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
  /** The linked product's own photo — only resolved for product links. */
  image: string | null;
  /** The linked product's short description, as written in the admin. */
  blurb: string | null;
  children: NavNode[];
}

/**
 * Classes the merchant can type in the panel to give an item a special job in
 * the mega-menu. Anything else is an ordinary link or column.
 */
export const NAV_ROLE = {
  /** A product link that becomes the "Препоръчано" card. */
  featured: 'featured',
  /** A group whose children become the row of buttons under the panel. */
  footer: 'footer',
} as const;

/**
 * Групата с бутоните под панела - по клас, а ако го няма, по име.
 *
 * Ролята се дава с клас, изписан в панела. На истинския магазин в навигацията
 * НЯМА нито един клас (проверено 17.08.2026: всички items с `class: null`),
 * затова групата „Долен ред" се рисуваше като още една колона в мегаменюто и
 * буташе „Препоръчано" на нов ред. Името ѝ обаче казва точно каква е, затова се
 * приема и то - магазинът не бива да чака някой да впише клас, за да изглежда
 * менюто както е нарисувано.
 */
const FOOTER_GROUP_TITLES = /^(долен ред|долна лента|footer|bottom(\s*row)?)$/i;

export function isFooterGroup(node: NavNode | null | undefined): boolean {
  if (hasRole(node, NAV_ROLE.footer)) return true;
  return FOOTER_GROUP_TITLES.test((node?.title ?? '').trim());
}

/** Does this item carry the given role class? */
export function hasRole(node: NavNode | null | undefined, role: string): boolean {
  return (node?.className ?? '')
    .split(/\s+/)
    .some((c) => c.trim().toLowerCase() === role);
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
