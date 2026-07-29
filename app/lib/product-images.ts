import type {Product} from '@cloudcart/nitro';

/**
 * Single source of truth for AI-enhanced product imagery.
 *
 * Map: product handle → ordered list of enhanced image URLs.
 * The first entry replaces `featuredImage`. The full list replaces
 * `images.nodes` (so PDP galleries show enhanced versions first, with the
 * real CloudCart CDN images appended as supplements).
 *
 * Real CloudCart catalog data is **never** mutated — this layer only swaps
 * the URLs that the React components see.
 *
 * To add a new product:
 *   1. Generate the enhanced image(s) via `scripts/gen-mockup-images-v2.py`
 *      (Gemini 3 Pro Image, image-to-image with the real product photo as input
 *      so the packaging is preserved exactly).
 *   2. Drop the resulting PNG into `public/images/generated-v2/`.
 *   3. Add the handle → URLs entry below.
 */
/**
 * Global switch for AI-enhanced product imagery.
 *
 * Client decision (2026-07, "Цветове на кутиите"): the AI renders shifted the
 * real box colours, so the storefront must show the ORIGINAL product photos
 * from bulgarbiotic.bg (the real CloudCart CDN images). This flag makes
 * `enhanceProductImages` a no-op site-wide — every product card, PDP gallery
 * and listing falls back to real CloudCart imagery. Flip to `true` to bring the
 * enhanced renders back; the map + logic below are kept intact for that.
 */
const USE_ENHANCED_IMAGES = false;

export const ENHANCED_PRODUCT_IMAGES: Record<string, string[]> = {
  // ── Single SKU products ──
  'bactology-probiotik-za-jeni-femin': [
    '/images/generated-v2/p-femin.png',
    '/images/generated-v2/c-women.png',
  ],
  'bactology-colongic-probiotik-za-debeloto-chervo': [
    '/images/generated-v2/p-colongic.png',
  ],
  'bactology-anti-stress': [
    '/images/generated-v2/p-anti-stress.png',
  ],
  'probiotik-za-bebe-deca-i-podrastvashti-babies-and-kids': [
    '/images/generated-v2/p-babies.png',
    '/images/generated-v2/c-kids.png',
  ],
  'bactology-probiotik-za-podut-korem-i-gazove-gastro-balance': [
    '/images/generated-v2/p-gastro.png',
  ],
  'bactology-probiotik-za-podut-korem-i-gazove-gastro-balance-copy': [
    '/images/generated-v2/p-gastro-copy.png',
  ],
  'bactology-pets': [
    '/images/generated-v2/p-pets.png',
    '/images/generated-v2/c-pets.png',
  ],
  'aktivna-formula-za-zdrava-i-blestyashta-kosa-i-nokti-bactology': [
    '/images/generated-v2/p-hair-nails.png',
  ],
  'aktivna-formula-za-siyayna-i-elastichna-koja-bez-brachki-bactology': [
    '/images/generated-v2/p-skin-formula.png',
  ],
  'probiotic-tablets-in-precisely-balanced-combination-copy': [
    '/images/generated-v2/p-tablets.png',
  ],
  'dietary-probiotic-pearls-with-natural-chocolate-coating-without-added-sugar-copy': [
    '/images/generated-v2/p-pearls-keto.png',
    '/images/generated-v2/c-pearls.png',
  ],
  'probiotic-pearls-with-milk-chocolate-coating-suitable-for-kids-copy': [
    '/images/generated-v2/p-pearls-milk-kids.png',
    '/images/generated-v2/c-pearls.png',
  ],
  'probiotik-za-zdravi-zabi-i-venci-mini': [
    '/images/generated-v2/p-teeth-mini.png',
  ],

  // ── Bundles + multi-SKU packs ──
  'smart-start-paket-za-silen-imunitet': [
    '/images/generated-v2/p-smart-start.png',
    '/images/generated-v2/c-kids.png',
  ],
  'family-pack': [
    '/images/generated-v2/p-family-pack.png',
  ],
  'travel-pack-1': [
    '/images/generated-v2/p-travel-pack.png',
  ],
  'paket-beauty': [
    '/images/generated-v2/p-paket-beauty.png',
  ],
  'paket-otslabvane': [
    '/images/generated-v2/p-paket-otslabvane.png',
  ],
  'paket-otslabvane-za-maje': [
    '/images/generated-v2/p-paket-otslabvane-maje.png',
  ],
  'paket-gastro-balance': [
    '/images/generated-v2/p-paket-gastro.png',
  ],
  'gastro-balance-colongic': [
    '/images/generated-v2/p-gastro-colongic.png',
  ],
  'probiotik-za-bremenni-paket': [
    '/images/generated-v2/p-bremenni.png',
  ],
  'dvoyno-udovolstvie': [
    '/images/generated-v2/p-pearls-double.png',
    '/images/generated-v2/c-pearls.png',
  ],

  // ── Promo bundles (auto-discounted SKUs) ──
  'probiotici-za-plosko-koremche-promociya-femin-gastro-balance': [
    '/images/generated-v2/p-plosko-koremche.png',
  ],
  'promociya-3-br-probiotichni-tabletki-za-smuchene': [
    '/images/generated-v2/p-3-tablets-promo.png',
  ],
  'promociya-probiotik-femin-probiotichni-perli-s-naturalen-shokolad': [
    '/images/generated-v2/p-femin-pearls-promo.png',
  ],
  'promociya-babies-and-kids-probiotichni-perli-s-mlechen-shokolad': [
    '/images/generated-v2/p-babies-pearls-promo.png',
  ],

  // NOTE: `paket-colongic` is intentionally NOT enhanced — its product
  // image triggers Gemini's content filter (OTHER block) so falls back to
  // CloudCart CDN. `bactology-probioticni-perli-s-mlecen-shokolad` is a
  // legacy handle no longer in catalog (real handle is
  // `probiotic-pearls-with-milk-chocolate-coating-suitable-for-kids-copy`).
};

