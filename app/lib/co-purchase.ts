/**
 * Co-purchase matrix — REAL "customers who bought X also bought Y" data
 * computed from a sample of paid CloudCart orders on bulgarbiotic.bg.
 *
 * Built via Admin API:
 *   cloudcart app execute --store bulgarbiotic.bg --query \
 *     '{ orders(first: N) { edges { node { products { productId } } } } }'
 *
 * Then aggregated client-side: for every multi-item order, increment a
 * counter for each (a, b) product pair so we know how often two items
 * appeared together. Pairs with `count < 2` are dropped (noise).
 *
 * Last synced: 2026-05-21 · sampled 500 most-recent paid orders
 *   - 134 of 500 (26.8%) had ≥2 items
 *   - 17 products had at least one significant co-purchase relationship
 *   - Top pair: Product 37 ("Femin+Gastro bundle") ↔ Product 62
 *     ("Probiotic Tablets") — 15 co-purchases
 *
 * To refresh: re-run scripts/build-co-purchase.sh (or the inline Python
 * one-liner used to bootstrap this file), copy the output below, and
 * commit. Recommended cadence: monthly.
 */

interface CoPurchase {
  /** Numeric CloudCart product ID that co-occurs with the key product. */
  productId: string;
  /** Number of orders in which both products appeared together. */
  count: number;
}

/**
 * Raw co-purchase pairs, keyed by trigger product ID. The value array
 * is sorted by `count` descending so [0] is the strongest signal.
 *
 * Real data — DO NOT edit by hand to "boost" certain products. If a
 * pair feels wrong, retune by sampling more orders, not by editing.
 */
export const CO_PURCHASE_MATRIX: Record<string, CoPurchase[]> = {
  '13':  [{productId: '62', count: 5}, {productId: '75', count: 4}, {productId: '80', count: 3}],
  '14':  [{productId: '37', count: 3}, {productId: '62', count: 2}],
  '37':  [{productId: '62', count: 15}, {productId: '81', count: 10}, {productId: '80', count: 8}, {productId: '67', count: 5}, {productId: '59', count: 3}],
  '39':  [{productId: '60', count: 3}],
  '57':  [{productId: '37', count: 3}, {productId: '67', count: 2}],
  '58':  [{productId: '67', count: 3}, {productId: '62', count: 2}],
  '59':  [{productId: '37', count: 3}],
  '60':  [{productId: '39', count: 3}, {productId: '82', count: 2}, {productId: '62', count: 2}, {productId: '68', count: 2}],
  '62':  [{productId: '37', count: 15}, {productId: '75', count: 8}, {productId: '67', count: 5}, {productId: '13', count: 5}, {productId: '80', count: 4}],
  '67':  [{productId: '37', count: 5}, {productId: '62', count: 5}, {productId: '68', count: 3}, {productId: '75', count: 3}, {productId: '58', count: 3}],
  '68':  [{productId: '67', count: 3}, {productId: '80', count: 3}, {productId: '81', count: 3}, {productId: '37', count: 3}, {productId: '62', count: 3}],
  '75':  [{productId: '62', count: 8}, {productId: '13', count: 4}, {productId: '67', count: 3}, {productId: '37', count: 3}, {productId: '80', count: 2}],
  '79':  [{productId: '37', count: 2}],
  '80':  [{productId: '37', count: 8}, {productId: '62', count: 4}, {productId: '68', count: 3}, {productId: '13', count: 3}, {productId: '75', count: 2}],
  '81':  [{productId: '37', count: 10}, {productId: '62', count: 3}, {productId: '68', count: 3}, {productId: '67', count: 2}],
  '82':  [{productId: '68', count: 2}, {productId: '60', count: 2}, {productId: '37', count: 2}],
  '83':  [{productId: '37', count: 3}, {productId: '80', count: 2}, {productId: '62', count: 2}],
};

/**
 * Product ID → URL handle for the 17 SKUs in the matrix.
 * Lets handle-only consumers (cart lines) resolve back to a co-purchase
 * lookup, and lets the upsell loader map suggestion IDs to handles for
 * Storefront product fetching.
 */
export const CO_PURCHASE_HANDLES: Record<string, string> = {
  '13':  'paket-otslabvane',
  '14':  'paket-otslabvane-za-maje',
  '37':  'probiotici-za-plosko-koremche-promociya-femin-gastro-balance',
  '39':  'promociya-3-br-probiotichni-tabletki-za-smuchene',
  '57':  'aktivna-formula-za-zdrava-i-blestyashta-kosa-i-nokti-bactology',
  '58':  'aktivna-formula-za-siyayna-i-elastichna-koja-bez-brachki-bactology',
  '59':  'paket-beauty',
  '60':  'probiotic-pearls-with-milk-chocolate-coating-suitable-for-kids-copy',
  '62':  'probiotic-tablets-in-precisely-balanced-combination-copy',
  '67':  'bactology-probiotik-za-jeni-femin',
  '68':  'bactology-probiotik-za-podut-korem-i-gazove-gastro-balance',
  '75':  'smart-start-paket-za-silen-imunitet',
  '79':  'bactology-pets',
  '80':  'bactology-anti-stress',
  '81':  'bactology-colongic-probiotik-za-debeloto-chervo',
  '82':  'probiotik-za-bebe-deca-i-podrastvashti-babies-and-kids',
  '83':  'gastro-balance-colongic',
};

// Reverse handle → id lookup (computed once)
const HANDLE_TO_ID: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const [id, h] of Object.entries(CO_PURCHASE_HANDLES)) out[h] = id;
  return out;
})();

/**
 * Aggregate co-purchase suggestions for an entire cart — sums the
 * co-occurrence counts of every cart line so the suggestion ranking
 * reflects the WHOLE cart context, not just the last item added.
 *
 * Returns a list of `{productId, score, handle}`, sorted by score
 * descending, with products already in the cart excluded.
 */
export function aggregateCoPurchase(
  cartProductIds: string[],
): Array<{productId: string; handle: string; score: number}> {
  const cartSet = new Set(cartProductIds);
  const scores = new Map<string, number>();
  for (const pid of cartProductIds) {
    const pairs = CO_PURCHASE_MATRIX[pid] || [];
    for (const p of pairs) {
      if (cartSet.has(p.productId)) continue; // already in cart
      scores.set(p.productId, (scores.get(p.productId) || 0) + p.count);
    }
  }
  return Array.from(scores.entries())
    .map(([productId, score]) => ({
      productId,
      score,
      handle: CO_PURCHASE_HANDLES[productId] || '',
    }))
    .filter((x) => x.handle !== '')
    .sort((a, b) => b.score - a.score);
}

/**
 * Resolve a handle (e.g. from a cart line) back to its product ID
 * so the caller can pass it to `aggregateCoPurchase`.
 */
export function productIdFromHandle(handle: string | undefined): string | null {
  if (!handle) return null;
  return HANDLE_TO_ID[handle] ?? null;
}
