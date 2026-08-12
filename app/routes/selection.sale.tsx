import {useLoaderData, useSearchParams, useNavigate, Link} from 'react-router';
import type {Route} from './+types/selection.sale';
import {getContext} from '~/lib/context';
import {getSeoMeta, getPaginationVariables} from '@cloudcart/nitro';
import {Image} from '@cloudcart/nitro-react';
import {Pagination} from '~/components/Pagination';
import {ProductMarks} from '~/components/ProductMarks';
import {markPricing, markDiscount, setProductMarks} from '~/lib/product-marks';
import {DiscountCountdown} from '~/components/DiscountCountdown';
import {fetchProductMarks} from '~/lib/product-marks.server';
import {enhanceProducts} from '~/lib/product-images';
import {synthDiscount, discountPctFor} from '~/lib/active-promo';
import {activeDiscounts, bestDiscountFor, discountedProductIds, setAutoDiscounts, setFreeShippingOver, displayDiscountPercent} from '~/lib/active-discounts';
import {fetchAutoDiscounts} from '~/lib/live-discounts.server';
import {fetchBestSellers, orderByRealSales} from '~/lib/best-sellers.server';

const EUR_TO_BGN = 1.95583;
const fmt = (n: number, c: 'EUR' | 'BGN') =>
  new Intl.NumberFormat('bg-BG', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(n) +
  (c === 'EUR' ? ' €' : ' лв');

export const meta: Route.MetaFunction = ({data}) => {
  // The description used to promise a fixed 35 %; it now says whatever the
  // running campaigns actually give, and drops the claim when there is none.
  const pct = (data as any)?.maxDiscountPercent ?? 0;
  const savings = pct > 0 ? ` Спести до ${pct}% от любимите си продукти.` : '';
  return getSeoMeta({
    title: 'Промоции | Bactology — Български пробиотици на топ цени',
    description:
      'Активни промоции на Bactology пробиотици — пакетни оферти, отстъпки и сезонни кампании.' +
      savings,
  });
};

/**
 * Curated promotions page — replaces the broken /collections/promotions link.
 *
 * Fetches all products with `onSale: true` from the Storefront API (CloudCart
 * exposes this via the standard ProductFilter). Hero highlights the current
 * whatever campaigns are actually running (the hero figure is computed, not typed).
 * Each card shows a prominent discount % badge — sorted by biggest savings
 * first by default.
 */
export async function loader({context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  // Този loader чете правилата сам: route loader-ите вървят успоредно с root-а,
  // тоест не може да разчита, че живите данни вече са пристигнали. Без това
  // страницата тихо изброява огледалото.
  //
  // Каталожните марки се дърпат по същата причина. Те носят двойката цени за
  // всеки продукт, а тъкмо по нея се решава кой е в промоция - без тях на
  // студен worker филтърът пада обратно на правилата и пропуска отстъпките,
  // които не са процентни.
  const env = ctx.env as Record<string, string | undefined>;
  const [live, marks] = await Promise.all([fetchAutoDiscounts(env), fetchProductMarks(env)]);
  setAutoDiscounts(live?.discounts, live?.handles);
  setFreeShippingOver(live?.freeShippingOver);
  setProductMarks(marks);

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
    // 'best-selling' is handled below from the real order data, not by the API.
    'created-desc':{sortKey: 'CREATED_AT', reverse: true},
  };
  const {sortKey, reverse} = sortMap[sort] ?? sortMap['price-asc'];

  const products = await ctx.storefront.getProductsPaginated({
    ...paginationVariables,
    sortKey,
    reverse,
  });

  // Кой продукт е в промоция се решава от самите цени, не от вида на правилото.
  //
  // Дотук страницата разчиташе основно на огледалото от админа, а то познава
  // само правила от вид „процент". Правило от вид „фиксирана сума" не вкарваше
  // продукта тук, макар цената му на сайта вече да е намалена. Проверено на
  // живо 2026-08-12: `compareAtPriceRange` идва вярно и в списъчната заявка за
  // всеки вид правило, значи двойката цени е и по-точният, и по-простият
  // критерий - и работи без Admin токен.
  //
  // Огледалото остава само за допълване: то носи handle-ите на целените
  // продукти, тоест намира и такива извън първата страница по избраната
  // подредба.
  const enhanced = enhanceProducts((products as any).nodes ?? []);
  const realDiscountIds = discountedProductIds();
  const storeWide = activeDiscounts().some((d) => d.appliesToAll);
  const discounted = enhanced.filter((p: any) => {
    const {price, compareAtPrice} = markPricing(p);
    if (price && compareAtPrice && parseFloat(compareAtPrice.amount) > parseFloat(price.amount)) {
      return true;
    }
    if (storeWide) return true;
    const numericId = String(p.id).match(/Product\/(\d+)/)?.[1];
    return numericId ? realDiscountIds.has(numericId) : false;
  });

  // The page above is only the first 60 products by the chosen sort, so a
  // discounted product outside that window never made it onto the page. The
  // live discount data carries the handles of exactly the targeted products —
  // fetch those directly and merge, so the page is driven by the discounts
  // rather than by whatever happened to be on page one.
  const liveHandles = Object.values(live?.handles ?? {});
  if (liveHandles.length) {
    const seen = new Set(discounted.map((p: any) => String(p.id)));
    const fetched = await Promise.all(
      liveHandles.map((h) => ctx.storefront.getProduct(h).catch(() => null)),
    );
    for (const prod of enhanceProducts(fetched.filter(Boolean) as any[])) {
      if (!seen.has(String((prod as any).id))) {
        seen.add(String((prod as any).id));
        discounted.push(prod as any);
      }
    }
  }

  // Най-голямата отстъпка отпред. Процентът се извежда от цените, които картата
  // после печата - същият помощник, същото число. Правилото от админа остава
  // резерва за продукт, чиято двойка цени липсва в мига на зареждане.
  if (sort === 'price-asc' || sort === 'price-desc' || !sort) {
    const pct = (p: any) => {
      const {price, compareAtPrice} = markPricing(p);
      if (price && compareAtPrice) {
        return displayDiscountPercent(null, parseFloat(price.amount), parseFloat(compareAtPrice.amount));
      }
      return bestDiscountFor(p.id)?.percent ?? 0;
    };
    discounted.sort((a: any, b: any) => pct(b) - pct(a));
  }

  // "Най-продавани" means the same thing here as on the other listings: units
  // actually sold, from the merchant's order data.
  const nodes =
    sort === 'best-selling'
      ? orderByRealSales(
          discounted,
          await fetchBestSellers(ctx.env as Record<string, string | undefined>),
        )
      : discounted;

  return {
    products: {
      ...products,
      nodes,
      totalCount: nodes.length,
    },
    maxDiscountPercent: headlinePercent(nodes),
  };
}

/**
 * The "спести до X%" figure in the hero.
 *
 * Derived from the very prices the cards below print, through the same helper
 * the badges use — so the headline can never promise a discount no product
 * actually has. When the merchant switches a campaign off the products stop
 * carrying a "was" price, this drops with them, and the hero simply stops
 * making the claim (see the render).
 *
 * The rule percentages are only a fallback: `markPricing` leans on the shared
 * catalogue marks, and this loader runs in parallel with root's, so on a cold
 * worker the price pair can be missing for a beat.
 */
function headlinePercent(nodes: any[]): number {
  let fromPrices = 0;
  for (const product of nodes) {
    const {price, compareAtPrice} = markPricing(product);
    if (!price || !compareAtPrice) continue;
    const pct = displayDiscountPercent(
      null,
      parseFloat(price.amount),
      parseFloat(compareAtPrice.amount),
    );
    if (pct > fromPrices) fromPrices = pct;
  }
  if (fromPrices > 0) return fromPrices;

  const fromRules = activeDiscounts().reduce((best, d) => Math.max(best, d.percent ?? 0), 0);
  return Math.round(fromRules);
}

export default function PromotionsPage() {
  const {products, maxDiscountPercent} = useLoaderData<typeof loader>();
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
            {maxDiscountPercent > 0 && (
              <>
                <br />
                <span className="bb-promo-hero-accent">
                  спести до {maxDiscountPercent}%.
                </span>
              </>
            )}
          </h1>
          <p className="bb-promo-hero-sub">
            Сезонни оферти, пакетни отстъпки и кампании. Цените са вече намалени —
            никакъв код не е нужен.
          </p>
          {/* The two campaign chips that used to sit here named a fixed campaign
              and a promo code. Removed 2026-08-06: they went stale the moment a
              campaign changed, and nothing kept them honest. */}
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
          <span>Безплатна доставка над <strong>50 €</strong></span>
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
  // Both prices exactly as CloudCart reports them.
  //
  // 🛑 This block used to do `price × (1 − percent/100)` whenever the query gave
  // it no compare price — and the paginated listing fragment never does. The
  // catalogue price already has the promotion applied, so that turned a 17.67 €
  // product into 9.90 € on the card while the product page said 17.67 €.
  const {price: priceObj, compareAtPrice: compareObj} = markPricing(product);

  const priceAmount = parseFloat(priceObj?.amount ?? '0');
  const displayPriceAmount = priceAmount;
  const compareAmount = compareObj ? parseFloat(compareObj.amount) : 0;
  const discountPct = displayDiscountPercent(null, priceAmount, compareAmount);

  const currency = (priceObj?.currencyCode ?? 'EUR') as 'EUR' | 'BGN';
  const eur = currency === 'EUR' ? displayPriceAmount : displayPriceAmount / EUR_TO_BGN;
  const bgn = currency === 'BGN' ? displayPriceAmount : displayPriceAmount * EUR_TO_BGN;
  const compareEur = currency === 'EUR' ? compareAmount : compareAmount / EUR_TO_BGN;
  const isOnSale = discountPct > 0 && compareAmount > displayPriceAmount;
  // „Скрий цената на отстъпката" в панела: зачертаната цена и редът „Спестяваш"
  // отпадат, самата отстъпка остава.
  const hideOldPrice = markDiscount(product)?.hidePrice === true;
  const savedEur = isOnSale && !hideOldPrice ? compareEur - eur : 0;

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
        {/* Same badges as everywhere else. This page used to draw only its own
            discount pill, which is why the strains and Forbes marks were
            missing here while the category grid had them. */}
        <ProductMarks
          product={product}
          discountPct={discountPct}
          soldOut={product.availableForSale === false}
          size="md"
        />
      </div>
      <div className="bb-promo-card-body">
        <h3 className="bb-promo-card-title">{product.title}</h3>
        <div className="bb-promo-card-pricerow">
          <span className="bb-promo-card-now">{fmt(eur, 'EUR')}</span>
          <span className="bb-promo-card-bgn">{fmt(bgn, 'BGN')}</span>
          {isOnSale && compareEur > 0 && !hideOldPrice && (
            <span className="bb-promo-card-old">{fmt(compareEur, 'EUR')}</span>
          )}
        </div>
        <DiscountCountdown product={product} surface="listing" />
        {isOnSale && savedEur > 0 && (
          <div className="bb-promo-card-saved">
            Спестяваш <strong>{fmt(savedEur, 'EUR')}</strong>
          </div>
        )}
      </div>
    </Link>
  );
}
