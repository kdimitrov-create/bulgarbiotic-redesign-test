/**
 * Redesign-only category supplements.
 *
 * Some products belong in a category from a merchandising standpoint but aren't
 * part of the CloudCart collection in the backend. Rather than editing the live
 * store's collections (which we deliberately keep untouched), we list the extra
 * product handles here — the category loader fetches them and appends them to
 * the listing, on the unfiltered first page only.
 *
 * Map: CloudCart collection handle → extra product handles (appended after the
 * collection's own products, deduped against them).
 */
export const CATEGORY_EXTRA_PRODUCTS: Record<string, string[]> = {
  // "Пробиотици за жени" — add the Beauty pack (client request 2026-07).
  'probiotik-za-jeni': ['paket-beauty'],
};
