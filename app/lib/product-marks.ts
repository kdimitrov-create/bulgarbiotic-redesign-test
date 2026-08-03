/**
 * ONE source for every product marking on the storefront: the text labels
 * ("Ново", "Бестселър", merchant-authored ones) and the image banners
 * ("клинично доказани щамове", the Forbes award).
 *
 * Why this file exists: the same information was being read four different
 * ways — the category card filtered `labels`, the home carousel took
 * `labels[0]` and repainted it pink, the PDP rendered its own set, and the
 * strains mark was a hardcoded <img> that only two of the four surfaces had.
 * So the same product showed different badges depending on where you looked
 * at it, and /selection/sale showed none at all.
 *
 * Everything here comes from the merchant's admin panel:
 *   • labels   → Продукти → Етикети   (name + colour + text colour)
 *   • isNew / isFeatured → the product's own "Нов" / "Препоръчан" flags
 *   • banners  → Продукти → Банери    (image + corner: tl/tr/bl/br)
 *
 * The CloudCart Storefront API returns all of it — no PAT, no admin call.
 * The catch is that its LIST query only asks for `labels`, while `banners`,
 * `isNew` and `isFeatured` are requested by the single-product query alone.
 * `product-marks.server.ts` closes that gap by pulling the marks for the whole
 * catalogue once and handing them to every surface through `setProductMarks`.
 */

export type MarkCorner = 'tl' | 'tr' | 'bl' | 'br';

export interface ProductBanner {
  id: string;
  name?: string | null;
  imageUrl: string;
  /** Corner chosen by the merchant in the admin panel. */
  position: MarkCorner;
}

export interface ProductLabel {
  name: string;
  color?: string | null;
  textColor?: string | null;
}

export interface ProductMark {
  isNew: boolean;
  isFeatured: boolean;
  labels: ProductLabel[];
  banners: ProductBanner[];
}

/** A text badge, already translated and coloured, ready to render. */
export interface MarkTag {
  key: string;
  text: string;
  /** Background colour — the merchant's own when they set one. */
  bg: string;
  fg: string;
}

const EMPTY: ProductMark = {isNew: false, isFeatured: false, labels: [], banners: []};

/**
 * The two built-in CloudCart labels come back in English and duplicate the
 * `isNew` / `isFeatured` flags, so they are translated once here and rendered
 * from the flags — never twice.
 */
const BUILT_IN: Record<string, {text: string; bg: string; fg: string}> = {
  New: {text: 'Ново', bg: 'var(--color-brand-pink)', fg: '#ffffff'},
  Featured: {text: 'Бестселър', bg: '#f59e0b', fg: '#ffffff'},
};

/** House colours for a merchant label that has no colour set in the admin. */
const DEFAULT_LABEL = {bg: 'var(--color-brand-blue)', fg: '#ffffff'};

let current: Record<string, ProductMark> = {};

/**
 * Install the catalogue-wide marks fetched by the server. Ignores an empty
 * payload so a failed fetch keeps whatever each product carried on its own —
 * a missing badge is cosmetic, a wrong one is not.
 */
export function setProductMarks(next: Record<string, ProductMark> | null | undefined) {
  if (!next || !Object.keys(next).length) return;
  current = next;
}

/** "gid://cloudcart/Product/37" → "37". Plain numeric ids pass through. */
export function markProductId(idOrGid: string | undefined | null): string | null {
  if (!idOrGid) return null;
  const m = String(idOrGid).match(/Product\/(\d+)/);
  return m?.[1] ?? (String(idOrGid).match(/^\d+$/) ? String(idOrGid) : null);
}

/**
 * The marks for one product. Fields the product carries itself win — the PDP
 * query returns everything first-hand — and the catalogue map fills the rest,
 * which is what makes listings show the same badges as the product page.
 */
export function marksFor(product: any): ProductMark {
  const id = markProductId(product?.id);
  const shared = (id && current[id]) || EMPTY;
  const ownBanners: ProductBanner[] | undefined = product?.banners;
  const ownLabels: ProductLabel[] | undefined = product?.labels;
  return {
    isNew: product?.isNew ?? shared.isNew,
    isFeatured: product?.isFeatured ?? shared.isFeatured,
    labels: ownLabels?.length ? ownLabels : shared.labels,
    banners: ownBanners?.length ? ownBanners : shared.banners,
  };
}

/**
 * The text badges for a product, in the order they should stack: "Ново" and
 * "Бестселър" first, then the merchant's own labels. The discount percentage
 * is deliberately NOT in here — the client wants it stacked underneath, and
 * every surface gets it from the same pricing code.
 */
export function markTags(product: any): MarkTag[] {
  const mark = marksFor(product);
  const tags: MarkTag[] = [];
  if (mark.isNew) tags.push({key: 'new', ...BUILT_IN.New});
  if (mark.isFeatured) tags.push({key: 'featured', ...BUILT_IN.Featured});
  for (const label of mark.labels) {
    // Skip the two built-ins: they are already rendered from the flags above,
    // and CloudCart returns both the flag and a label row for the same thing.
    if (BUILT_IN[label.name]) {
      const key = label.name === 'New' ? 'new' : 'featured';
      if (!tags.some((t) => t.key === key)) tags.push({key, ...BUILT_IN[label.name]});
      continue;
    }
    tags.push({
      key: `label-${label.name}`,
      text: label.name,
      bg: label.color || DEFAULT_LABEL.bg,
      fg: label.textColor || DEFAULT_LABEL.fg,
    });
  }
  return tags;
}

/** The image banners grouped by the corner the merchant picked. */
export function markBanners(product: any): Record<MarkCorner, ProductBanner[]> {
  const out: Record<MarkCorner, ProductBanner[]> = {tl: [], tr: [], bl: [], br: []};
  for (const banner of marksFor(product).banners) {
    const corner = (String(banner.position || 'bl').toLowerCase() as MarkCorner);
    (out[corner] ?? out.bl).push(banner);
  }
  return out;
}

/**
 * Ask the CDN for the size we actually draw instead of the 600px original —
 * a 74px badge downloading 600px is the single most expensive thing on a
 * listing page. 2× the CSS size keeps it crisp on retina.
 *
 * Arbitrary sizes can 404 on the CloudCart CDN, so every caller pairs this
 * with an onError that falls back to `bannerFallbackUrl`.
 */
export function bannerImageUrl(url: string, cssSize: number): string {
  const target = Math.round(cssSize * 2);
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('width', String(target));
    parsed.searchParams.set('height', String(target));
    return parsed.toString();
  } catch {
    return url;
  }
}

/** The same image with no resize parameters — the always-valid fallback. */
export function bannerFallbackUrl(url: string): string {
  const cut = url.indexOf('?');
  return cut === -1 ? url : url.slice(0, cut);
}