/** First enhanced image, or null if the handle isn't enhanced. */
export function getEnhancedFeatured(handle: string): string | null {
  const list = ENHANCED_PRODUCT_IMAGES[handle];
  return list && list.length > 0 ? list[0] : null;
}

/** Cheap synthetic image node so JSX components keep working unchanged. */
function syntheticImageNode(url: string, alt: string, idx: number) {
  return {
    id: `enh-${idx}-${url}`,
    url,
    altText: alt,
    width: 1200,
    height: 1200,
  } as unknown as NonNullable<Product['images']>['nodes'][number];
}

/**
 * Returns a copy of the product with `featuredImage` and `images.nodes`
 * rewritten to point at the AI-enhanced versions, when available.
 *
 * - If the handle is **not** in the enhancement map, the product is returned
 *   unchanged so real CloudCart CDN images remain in use.
 * - If enhanced images exist, they are placed FIRST in the gallery; the
 *   original CloudCart images follow (so customers can still see real-world
 *   shots if the gallery is long).
 */
export function enhanceProductImages<T extends Product>(p: T | null | undefined): T | null {
  if (!p) return p ?? null;
  // Client: use original bulgarbiotic.bg product photos (real box colours).
  if (!USE_ENHANCED_IMAGES) return p;
  const enhanced = ENHANCED_PRODUCT_IMAGES[p.handle];
  if (!enhanced || enhanced.length === 0) return p;

  const realNodes = p.images?.nodes ?? [];
  const synthetic = enhanced.map((url, i) => syntheticImageNode(url, p.title || p.handle, i));

  return {
    ...p,
    featuredImage: {
      ...(p.featuredImage ?? {}),
      url: enhanced[0],
      altText: p.featuredImage?.altText ?? p.title ?? p.handle,
    },
    images: {
      ...(p.images ?? {}),
      nodes: [...synthetic, ...realNodes],
    },
  } as T;
}

/** Convenience: enhance an array of products in one call. */
export function enhanceProducts<T extends Product>(products: T[]): T[] {
  return products.map((p) => enhanceProductImages(p)).filter((p): p is T => p !== null);
}
