import {Link} from 'react-router';
import type {Product} from '@cloudcart/nitro';
import {Image} from '@cloudcart/nitro-react';
import {StarRating} from './StarRating';
import {WishlistButton} from './WishlistButton';
import {CardBuyButton} from './CardBuyButton';
import {realDiscountFor as synthDiscount} from '~/lib/active-discounts';

const EUR_TO_BGN = 1.95583;

const fmt = (n: number, currency: 'EUR' | 'BGN') =>
  new Intl.NumberFormat('bg-BG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n) + (currency === 'EUR' ? ' €' : ' лв');

/**
 * Product card for listing / collection grids.
 *
 * Visual upgrades vs. the previous version:
 *   • Brand-coloured badges (Ново / Бестселър / Промо / Изчерпан) instead of
 *     generic grey
 *   • Discount % badge ("−15%") in pink when compareAtPrice is present
 *   • Dual currency price (EUR primary italic, BGN secondary muted)
 *   • Card lifts on hover with shadow + image zoom (matches PDP linked-products)
 *   • Wishlist heart top-right (always visible on touch, fade-in on hover on desktop)
 *   • Star rating only when there are real reviews
 */
export function ProductCard({product, loading}: {product: Product; loading?: 'eager' | 'lazy'}) {
  const p = product as any;
  const labels: Array<{name: string; color?: string; textColor?: string}> = p.labels ?? [];
  const reviewSummary = p.reviewSummary;

  const variant = p.variants?.nodes?.[0];
  let priceObj = variant?.price ?? p.priceRange?.minVariantPrice;
  // Discount sources, in order:
  //   1) variant.compareAtPrice
  //   2) product.discount.msrpPrice (CloudCart catalogue promo)
  //   3) synthDiscount() — store-wide promo synthesised client-side
  //      because CloudCart's Storefront API doesn't surface auto-applied
  //      catalogue promos through the GraphQL response.
  const variantCompare = variant?.compareAtPrice;
  const productDiscount = p.discount;
  let compareObj =
    variantCompare && parseFloat(variantCompare.amount) > parseFloat(priceObj?.amount ?? '0')
      ? variantCompare
      : (productDiscount?.msrpPrice ?? null);
  let rulePct: number | null = null;
  if (!compareObj && priceObj) {
    const synth = synthDiscount(p, priceObj);
    if (synth) {
      compareObj = synth.msrpPrice;
      priceObj = synth.salePrice;
      // Keep the rule's own percentage. Deriving it back from the rounded sale
      // price prints 32% for a 33% rule, which contradicts the admin panel.
      rulePct = synth.percent;
    }
  }
  const priceAmount = priceObj ? parseFloat(priceObj.amount) : 0;
  const compareAmount = compareObj ? parseFloat(compareObj.amount) : 0;
  const currency = (priceObj?.currencyCode ?? 'EUR') as 'EUR' | 'BGN';
  const eur = currency === 'EUR' ? priceAmount : priceAmount / EUR_TO_BGN;
  const bgn = currency === 'BGN' ? priceAmount : priceAmount * EUR_TO_BGN;
  const isOnSale = compareAmount > priceAmount;
  const discountPct = isOnSale
    ? (rulePct ?? productDiscount?.percent ?? Math.round((1 - priceAmount / compareAmount) * 100))
    : 0;
  const compareEur = currency === 'EUR' ? compareAmount : compareAmount / EUR_TO_BGN;

  // Multi-variant range pricing
  const min = p.priceRange?.minVariantPrice;
  const max = p.priceRange?.maxVariantPrice;
  const hasRange = min && max && min.amount !== max.amount;

  return (
    <Link
      to={`/product/${product.handle}`}
      className="group block text-inherit no-underline transition-all duration-200 ease-out hover:no-underline hover:-translate-y-1"
      prefetch="intent"
    >
      <div className="relative overflow-hidden rounded-2xl bg-gray-50">
        {product.featuredImage?.url ? (
          <Image
            data={product.featuredImage}
            alt={product.title}
            loading={loading}
            className="aspect-square object-cover w-full transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <img
            src="/noimage.svg"
            alt={product.title}
            loading={loading}
            className="aspect-square object-cover w-full bg-gray-100"
          />
        )}

        {/* Top-left badges stack */}
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 max-w-[70%]">
          {p.isNew && (
            <span className="py-1 px-3 rounded-full text-[0.6rem] font-bold uppercase tracking-wider leading-none bg-[var(--color-brand-pink)] text-white">
              Ново
            </span>
          )}
          {p.isFeatured && (
            <span className="py-1 px-3 rounded-full text-[0.6rem] font-bold uppercase tracking-wider leading-none bg-amber-500 text-white">
              Бестселър
            </span>
          )}
          {labels
            .filter((l) => !['New', 'Featured'].includes(l.name))
            .slice(0, 1)
            .map((label) => (
              <span
                key={label.name}
                className="py-1 px-3 rounded-full text-[0.6rem] font-bold uppercase tracking-wider leading-none bg-gray-700 text-white"
                style={label.color ? {backgroundColor: label.color, color: label.textColor || '#fff'} : undefined}
              >
                {label.name}
              </span>
            ))}
        </div>

        {/* Top-right stack: discount % + sold out.
            The discount badge moved here because the left stack already carries
            the product labels ("клинично доказани щамове"). Both live in ONE
            column so a sold-out product on promo stacks them instead of
            overlapping. */}
        <div className="absolute top-2.5 right-2.5 flex flex-col items-end gap-1.5 z-10">
          <WishlistButton productId={product.id} size="lg" />
          {isOnSale && discountPct > 0 && (
            <span className="py-1 px-3 rounded-full text-[0.6rem] font-bold uppercase tracking-wider leading-none bg-[var(--color-brand-pink)] text-white shadow-sm">
              −{discountPct}%
            </span>
          )}
          {product.availableForSale === false && (
            <span className="py-1 px-3 rounded-full text-[0.6rem] font-bold uppercase tracking-wider leading-none bg-[var(--color-ink)] text-white">
              Изчерпан
            </span>
          )}
        </div>

        {/* Round claim badge, bottom-right of the image — mirrors the live store.
            It is NOT a CloudCart label (products return an empty `labels` list),
            so it is part of the design and shows on every card. The heart moved
            up into the top-right stack to free this corner. */}
        <span
          className="absolute bottom-2.5 right-2.5 z-10 grid place-items-center size-[74px] rounded-full bg-[var(--color-brand-pink)] text-white text-center px-2 text-[0.55rem] font-bold uppercase leading-[1.15] tracking-wide shadow-md pointer-events-none"
          aria-hidden="true"
        >
          Клинично
          <br />
          доказани
          <br />
          щамове
        </span>
      </div>

      <div className="mt-3 px-0.5">
        <h4 className="text-sm font-bold leading-tight text-[var(--color-ink)] line-clamp-2 min-h-[2.6em]">
          {product.title}
        </h4>

        {reviewSummary && reviewSummary.totalCount > 0 && (
          <div className="mt-1.5">
            <StarRating
              rating={reviewSummary.averageRating}
              count={reviewSummary.totalCount}
              size="sm"
            />
          </div>
        )}

        <div className="mt-2 flex items-baseline gap-2 flex-wrap">
          <span
            className="text-[17px] font-semibold text-[var(--color-ink)] leading-none"
            style={{fontFamily: 'var(--font-serif)', fontStyle: 'normal', fontWeight: 600, letterSpacing: '-0.4px'}}
          >
            {hasRange ? 'от ' : ''}{fmt(eur, 'EUR')}
          </span>
          <span className="text-[12px] text-gray-500 leading-none">
            {fmt(bgn, 'BGN')}
          </span>
          {isOnSale && compareEur > 0 && (
            <span className="text-[12px] text-gray-400 line-through leading-none ml-0.5">
              {fmt(compareEur, 'EUR')}
            </span>
          )}
        </div>

        {/* "Купи" — same button as the home carousel (client request). */}
        <CardBuyButton merchandiseId={p.variants?.nodes?.[0]?.id} handle={product.handle} />
      </div>
    </Link>
  );
}
