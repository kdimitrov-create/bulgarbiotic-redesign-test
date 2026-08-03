/**
 * Live snapshot of CloudCart auto-apply percent discounts on
 * bulgarbiotic.bg. Sourced via Admin API:
 *
 *   cloudcart app execute --store bulgarbiotic.bg --query \
 *     '{ d<ID>: discount(id: "<ID>") { id name typeValue dateEnd
 *        orderOver targets { type itemId } } }'
 *
 * The CloudCart Storefront API doesn't expose order-level auto-applied
 * discounts on individual products (`product.discount.msrpPrice` and
 * `variant.compareAtPrice` always come back null for these). So we
 * mirror the merchant's active rules here and recompute "is this
 * product on sale" + "by how much" client-side from REAL admin data.
 *
 * The actual price the customer pays is still controlled by CloudCart's
 * checkout — these percentages match what their engine applies, so the
 * sticker we show on /selection/sale stays in sync with reality.
 *
 * To refresh: re-run the Admin API query above for any discount IDs
 * whose `dateEnd` has passed, drop the expired ones, and add new ones.
 *
 * Last synced: 2026-05-21
 */

export interface AutoDiscount {
  /** Numeric CloudCart discount ID — useful for cross-referencing in admin. */
  id: string;
  /** Human-readable name from CloudCart (merchant-authored). */
  name: string;
  /** Discount percentage (0–100, e.g. 30 means 30% off). */
  percent: number;
  /** ISO-like date string — null means open-ended. */
  dateEnd: string | null;
  /** Optional min cart total in store currency (EUR) to qualify. */
  orderOver: number | null;
  /** Numeric product IDs this discount targets. */
  productIds: string[];
  /** Store-wide rule (admin target type "all") — applies to every product. */
  appliesToAll?: boolean;
}

/**
 * Active discounts as of last sync. ONLY include rules that are
 * `active: yes`, `type: percent`, `code: null` (auto-apply), and
 * have a future `dateEnd` (or null = open-ended).
 *
 * Discount 473 ("20 bf - prolet mart") was excluded — its dateEnd
 * 2026-04-30 had already passed at sync time (2026-05-21).
 */
/**
 * Deliberately EMPTY. This used to mirror the merchant's rules by hand, but every
 * entry had expired (May–June 2026) while the lookups never checked `dateEnd`, so
 * the site advertised discounts that checkout no longer applied — a customer saw
 * 23.67 € on the PDP and paid 31.56 €.
 *
 * Live rules now come from the Admin API (`live-discounts.server.ts`). When that
 * call fails, falling back to NOTHING is the safe outcome: a missing badge is a
 * cosmetic loss, a wrong price destroys trust. Do not repopulate this by hand.
 */
export const AUTO_DISCOUNTS: AutoDiscount[] = [];

/**
 * Numeric product ID → URL handle map for the 20 SKUs that participate
 * in at least one active auto-discount. Lets surfaces that only know
 * the URL handle (cart lines, links, etc.) resolve back to a discount
 * lookup. Re-pull together with `AUTO_DISCOUNTS` when refreshing.
 */
/**
 * The list every lookup below reads. Defaults to the hand-maintained mirror and
 * is replaced at runtime with LIVE admin data when `CLOUDCART_ADMIN_PAT` is
 * configured (see `live-discounts.server.ts`). Kept as module state rather than
 * threaded through props so the eight existing call sites keep their simple
 * synchronous API.
 */
let currentDiscounts: AutoDiscount[] = AUTO_DISCOUNTS;
/** handle -> product id, replaced together with the rules when live data arrives. */
let currentHandleToId: Record<string, string>;

/**
 * Swap in live discounts. Ignores empty/absent input so a failed fetch keeps the
 * mirror. `handles` matters as much as the rules: cart lines only know a product's
 * url handle, so without a live handle->id map a discount on a product outside the
 * old static list resolves on product cards (they carry the id) but silently not in
 * the cart.
 */
