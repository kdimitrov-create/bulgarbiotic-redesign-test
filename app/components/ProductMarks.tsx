import {
  markTags,
  markBanners,
  markDiscount,
  bannerImageUrl,
  bannerFallbackUrl,
  type MarkCorner,
} from '~/lib/product-marks';
import {discountColors} from '~/lib/active-discounts';

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

/**
 * Banner geometry is expressed as a share of the product photo, because the same
 * card is ~300px wide in the home carousel and ~155px in a four-column grid.
 *
 * These land in an INLINE style on purpose. Several surfaces style their images
 * from a component-level <style> block — `.bb-pcard-image img { height: 100% }`
 * in the home carousel, for one — and those blocks are emitted after app.css, so
 * a class rule of equal specificity loses and the marks get stretched to the
 * full height of the card. Inline wins against all of them without !important.
 */
const SIZES = {
  sm: {inset: 12, width: '27%', maxWidth: 62, minWidth: 34, cdn: 62},
  md: {inset: 10, width: '30%', maxWidth: 74, minWidth: 38, cdn: 74},
  lg: {inset: 12, width: '17%', maxWidth: 88, minWidth: 58, cdn: 88},
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

  // Цветът на промо етикета идва от самата отстъпка в панела, ако търговецът е
  // избрал такъв. Празно поле значи къщния розов, тоест днешният вид остава.
  const {color, textColor} = discountColors(markDiscount(product)?.name);
  const saleStyle = color || textColor
    ? {background: color || undefined, color: textColor || undefined}
    : undefined;

  return (
    <span className={`pm-stack pm-stack-${size}`} style={{top: inset, left: inset}}>
      {tags.map((tag) => (
        <span key={tag.key} className="pm-tag" style={{background: tag.bg, color: tag.fg}}>
          {tag.text}
        </span>
      ))}
      {discountPct > 0 && (
        <span className="pm-tag pm-tag-sale" style={saleStyle}>−{discountPct}%</span>
      )}
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
  const {inset, width, maxWidth, minWidth, cdn} = SIZES[size];

  return (
    <>
      {(Object.keys(banners) as MarkCorner[]).map((corner) =>
        banners[corner].map((banner) => (
          <img
            key={`${corner}-${banner.id}`}
            src={bannerImageUrl(banner.imageUrl, cdn)}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="pm-banner"
            style={{
              position: 'absolute',
              zIndex: 2,
              width,
              maxWidth,
              minWidth,
              height: 'auto',
              aspectRatio: '1 / 1',
              objectFit: 'contain',
              borderRadius: 0,
              background: 'transparent',
              pointerEvents: 'none',
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
