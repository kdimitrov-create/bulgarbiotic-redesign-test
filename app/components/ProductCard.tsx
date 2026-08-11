import {Link} from 'react-router';
import type {Product} from '@cloudcart/nitro';
import {Image} from '@cloudcart/nitro-react';
import {StarRating} from './StarRating';
import {CardBuyButton} from './CardBuyButton';
import {ProductMarks} from './ProductMarks';
import {displayDiscountPercent} from '~/lib/active-discounts';
import {markPricing} from '~/lib/product-marks';

import {SHOW_BGN} from '~/lib/currency';
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
  const reviewSummary = p.reviewSummary;

  // Both prices come straight from CloudCart — the one the shopper pays and the
  // one it was before. Nothing here multiplies a price by a percentage; the
  // catalogue price already has the promotion in it.
  const {price: priceObj, compareAtPrice: compareObj} = markPricing(p);
  const priceAmount = priceObj ? parseFloat(priceObj.amount) : 0;
  const compareAmount = compareObj ? parseFloat(compareObj.amount) : 0;
  const currency = (priceObj?.currencyCode ?? 'EUR') as 'EUR' | 'BGN';
  const eur = currency === 'EUR' ? priceAmount : priceAmount / EUR_TO_BGN;
  const bgn = currency === 'BGN' ? priceAmount : priceAmount * EUR_TO_BGN;
  const isOnSale = compareAmount > priceAmount;
  const discountPct = displayDiscountPercent(null, priceAmount, compareAmount);
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

        {/* „Любими“ е изключено в модула „Продуктов каталог“ (клиент 2026-08-04) —
            сърцето е махнато от картите, каруселите и продуктовата страница. */}

        {/* Every badge on this card — labels, the strains mark, the Forbes
            award — comes from the admin panel through ProductMarks. Nothing
            about them is hardcoded here any more. */}
        <ProductMarks
          product={p}
          discountPct={isOnSale ? discountPct : 0}
          soldOut={product.availableForSale === false}
          size="md"
        />
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
          {SHOW_BGN && (
            <span className="text-[12px] text-gray-500 leading-none">
              {fmt(bgn, 'BGN')}
            </span>
          )}
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