export function setAutoDiscounts(
  next: AutoDiscount[] | null | undefined,
  handles?: Record<string, string> | null,
) {
  if (!next || !next.length) return;
  currentDiscounts = next;
  const map: Record<string, string> = {};
  for (const [id, handle] of Object.entries(handles ?? {})) map[handle] = id;
  currentHandleToId = Object.keys(map).length ? map : HANDLE_TO_PRODUCT_ID;
}

/** What the lookups currently resolve against — live list when available. */
export function activeDiscounts(): AutoDiscount[] {
  return currentDiscounts;
}

export const DISCOUNTED_PRODUCT_HANDLES: Record<string, string> = {
  '10':  'paket-colongic',
  '13':  'paket-otslabvane',
  '14':  'paket-otslabvane-za-maje',
  '37':  'probiotici-za-plosko-koremche-promociya-femin-gastro-balance',
  '38':  'promociya-probiotik-femin-probiotichni-perli-s-naturalen-shokolad',
  '57':  'aktivna-formula-za-zdrava-i-blestyashta-kosa-i-nokti-bactology',
  '58':  'aktivna-formula-za-siyayna-i-elastichna-koja-bez-brachki-bactology',
  '59':  'paket-beauty',
  '61':  'dietary-probiotic-pearls-with-natural-chocolate-coating-without-added-sugar-copy',
  '62':  'probiotic-tablets-in-precisely-balanced-combination-copy',
  '67':  'bactology-probiotik-za-jeni-femin',
  '68':  'bactology-probiotik-za-podut-korem-i-gazove-gastro-balance',
  '75':  'smart-start-paket-za-silen-imunitet',
  '79':  'bactology-pets',
  '80':  'bactology-anti-stress',
  '81':  'bactology-colongic-probiotik-za-debeloto-chervo',
  '82':  'probiotik-za-bebe-deca-i-podrastvashti-babies-and-kids',
  '83':  'gastro-balance-colongic',
  '90':  'probiotik-za-bremenni-paket',
  '103': 'family-pack',
};

// Reverse map handle → product ID (computed once at module load).
const HANDLE_TO_PRODUCT_ID: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const [id, handle] of Object.entries(DISCOUNTED_PRODUCT_HANDLES)) {
    out[handle] = id;
  }
  return out;
})();
currentHandleToId = HANDLE_TO_PRODUCT_ID;

/**
 * Extract the numeric ID from a CloudCart product gid.
 * "gid://cloudcart/Product/37" → "37"
 * If already a plain number string, returns it unchanged.
 */
export function productIdFromGid(idOrGid: string | undefined | null): string | null {
  if (!idOrGid) return null;
  const m = String(idOrGid).match(/Product\/(\d+)/);
  return m?.[1] ?? (String(idOrGid).match(/^\d+$/) ? String(idOrGid) : null);
}

/**
 * Cart lines from the Storefront API expose `merchandise.product.handle`
 * but not the numeric product ID, so this helper resolves a discount
 * lookup straight from the URL handle.
 */
export function bestDiscountForHandle(handle: string | undefined | null): {
  percent: number;
  id: string;
  name: string;
} | null {
  if (!handle) return null;
  const pid = currentHandleToId[handle];
  // Store-wide rules apply even when the handle is not in the id map.
  if (!pid) {
    const all = currentDiscounts.filter((d) => d.appliesToAll);
    if (!all.length) return null;
    const best = all.reduce((a, b) => (b.percent > a.percent ? b : a));
    return {percent: best.percent, id: best.id, name: best.name};
  }
  return bestDiscountFor(pid);
}

/**
 * Resolve the best (highest-percent) currently-active discount that
 * applies to a given product ID. Returns null if no active discount
 * targets this product.
 *
 * When multiple discounts overlap on the same product, the highest
 * percentage wins — this mirrors CloudCart's "best of" behavior in
 * checkout (the engine picks the largest auto-apply for each line).
 *
 * Accepts either the raw "37" numeric ID OR the full
 * "gid://cloudcart/Product/37" gid form.
 */
