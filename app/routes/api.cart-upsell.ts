import {data} from 'react-router';
import type {Route} from './+types/api.cart-upsell';
import {getContext} from '~/lib/context';
import {enhanceProducts} from '~/lib/product-images';
import {BUMP_CART_CONFIG} from '~/lib/bump-cart-config';
import {
  aggregateCoPurchase,
  productIdFromHandle,
} from '~/lib/co-purchase';
import {bestDiscountFor} from '~/lib/active-discounts';

const EUR_TO_BGN = 1.95583;

/**
 * Cart upsell suggestions — "Не забравяй да добавиш".
 *
 * Algorithm (in priority order):
 *
 *  1. **Co-purchase (real data)** — for every product currently in the
 *     cart, look up which OTHER products real customers bought in the
 *     same order. Aggregate counts across all cart lines so the ranking
 *     reflects the whole cart context. Source: 500-order sample from
 *     CloudCart Admin (`app/lib/co-purchase.ts`).
 *
 *  2. **Discount boost** — products that have an active CloudCart auto-
 *     discount get a small score bump because customers respond well to
 *     visible savings.
 *
 *  3. **Threshold-fit boost** — products whose price would push the cart
 *     over the BumpCart free-shipping bar (≥`remainingEur`) get a small
 *     bump too.
 *
 *  4. **Popularity fallback** — when the cart is empty or there are no
 *     co-purchase signals, fall back to the top-N popular SKUs so the
 *     drawer still shows something useful.
 *
 * Excludes products already in the cart (no duplicates).
 *
 * Query params:
 *   inCart=<handle>[,<handle>...]   — comma-separated cart handles (so
 *     server can resolve co-purchases). Optional — if missing, behaves
 *     like the old "show popular" mode.
 *   remainingEur=<number>           — gap to free-shipping threshold,
 *     used for the threshold-fit boost. Optional, default 0.
 */
export async function loader({context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const url = new URL(request.url);

  const inCartHandles = (url.searchParams.get('inCart') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const remainingEur = Math.max(0, parseFloat(url.searchParams.get('remainingEur') || '0') || 0);

  // Resolve cart handles → product IDs (only matrix-known products
  // contribute co-purchase signal; the rest are still excluded as
  // "already in cart").
  const cartIds: string[] = [];
  const cartHandleSet = new Set(inCartHandles);
  for (const h of inCartHandles) {
    const pid = productIdFromHandle(h);
    if (pid) cartIds.push(pid);
  }

  // STEP 1 — co-purchase ranking from real order data.
  const coSuggestions = aggregateCoPurchase(cartIds);

  // STEP 2 — fetch enough products to back the ranking with rich
  // metadata (image, price, variant). We pull from the popular pool
  // (`getProducts(N)`) which returns variants in a single round-trip.
  const pool: any[] = await ctx.storefront
    .getProducts(Math.max(BUMP_CART_CONFIG.showed * 2, 24))
    .catch(() => [] as any[]);

  // Build a quick "handle → product" lookup so we can attach metadata
  // to the co-purchase rankings by joining on URL handle.
  const byHandle: Record<string, any> = {};
  for (const p of pool) {
    if (p?.handle) byHandle[p.handle] = p;
  }

  // STEP 3 — score every candidate, blending all signals.
  // Co-purchase contributes the most weight (it's real customer
  // behaviour); discount + threshold-fit are smaller multipliers.
  type Scored = {product: any; score: number; reason: string};
  const scored: Scored[] = [];
  const seen = new Set<string>(cartHandleSet);
  const ALPHA_CO = 10;        // base weight per co-occurrence
  const BONUS_DISCOUNT = 5;   // small boost if has active auto-discount
  const BONUS_FIT = 3;        // small boost if price ≥ remainingEur (crosses bar)

  // Co-purchase candidates first (have a real signal)
  for (const s of coSuggestions) {
    if (seen.has(s.handle)) continue;
    const product = byHandle[s.handle];
    if (!product || !product.variants?.nodes?.[0]) continue;
    seen.add(s.handle);

    const variant = product.variants.nodes[0];
    const priceEur = parseFloat(variant.price?.amount || '0');
    const hasDiscount = !!bestDiscountFor(product.id);
    const fits = priceEur >= remainingEur && remainingEur > 0;
    const score =
      s.score * ALPHA_CO +
      (hasDiscount ? BONUS_DISCOUNT : 0) +
      (fits ? BONUS_FIT : 0);
    const reason = `co-purchased ${s.score}× with cart items${hasDiscount ? ' · on sale' : ''}${fits ? ' · fits free-shipping' : ''}`;
    scored.push({product, score, reason});
  }

  // Popularity fallback — fill remaining slots with top products that
  // aren't already in the cart and didn't make the co-purchase cut.
  for (const product of pool) {
    if (!product?.handle || seen.has(product.handle)) continue;
    if (!product.variants?.nodes?.[0]) continue;
    seen.add(product.handle);
    const variant = product.variants.nodes[0];
    const priceEur = parseFloat(variant.price?.amount || '0');
    const hasDiscount = !!bestDiscountFor(product.id);
    const fits = priceEur >= remainingEur && remainingEur > 0;
    const score =
      1 + // base popularity (we got it from the popular pool)
      (hasDiscount ? BONUS_DISCOUNT : 0) +
      (fits ? BONUS_FIT : 0);
    scored.push({product, score, reason: 'popular'});
  }

  // Final sort + cap
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, Math.max(BUMP_CART_CONFIG.showed, 6));

  // Run through the enhanceProducts pipeline so thumbnails match the
  // brand-aligned AI lifestyle imagery used everywhere else.
  const enhanced = enhanceProducts(top.map((s) => s.product));

  const suggestions = enhanced
    .map((p: any, i: number) => {
      const variant = p.variants?.nodes?.[0];
      if (!variant?.id) return null;
      const price = parseFloat(variant.price?.amount ?? '0');
      const currency = variant.price?.currencyCode ?? 'EUR';
      if (!isFinite(price) || price <= 0) return null;
      return {
        id: p.id,
        handle: p.handle,
        title: p.title,
        image: p.featuredImage?.url ?? null,
        merchandiseId: variant.id,
        availableForSale: variant.availableForSale !== false,
        price: {amount: variant.price.amount, currencyCode: currency},
        reason: top[i]?.reason ?? 'popular',
      };
    })
    .filter(Boolean);

  return data(
    {
      settings: {
        title: BUMP_CART_CONFIG.title,
        totalCartAmount: BUMP_CART_CONFIG.totalCartAmount,
        percent: BUMP_CART_CONFIG.percent,
      },
      suggestions,
    },
    {
      headers: {
        // Edge-cacheable for 5 min — different inCart query strings get
        // different cache buckets, so each cart context gets its own.
        'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
      },
    },
  );
}
