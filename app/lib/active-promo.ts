/**
 * ⚠️ DISABLED — kept as reference / kill-switch only.
 *
 * History: this module synthesised per-product discount percentages on
 * the client because the CloudCart Storefront GraphQL API doesn't
 * propagate the merchant's order-level auto-discounts (Discount #467
 * "30%-may-kampaniq" etc.) — `product.discount` and
 * `variant.compareAtPrice` both come back as `null`.
 *
 * Why disabled (2026-05-21):
 *   The synthesised badge produced a sale price (e.g. 35.79 €) on the
 *   PDP / listing, but the cart line cost came straight from CloudCart
 *   cart.cost.subtotalAmount which is the FULL price (51.13 €). Result:
 *   customers saw 35.79 € on the PDP and 51.13 € the moment they added
 *   the item — a "price changed" mismatch that destroyed trust.
 *
 *   The merchant directive is explicit: never show data that doesn't
 *   come from CloudCart's real engine. So we now show only the real
 *   variant.price on every surface. CloudCart's hosted checkout still
 *   auto-applies the matching discount, so the customer is charged the
 *   correct (discounted) amount — they just see the discount applied
 *   as a line item at the final step rather than baked into the sticker.
 *
 * If we ever want a real "−30% за май" badge on PDP/listing again, the
 * correct path is to either:
 *   (a) request the CloudCart team expose `Product.discount` /
 *       `Variant.compareAtPrice` in Storefront when an order-level
 *       discount targets that product (currently the SDK declares those
 *       fields but the API returns null/undefined for auto-promos), or
 *   (b) call `discountsForOrder` (Admin API) from a server loader to
 *       compute per-line discounted prices, surface them in cart cost,
 *       and propagate to PDP. Both options keep us on REAL data.
 */

export interface PromoConfig {
  /** Master kill-switch for the entire synth-promo layer. */
  active: boolean;
  /**
   * Default discount % applied to any product that doesn't have an explicit
   * override and isn't in `noDiscountHandles`. Match this to the most
   * common live discount so unknown SKUs render correctly.
   */
  defaultPercent: number;
  /** Display label used on badges when synth promo applies. */
  label: string;
  /** Per-handle override — when a handle has its own % off, list it here. */
  perHandlePercent: Record<string, number>;
  /**
   * Handles that do NOT receive any synth discount. Use for:
   *  - Non-product SKUs (shipping, raffle tickets, free gifts)
   *  - Products whose live storefront shows ONLY a single price
   *    (i.e. they're not actually discounted right now)
   */
  noDiscountHandles: Set<string>;
}

export const PROMO: PromoConfig = {
  // Kill-switch. While false, `synthDiscount()` returns null for every
  // product and `discountPctFor()` returns 0 — meaning PDP, listing,
  // sale page, product cards, cart and checkout all show the SAME
  // real CloudCart price. Do NOT flip this back to true unless the
  // real auto-discount is also reflected in cart.cost.subtotalAmount,
  // otherwise the price mismatch returns.
  active: false,
  defaultPercent: 30,
  label: '−30% за май',
  perHandlePercent: {
    // ─── Verified from bulgarbiotic.bg JSON (sale/msrp ratio) ───
    // 30% off — store-wide default, listed for clarity
    'bactology-anti-stress': 30,
    'paket-beauty': 30,
    'paket-otslabvane': 30,
    'paket-otslabvane-za-maje': 30,
    'smart-start-paket-za-silen-imunitet': 30,
    'probiotici-za-plosko-koremche-promociya-femin-gastro-balance': 30,

    // 25% off
    'family-pack': 25,
    'probiotic-tablets-in-precisely-balanced-combination-copy': 25,
    'probiotic-pearls-with-milk-chocolate-coating-suitable-for-kids-copy': 25,
    'aktivna-formula-za-zdrava-i-blestyashta-kosa-i-nokti-bactology': 25,
    'aktivna-formula-za-siyayna-i-elastichna-koja-bez-brachki-bactology': 25,

    // 35% off — deeper sale
    'bactology-pets': 35,
    'probiotik-za-bebe-deca-i-podrastvashti-babies-and-kids': 35,

    // 15% off
    'bactology-probiotik-za-jeni-femin': 15,
    'bactology-probiotik-za-podut-korem-i-gazove-gastro-balance': 15,
    'probiotik-za-bremenni-paket': 15,

    // 10% off
    'bactology-colongic-probiotik-za-debeloto-chervo': 10,
    'dietary-probiotic-pearls-with-natural-chocolate-coating-without-added-sugar-copy': 10,
    'promociya-probiotik-femin-probiotichni-perli-s-naturalen-shokolad': 10,
  },
  noDiscountHandles: new Set([
    // Products that live storefront shows at a single price (not discounted now)
    'paket-colongic',
    'paket-gastro-balance',
    'paket-gastro-femin',
    'paket-plosko-koremche',
    'travel-pack-1',
    'promociya-3-br-probiotichni-tabletki-za-smuchene',
    'promociya-babies-and-kids-probiotichni-perli-s-mlechen-shokolad',
    'dvoyno-udovolstvie',
    'probiotik-za-zdravi-zabi-i-venci-mini',
    // Non-product SKUs
    'dostavka-v-chujbina',
    'podarak-chadar',
    'ranica-batology',
    'plajna-chanta-evtindjos',
    'bilet-za-uchastie-v-tombolata-pochivka-za-dvama-v-parij',
    'tefter-za-pro-obichane-na-jivota',
  ]),
};

/**
 * Resolve the discount % for a given product, or 0 if no synth promo applies.
 */
export function discountPctFor(handle: string | undefined): number {
  if (!PROMO.active || !handle) return 0;
  if (PROMO.noDiscountHandles.has(handle)) return 0;
  return PROMO.perHandlePercent[handle] ?? PROMO.defaultPercent;
}

/**
 * Compute a synthetic discount for a product.
 *
 * Returns `null` when:
 *  - Real CloudCart discount is set on the product (we always defer to
 *    the canonical data)
 *  - The product isn't eligible for any synth promo
 *
 * Otherwise returns `{salePrice, msrpPrice, percent, label}` ready for the
 * sale UI to consume.
 */
export function synthDiscount(
  product: {handle?: string; id?: string; discount?: unknown; variants?: {nodes?: Array<{compareAtPrice?: unknown}>}},
  basePrice: {amount: string; currencyCode?: string} | null | undefined,
): {
  salePrice: {amount: string; currencyCode?: string};
  msrpPrice: {amount: string; currencyCode?: string};
  percent: number;
  label: string;
} | null {
  if (!basePrice) return null;
  // Always defer to real CloudCart-provided discount if present.
  if ((product as any).discount?.msrpPrice) return null;
  const firstVariant = product.variants?.nodes?.[0] as any;
  if (firstVariant?.compareAtPrice?.amount) return null;

  const pct = discountPctFor(product.handle);
  if (pct <= 0) return null;

  // Our storefront returns the MSRP (live) as the "price" — apply
  // the discount % to derive the sale price the customer sees.
  const msrp = parseFloat(basePrice.amount);
  if (!isFinite(msrp) || msrp <= 0) return null;
  const sale = msrp * (1 - pct / 100);
  return {
    salePrice: {amount: sale.toFixed(2), currencyCode: basePrice.currencyCode},
    msrpPrice: {amount: msrp.toFixed(2), currencyCode: basePrice.currencyCode},
    percent: pct,
    label: PROMO.label,
  };
}

// Back-compat with the previous ACTIVE_PROMO export — not used in new code
// but kept exported so older imports don't break during refactor.
export const ACTIVE_PROMO = PROMO;
