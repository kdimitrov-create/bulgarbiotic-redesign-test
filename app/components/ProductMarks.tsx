import {
  markTags,
  markBanners,
  bannerImageUrl,
  bannerFallbackUrl,
  type MarkCorner,
} from '~/lib/product-marks';

/**
 * The ONE renderer for product badges. Every surface — category grid, home
 * carousel, "Промоции", the product page — uses this, so a product looks the
 * same wherever it appears.
 *
 * Layout, as agreed with the client:
 *   • top-left column: "Ново" / "Бестселър" / merchant labels, then the
 *     discount percentage stacked underneath, then "Изчерпан"
 *   • image banners in whichever corner the merchant chose in the admin panel
 *
 * The wishlist heart is NOT drawn here — each surface keeps its own, because
 * it has to sit above this overlay to stay clickable.
 *
 * ⚠️ The parent element must be `position: relative`, or the badges will
 * escape and pin themselves to the page.
 */

const SIZES = {
  sm: {inset: 12, banner: 58},
  md: {inset: 10, banner: 74},
  lg: {inset: 12, banner: 84},
} as const;

type Size = keyof typeof SIZES;

/** Tags and banners together — what a product card wants. */
export function ProductMarks({
  product,
  discountPct = 0,
  soldOut = false,
  size = 'md',
}: {
  product: any;
  /** Already resolved by the caller from the admin rule — never re-derived here. */
  discountPct?: number;
  soldOut?: boolean;
  size?: Size;
}) {
  const rows = tagRows(product, discountPct, soldOut);
  return (
    <>
      <ProductMarkTags product={product} discountPct={discountPct} soldOut={soldOut} size={size} />
      <ProductMarkBanners product={product} size={size} tagRows={rows} />
    </>
  );
}

/** Just the text pills. The product page draws these outside its gallery. */
export function ProductMarkTags({
  product,
  discountPct = 0,
  soldOut = false,
  size = 'md',
}: {
  product: any;
  discountPct?: number;
  soldOut?: boolean;
  size?: Size;
}) {
  const tags = markTags(product);
  const {inset} = SIZES[size];
  if (!tags.length && discountPct <= 0 && !soldOut) return null;

  return (
    <span className={`pm-stack pm-stack-${size}`} style={{top: inset, left: inset}}>
      {tags.map((tag) => (
        <span key={tag.key} className="pm-tag" style={{background: tag.bg, color: tag.fg}}>
          {tag.text}
        </span>
      ))}
      {discountPct > 0 && <span className="pm-tag pm-tag-sale">−{discountPct}%</span>}
      {soldOut && <span className="pm-tag pm-tag-out">Изчерпан</span>}
    </span>
  );
}

/** Just the image marks, in the corners the merchant configured. */
export function ProductMarkBanners({
  product,
  size = 'md',
  tagRows: rows = 0,
}: {
  product: any;
  size?: Size;
  /** How many text pills sit top-left, so a "tl" banner can start below them. */
  tagRows?: number;
}) {
  const banners = markBanners(product);
  const {inset, banner: bannerSize} = SIZES[size];

  return (
    <>
      {(Object.keys(banners) as MarkCorner[]).map((corner) =>
        banners[corner].map((banner) => (
          <img
            key={`${corner}-${banner.id}`}
            src={bannerImageUrl(banner.imageUrl, bannerSize)}
            alt=""
            aria-hidden="true"
            loading="lazy"
            width={bannerSize}
            height={bannerSize}
            className="pm-banner"
            style={{
              width: bannerSize,
              height: bannerSize,
              // Both top corners are usually taken — "tl" by the tag stack and
              // "tr" by the wishlist heart — so a banner there starts below them.
              ...(corner === 'tl' || corner === 'tr'
                ? {top: inset + (corner === 'tr' ? 40 : rows * 30)}
                : {bottom: inset}),
              ...(corner === 'tl' || corner === 'bl' ? {left: inset} : {right: inset}),
            }}
            onError={(e) => {
              // Arbitrary CDN sizes can 404 — fall back to the original file.
              const base = bannerFallbackUrl(banner.imageUrl);
              if (e.currentTarget.src !== base) e.currentTarget.src = base;
            }}
          />
        )),
      )}
    </>
  );
}

function tagRows(product: any, discountPct: number, soldOut: boolean): number {
  return markTags(product).length + (discountPct > 0 ? 1 : 0) + (soldOut ? 1 : 0);
}
