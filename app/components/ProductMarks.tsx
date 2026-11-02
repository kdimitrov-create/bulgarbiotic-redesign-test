import {
  markTags,
  markBanners,
  markDiscount,
  bannerImageUrl,
  bannerFallbackUrl,
  type MarkCorner,
} from '~/lib/product-marks';
import {discountColors} from '~/lib/active-discounts';
import {KIDS_CAMPAIGN} from '~/lib/kids-campaign';
import {DYSON_CAMPAIGN} from '~/lib/dyson-campaign';

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
 *
 * Банерът се рисува в РАЗМЕРА НА ФАЙЛА, но не по-голям от рамката (`box*`).
 * Дотук всеки банер беше натикан в квадрат от 88px и широк етикет 300×120
 * излизаше 88×35 - каквото и да качи търговецът (клиент, 12.10.2026).
 *
 *   • lg (продуктова страница): рамката е точно знакът „Back to school" -
 *     46% от снимката, между 182 и 277px, 2:1. Това е таванът по искане на
 *     клиента: колкото и голям файл да качат, по-голям от него не става.
 *   • sm / md (карти): същите 46% ширина, а височината остава колкото беше
 *     квадратът досега (27% / 30%, 62 / 74px най-много). Кръглите значки по
 *     картите не се променят, а широките етикети получават място встрани.
 */
const SIZES = {
  sm: {inset: 12, boxWidth: '46%', boxMax: 106, boxMin: 58, boxRatio: '46 / 27', cdn: 106},
  md: {inset: 10, boxWidth: '46%', boxMax: 113, boxMin: 58, boxRatio: '46 / 30', cdn: 113},
  lg: {inset: 12, boxWidth: '46%', boxMax: 277, boxMin: 182, boxRatio: '2 / 1', cdn: 277},
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
  const {inset, boxWidth, boxMax, boxMin, boxRatio, cdn} = SIZES[size];

  return (
    <>
      {(Object.keys(banners) as MarkCorner[]).map((corner) =>
        banners[corner].map((banner) => {
          /* Знакът Back to school е кампаниен и клиентът го иска отчетлив:
             на продуктовата страница (lg) стои НАЙ-ГОРЕ в ъгъла и е три пъти
             по-голям от обичайния банер. По картите остава с нормалния
             размер - три пъти там би затиснало снимката. */
          const isCampaignBadge =
            KIDS_CAMPAIGN.active &&
            (String(banner.id).split('/').pop() ?? '') === KIDS_CAMPAIGN.badgeBannerId;
          /* По картите знакът е нечетлива лентичка (цяло изречение в ~60px) -
             клиентът го отчете като грозен. Там не се рисува изобщо: за
             кампанията по листинга говорят промо лентата и банерът на
             категорията, а знакът остава едър на продуктовата страница. */
          if (isCampaignBadge && size !== 'lg') return null;
          const big = isCampaignBadge && size === 'lg';
          /* Знакът „1+1" стои В САМИЯ горен десен ъгъл (клиент, 01.09), не с
             обичайния отстъп надолу. Отстъпът от 40px пази място за сърцето на
             любимите, а то вече не се рисува никъде - проверено, `WishlistButton`
             няма нито един вносител. Смяната е само за този знак, за да не
             мръднат банерите на търговеца. */
          const isDysonBadge =
            DYSON_CAMPAIGN.active &&
            String(banner.id) === DYSON_CAMPAIGN.badgeBannerId;
          /* Само ширина към CDN-а, без височина: квадратна заявка слага широк
             файл в квадрат с празни полета. CDN-ът не уголемява малки файлове,
             тоест значка 100×100 си идва 100×100 и се рисува в своя размер. */
          const src = bannerImageUrl(banner.imageUrl, cdn);
          const right = corner === 'tr' || corner === 'br';
          const bottom = corner === 'bl' || corner === 'br';
          return (
            /* Рамката е таванът; картинката вътре е в своя размер, смалена
               само ако не се побира, и прилепена към ъгъла на търговеца. */
            <span
              key={`${corner}-${banner.id}`}
              aria-hidden="true"
              style={{
                position: 'absolute',
                zIndex: 2,
                display: 'flex',
                justifyContent: right ? 'flex-end' : 'flex-start',
                alignItems: bottom ? 'flex-end' : 'flex-start',
                width: boxWidth,
                maxWidth: boxMax,
                minWidth: boxMin,
                aspectRatio: boxRatio,
                pointerEvents: 'none',
                // Both top corners are usually taken — "tl" by the tag stack and
                // "tr" by the wishlist heart — so a banner there starts below
                // them. The campaign badge is the exception: straight at the
                // top, с отрицателен отстъп, който изяжда 21-те процента
                // прозрачно поле В САМАТА картинка (измерено: видимото почва
                // от пиксел 106 на 500) - иначе знакът виси под мястото си.
                // -17: видимият ръб на знака ляга на равнината на „-25%" пила
                // (12px inset), след като се извади прозрачното поле на файла.
                ...(corner === 'tl' || corner === 'tr'
                  ? {
                      /* „tr" стои на равнината на етикетите вляво (клиент,
                         12.10.2026): отстъпът от 40px пазеше място за сърцето
                         на любимите, а то не се рисува никъде. */
                      top: big
                        ? -17
                        : isDysonBadge || corner === 'tr'
                          ? inset
                          : inset + rows * 30,
                    }
                  : {bottom: inset}),
                ...(corner === 'tl' || corner === 'bl' ? {left: inset} : {right: inset}),
              }}
            >
              <img
                src={src}
                alt=""
                /* Не `lazy`: размерът е `auto`, тоест преди зареждане картинката
                   е 0×0, и Chrome по картите така и не я тегли. Банерните файлове
                   са няколко и се свалят веднъж за цялата страница. */
                decoding="async"
                className="pm-banner"
                style={{
                  display: 'block',
                  // Размерът на файла, но не повече от рамката. Галерията на
                  // продукта слага на всяка картинка `w-full aspect-square
                  // object-cover` - затова всичко тук е изрично и inline.
                  width: 'auto',
                  height: 'auto',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  minWidth: 0,
                  minHeight: 0,
                  aspectRatio: 'auto',
                  objectFit: 'contain',
                  borderRadius: 0,
                  background: 'transparent',
                }}
                onError={(e) => {
                  // Arbitrary CDN sizes can 404 — fall back to the original file.
                  const base = bannerFallbackUrl(banner.imageUrl);
                  if (e.currentTarget.src !== base) e.currentTarget.src = base;
                }}
              />
            </span>
          );
        }),
      )}
    </>
  );
}

function tagRows(product: any, discountPct: number, soldOut: boolean): number {
  return markTags(product).length + (discountPct > 0 ? 1 : 0) + (soldOut ? 1 : 0);
}
