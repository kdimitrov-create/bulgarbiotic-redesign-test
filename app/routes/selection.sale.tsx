import {useLoaderData, useSearchParams, useNavigate, Link} from 'react-router';
import type {Route} from './+types/selection.sale';
import {getContext} from '~/lib/context';
import {getSeoMeta, getPaginationVariables} from '@cloudcart/nitro';
import {Image} from '@cloudcart/nitro-react';
import {Pagination} from '~/components/Pagination';
import {enhanceProducts} from '~/lib/product-images';
import {synthDiscount, discountPctFor} from '~/lib/active-promo';
import {bestDiscountFor, discountedProductIds} from '~/lib/active-discounts';

const EUR_TO_BGN = 1.95583;
const fmt = (n: number, c: 'EUR' | 'BGN') =>
  new Intl.NumberFormat('bg-BG', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(n) +
  (c === 'EUR' ? ' €' : ' лв');

export const meta: Route.MetaFunction = () =>
  getSeoMeta({
    title: 'Промоции | Bactology — Български пробиотици на топ цени',
    description:
      'Активни промоции на Bactology пробиотици — пакетни оферти, отстъпки и сезонни кампании. Спести до 35% от любимите си продукти.',
  });

/**
 * Curated promotions page — replaces the broken /collections/promotions link.
 *
 * Fetches all products with `onSale: true` from the Storefront API (CloudCart
 * exposes this via the standard ProductFilter). Hero highlights the current
 * MAY30 campaign + WELCOME10 first-order code (real discount ids 467 + 440).
 * Each card shows a prominent discount % badge — sorted by biggest savings
 * first by default.
 */
export async function loader({context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const paginationVariables = getPaginationVariables(request, {pageBy: 60});

  // CloudCart's `{onSale: true}` Storefront filter doesn't surface
  // order-level auto-apply discounts (Discount #467 "30%-may-kampaniq",
  // #485 "35-may-kampaniq-2026", etc.). So we maintain a mirror of those
  // rules in `app/lib/active-discounts.ts` (sourced from Admin API,
  // refresh on a calendar trigger) and filter against that set.
  const url = new URL(request.url);
  const sort = url.searchParams.get('sort') ?? 'price-asc';
  const sortMap: Record<string, {sortKey?: string; reverse?: boolean}> = {
    'price-asc':   {sortKey: 'PRICE', reverse: false},
    'price-desc':  {sortKey: 'PRICE', reverse: true},
    'best-selling':{sortKey: 'BEST_SELLING', reverse: false},
    'created-desc':{sortKey: 'CREATED_AT', reverse: true},
  };
  const {sortKey, reverse} = sortMap[sort] ?? sortMap['price-asc'];

  const products = await ctx.storefront.getProductsPaginated({
    ...paginationVariables,
    sortKey,
    reverse,
  });

  // Apply enhanced images so the AI cards show up where available, then
  // keep only products with at least one currently-active auto-discount
  // targeting them in the real CloudCart admin (no synthetic fallback).
  const enhanced = enhanceProducts((products as any).nodes ?? []);
  const realDiscountIds = discountedProductIds();
  const discounted = enhanced.filter((p: any) => {
    // Prefer real Storefront-exposed discounts if/when CloudCart wires them
    if (p.discount?.msrpPrice) return true;
    if (p.variants?.nodes?.[0]?.compareAtPrice?.amount) return true;
    // Otherwise rely on the admin-API mirror
    const pidMatch = String(p.id).match(/Product\/(\d+)/);
    const numericId = pidMatch?.[1];
    return numericId ? realDiscountIds.has(numericId) : false;
  });

  // Sort by biggest discount first so the deepest deals lead (overrides
  // the CloudCart sort when the chosen sort is by price). Real discount
  // percent comes from `bestDiscountFor` (admin mirror).
  if (sort === 'price-asc' || sort === 'price-desc' || !sort) {
    discounted.sort((a: any, b: any) => {
      const pctA = a.discount?.percent ?? bestDiscountFor(a.id)?.percent ?? 0;
      const pctB = b.discount?.percent ?? bestDiscountFor(b.id)?.percent ?? 0;
      return pctB - pctA;
    });
  }

  return {
    products: {
      ...products,
      nodes: discounted,
      totalCount: discounted.length,
    },
  };
}

export default function PromotionsPage() {
  const {products} = useLoaderData<typeof loader>();
  const totalCount = (products as any).totalCount ?? 0;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentSort = searchParams.get('sort') ?? 'price-asc';

  function changeSort(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set('sort', value);
    else params.delete('sort');
    params.delete('cursor');
    params.delete('direction');
    navigate(`?${params.toString()}`, {preventScrollReset: true});
  }

  return (
    <div className="bb-promo-page">
      {/* Hero — pink gradient with active campaign callouts */}
      <header className="bb-promo-hero">
        <div className="bb-promo-hero-inner">
          <div className="bb-promo-hero-tag">
            <span className="bb-promo-hero-dot" />
            Активни промоции
          </div>
          <h1 className="bb-promo-hero-h1">
            Промоции на Bactology
            <br />
            <span className="bb-promo-hero-accent">— спести до 35%.</span>
          </h1>
          <p className="bb-promo-hero-sub">
            Сезонни оферти, пакетни отстъпки и кампании. Цените са вече намалени —
            никакъв код не е нужен.
          </p>

          <div className="bb-promo-hero-codes">
            <div className="bb-promo-hero-code">
              <div className="bb-promo-hero-code-pct">−30%</div>
              <div>
                <div className="bb-promo-hero-code-name">Май кампания 2025</div>
                <div className="bb-promo-hero-code-meta">Автоматично · до 30.06</div>
              </div>
            </div>
            <div className="bb-promo-hero-code">
              <div className="bb-promo-hero-code-pct">−10%</div>
              <div>
                <div className="bb-promo-hero-code-name">
                  Първа поръчка · код <code>WELCOME10</code>
                </div>
                <div className="bb-promo-hero-code-meta">Без минимална сума</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="bb-listing-toolbar">
        <div className="bb-listing-toolbar-info">
          <strong>{totalCount}</strong> промо{' '}
          {totalCount === 1 ? 'продукт' : 'продукта'}
        </div>
        <div className="bb-listing-sort">
          <label htmlFor="bb-promo-sort">Сортирай:</label>
          <select
            id="bb-promo-sort"
            className="bb-listing-sort-select"
            value={currentSort}
            onChange={(e) => changeSort(e.target.value)}
          >
            <option value="price-asc">Цена: ниска → висока</option>
            <option value="price-desc">Цена: висока → ниска</option>
            <option value="best-selling">Най-продавани</option>
            <option value="created-desc">Най-нови</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {totalCount === 0 ? (
        <div className="bb-listing-empty">
          <svg className="bb-listing-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 12h8M12 8v8" />
          </svg>
          <h3>В момента няма активни промоции</h3>
          <p>Запиши се за бюлетина ни и не пропускай следващата кампания.</p>
        </div>
      ) : (
        <Pagination connection={products}>
          {({nodes, NextLink, isLoading}) => (
            <div>
              <div className="bb-promo-grid">
                {nodes.map((p: any) => <PromoCard key={p.id} product={p} />)}
              </div>
              <NextLink className={`bb-listing-loadmore${isLoading ? ' loading' : ''}`}>
                {isLoading ? (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin">
                      <path d="M12 3a9 9 0 11-6.3 2.6" />
                    </svg>
                    Зареждам…
                  </>
                ) : (
                  <>
                    Зареди още промо продукти
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </>
                )}
              </NextLink>
            </div>
          )}
        </Pagination>
      )}

      {/* Trust strip */}
      <div className="bb-promo-trust">
        <div className="bb-promo-trust-pill">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="6" width="14" height="12" rx="2" />
            <path d="M17 10h3l1.5 3v5h-4.5" />
            <circle cx="7" cy="20" r="2" />
            <circle cx="17.5" cy="20" r="2" />
          </svg>
          <span>Безплатна доставка над <strong>50 лв</strong></span>
        </div>
        <div className="bb-promo-trust-pill">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3.5 2" />
          </svg>
          <span>Доставка <strong>24-48 часа</strong></span>
        </div>
        <div className="bb-promo-trust-pill">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l8 4v5c0 5-3.5 8.5-8 9.5C7.5 20.5 4 17 4 12V7l8-4z" />
            <path d="M9 12.5l2 2 4.5-4.5" />
          </svg>
          <span><strong>30-дневна</strong> гаранция връщане</span>
        </div>
      </div>
    </div>
  );
}

/** Promo-specific product card — bigger discount badge, EUR primary price. */
function PromoCard({product}: {product: any}) {
  const variant = product.variants?.nodes?.[0];
  const priceObj = variant?.price ?? product.priceRange?.minVariantPrice;
  // Real Storefront-exposed discount data if present
  let compareObj: any = variant?.compareAtPrice
    ?? product.discount?.msrpPrice
    ?? null;

  // Live (real) price the customer will be CHARGED at checkout —
  // CloudCart auto-applies the active discount engine, so this is
  // the post-discount amount the cart will reflect once integration
  // wires it through. For display, we compute the "msrp / was" price
  // by reversing the discount % from our admin-API mirror.
  const realDiscount = bestDiscountFor(product.id);

  const priceAmount = parseFloat(priceObj?.amount ?? '0');
  let displayPriceAmount = priceAmount;
  let compareAmount = compareObj ? parseFloat(compareObj.amount) : 0;
  let discountPct = isFinite(compareAmount) && compareAmount > priceAmount
    ? (product.discount?.percent ?? Math.round((1 - priceAmount / compareAmount) * 100))
    : 0;

  // When no Storefront discount data is present but admin-mirror says
  // there IS an active rule, derive sale + msrp from real percent.
  // Note: bulgarbiotic.bg shows the storefront `price` already as the
  // pre-discount amount, so sale = price × (1 − percent/100), msrp = price.
  if (!compareObj && realDiscount && priceAmount > 0) {
    discountPct = realDiscount.percent;
    compareAmount = priceAmount; // original
    displayPriceAmount = priceAmount * (1 - realDiscount.percent / 100);
  }

  const currency = (priceObj?.currencyCode ?? 'EUR') as 'EUR' | 'BGN';
  const eur = currency === 'EUR' ? displayPriceAmount : displayPriceAmount / EUR_TO_BGN;
  const bgn = currency === 'BGN' ? displayPriceAmount : displayPriceAmount * EUR_TO_BGN;
  const compareEur = currency === 'EUR' ? compareAmount : compareAmount / EUR_TO_BGN;
  const isOnSale = discountPct > 0 && compareAmount > displayPriceAmount;
  const savedEur = isOnSale ? compareEur - eur : 0;

  return (
    <Link
      to={`/product/${product.handle}`}
      className="bb-promo-card"
      prefetch="intent"
    >
      <div className="bb-promo-card-img">
        {product.featuredImage?.url ? (
          <Image data={product.featuredImage} alt={product.title} />
        ) : (
          <img src="/noimage.svg" alt={product.title} />
        )}
        {discountPct > 0 && (
          <span className="bb-promo-card-badge">−{discountPct}%</span>
        )}
      </div>
      <div className="bb-promo-card-body">
        <h3 className="bb-promo-card-title">{product.title}</h3>
        <div className="bb-promo-card-pricerow">
          <span className="bb-promo-card-now">{fmt(eur, 'EUR')}</span>
          <span className="bb-promo-card-bgn">{fmt(bgn, 'BGN')}</span>
          {isOnSale && compareEur > 0 && (
            <span className="bb-promo-card-old">{fmt(compareEur, 'EUR')}</span>
          )}
        </div>
        {isOnSale && savedEur > 0 && (
          <div className="bb-promo-card-saved">
            Спестяваш <strong>{fmt(savedEur, 'EUR')}</strong>
          </div>
        )}
      </div>
    </Link>
  );
}