export function bestDiscountFor(productIdOrGid: string | undefined | null): {
  percent: number;
  id: string;
  name: string;
} | null {
  const pid = productIdFromGid(productIdOrGid);
  if (!pid) return null;
  let best: {percent: number; id: string; name: string} | null = null;
  for (const d of currentDiscounts) {
    // A store-wide rule targets every product, so there is no id list to check.
    if (!d.appliesToAll && !d.productIds.includes(pid)) continue;
    if (!best || d.percent > best.percent) {
      best = {percent: d.percent, id: d.id, name: d.name};
    }
  }
  return best;
}

/**
 * The ONE way the storefront turns a price pair into a "−44%" badge.
 *
 * Two products under the same 44 % rule were showing −44 % and −43 % side by
 * side on the home carousel. The culprit was `product.discount.percent`, which
 * CloudCart rounds differently from us: 18.89 / 42.94 = 43.99 % came back as 43
 * while 13.89 / 31.56 = 44.01 % came back as 44. That field is therefore never
 * used any more — the badge is derived from the very prices printed on the card,
 * so the number can never contradict what the shopper is reading.
 *
 * `rulePercent` is passed ONLY when the sale price was synthesised from an admin
 * rule (no `compareAtPrice` from the API). In that case the rule's own figure is
 * exact, while deriving it back from a price rounded to two decimals prints 32 %
 * for a 33 % rule.
 */
export function displayDiscountPercent(
  rulePercent: number | null | undefined,
  priceAmount: number,
  compareAmount: number,
): number {
  if (rulePercent && rulePercent > 0) return Math.round(rulePercent);
  if (!(compareAmount > priceAmount) || !(compareAmount > 0)) return 0;
  return Math.round((1 - priceAmount / compareAmount) * 100);
}

/**
 * All product IDs (numeric strings) that have at least one active
 * auto-discount targeting them. Useful for sale-page filtering.
 */
export function discountedProductIds(): Set<string> {
  const out = new Set<string>();
  for (const d of currentDiscounts) {
    for (const pid of d.productIds) out.add(pid);
  }
  return out;
}

/**
 * Drop-in replacement for the old `synthDiscount()` helper (which was
 * killed because it pulled percentages from a manually-edited config
 * file that could drift from CloudCart's real auto-discount engine).
 *
 * Same signature, same return shape — but the percentage now comes
 * from `AUTO_DISCOUNTS` (real Admin API mirror). Math:
 *   sale = msrp × (1 − percent/100)
 *
 * The store's variant `price` from the Storefront API is the pre-
 * discount amount (CloudCart doesn't fold order-level auto-applies
 * into Storefront product price), so we treat the live `basePrice` as
 * MSRP and compute the post-discount sale price from it. CloudCart's
 * hosted checkout applies the same discount at order finalization, so
 * the displayed sale price matches what the customer is actually
 * charged.
 *
 * Returns `null` when:
 *  - Real CloudCart Storefront discount is already populated (defer)
 *  - The product isn't targeted by any active auto-discount
 *  - The base price is missing / non-positive
 */
export function realDiscountFor(
  product: {
    id?: string;
    handle?: string;
    discount?: unknown;
    variants?: {nodes?: Array<{compareAtPrice?: unknown}>};
  },
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

  const best = bestDiscountFor(product.id);
  if (!best || best.percent <= 0) return null;

  const msrp = parseFloat(basePrice.amount);
  if (!isFinite(msrp) || msrp <= 0) return null;
  const sale = msrp * (1 - best.percent / 100);
  return {
    salePrice: {amount: sale.toFixed(2), currencyCode: basePrice.currencyCode},
    msrpPrice: {amount: msrp.toFixed(2), currencyCode: basePrice.currencyCode},
    percent: best.percent,
    // Human-readable label for the badge — use a friendly Bulgarian
    // phrasing instead of the raw discount name ("15", "30%-may-kampaniq")
    // which is internal merchant naming, not customer-facing copy.
    label: `−${best.percent}% автоматично`,
  };
}
