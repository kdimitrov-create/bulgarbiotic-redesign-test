/**
 * Месечни пакети — the merchant's quantity discounts, shown on the product page
 * the way the official store shows them: "1 месец / 2 месеца / 4 месеца".
 *
 * In the admin panel these are discounts of type "quantity" (Отстъпки →
 * количествени). Each row says: at this quantity, one item costs this much.
 * The merchant has one rule per product, always with a 2× and a 4× step —
 * which is exactly a two- and a four-month supply.
 *
 * ⚠️ The Storefront API does NOT expose quantity discounts, so unlike the
 * labels and banners these have to come from the Admin API with a PAT.
 * See `quantity-packages.server.ts`.
 */

export interface QuantityTier {
  /** How many items must be in the cart for this price to apply. */
  quantity: number;
  /** Price of ONE item at that quantity, in store currency. */
  unitPrice: number;
}

let current: Record<string, QuantityTier[]> = {};

/** Install the tiers fetched by the server. An empty payload changes nothing. */
export function setQuantityPackages(next: Record<string, QuantityTier[]> | null | undefined) {
  if (!next || !Object.keys(next).length) return;
  current = next;
}

/** Tiers for one product, cheapest quantity first. Empty when it has none. */
export function tiersFor(productIdOrGid: string | undefined | null): QuantityTier[] {
  if (!productIdOrGid) return [];
  const id =
    String(productIdOrGid).match(/Product\/(\d+)/)?.[1] ??
    (String(productIdOrGid).match(/^\d+$/) ? String(productIdOrGid) : null);
  return (id && current[id]) || [];
}

export interface MonthlyPackage {
  /** 1, 2 or 4 — both the month count and the quantity added to the cart. */
  months: number;
  /** What one item costs inside this package. */
  unitPrice: number;
  /** What the whole package costs. */
  total: number;
  /** How much cheaper than buying the same number of items one by one. */
  saving: number;
  /** Rounded percentage off, for the "−X%" ribbon. 0 when there is no saving. */
  savingPct: number;
}

/**
 * Build the "1 / 2 / 4 месеца" options for a product.
 *
 * `singlePrice` is what the page already shows for one item — including any
 * running percent promotion. A tier is only ever used when it beats that
 * price, because a store-wide promotion can easily be deeper than the
 * merchant's standing package discount, and advertising the worse of the two
 * would show the shopper a higher price than checkout charges.
 */
export function monthlyPackages(
  productIdOrGid: string | undefined | null,
  singlePrice: number,
): MonthlyPackage[] {
  const tiers = tiersFor(productIdOrGid);
  if (!tiers.length || !(singlePrice > 0)) return [];

  const months = [1, ...tiers.map((t) => t.quantity)].filter(
    (m, i, arr) => m > 0 && arr.indexOf(m) === i,
  );

  return months
    .sort((a, b) => a - b)
    .map((count) => {
      const tier = tiers.find((t) => t.quantity === count);
      const unitPrice = tier ? Math.min(tier.unitPrice, singlePrice) : singlePrice;
      const total = unitPrice * count;
      const reference = singlePrice * count;
      const saving = Math.max(0, reference - total);
      return {
        months: count,
        unitPrice,
        total,
        saving,
        savingPct: saving > 0 ? Math.round((saving / reference) * 100) : 0,
      };
    });
}

/** "1 месец" / "2 месеца" — Bulgarian plural, which is not just an "a". */
export function monthsLabel(count: number): string {
  return count === 1 ? '1 месец' : `${count} месеца`;
}
