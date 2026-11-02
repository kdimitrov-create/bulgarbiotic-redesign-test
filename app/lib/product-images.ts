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
    '/images/generated-v2/p-femin.webp',
    '/images/generated-v2/c-women.webp',
  ],
  'bactology-colongic-probiotik-za-debeloto-chervo': [
    '/images/generated-v2/p-colongic.webp',
  ],
  'bactology-anti-stress': [
    '/images/generated-v2/p-anti-stress.webp',
  ],
  'probiotik-za-bebe-deca-i-podrastvashti-babies-and-kids': [
    '/images/generated-v2/p-babies.webp',
    '/images/generated-v2/c-kids.webp',
  ],
  'bactology-probiotik-za-podut-korem-i-gazove-gastro-balance': [
    '/images/generated-v2/p-gastro.webp',
  ],
  'bactology-probiotik-za-podut-korem-i-gazove-gastro-balance-copy': [
    '/images/generated-v2/p-gastro-copy.png',
  ],
  'bactology-pets': [
    '/images/generated-v2/p-pets.webp',
    '/images/generated-v2/c-pets.webp',
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
    '/images/generated-v2/c-pearls.webp',
  ],
  'probiotic-pearls-with-milk-chocolate-coating-suitable-for-kids-copy': [
    '/images/generated-v2/p-pearls-milk-kids.png',
    '/images/generated-v2/c-pearls.webp',
  ],
  'probiotik-za-zdravi-zabi-i-venci-mini': [
    '/images/generated-v2/p-teeth-mini.png',
  ],

  // ── Bundles + multi-SKU packs ──
  'smart-start-paket-za-silen-imunitet': [
    '/images/generated-v2/p-smart-start.webp',
    '/images/generated-v2/c-kids.webp',
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
    '/images/generated-v2/c-pearls.webp',
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

/**
 * Свива адрес от CDN на CloudCart до размера на показване И го иска като WebP.
 *
 * ⭐ `format=webp` е далеч по-голямата печалба от ширината. Мерено на живо
 * 18.08.2026 върху един и същи продуктов адрес:
 *
 *   ?width=600                 431 KB  (PNG)
 *   ?width=600&format=webp      21 KB  ← 95% по-малко
 *
 * И върху банер от панела (1640×624):
 *   без нищо                   740 KB  (PNG)
 *   ?format=webp                57 KB  ← 92% по-малко
 *
 * ⛔ Договарянето по заглавка `Accept: image/webp` НЕ работи както трябва -
 * връща 588 KB. Параметърът трябва да е изричен.
 *
 * ⚠️ Ширината НЕ бива да е над естествената: за банера `width=1800` върху
 * източник от 1640 px УВЕЛИЧАВА файла (827 KB срещу 740). Подава се ширината
 * на ПОКАЗВАНЕ по 2×, но никога „за всеки случай по-голямо".
 *
 * Storefront API-то връща адресите подпечатани с `?width=1920&height=1920`, а
 * картите ги рисуват на ~240 px - оттам идва разликата.
 *
 * ⛔ Пипа само адресите на CloudCart (`/cdn/img/` и `cdncloudcart.com`).
 * Нашите файлове в `/images/` вече са WebP и не минават през преоразмерител.
 */
export function cdnResize(url: string | null | undefined, width?: number): string {
  const u = String(url ?? '');
  if (!u) return u;
  const isCloudCart = u.includes('/cdn/img/') || u.includes('cdncloudcart.com');
  if (!isCloudCart) return u;
  const [base, query = ''] = u.split('?');
  const q = new URLSearchParams(query);
  if (width) {
    q.set('width', String(width));
    if (q.has('height')) q.set('height', String(width));
  }
  q.set('format', 'webp');
  return `${base}?${q.toString()}`;
}

