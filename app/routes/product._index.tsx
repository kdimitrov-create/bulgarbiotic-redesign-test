import {useLoaderData, useSearchParams, useNavigate} from 'react-router';
import {useEffect, useState} from 'react';
import type {Route} from './+types/product._index';
import {getContext} from '~/lib/context';
import {getSeoMeta, getPaginationVariables} from '@cloudcart/nitro';
import {ProductCard} from '~/components/ProductCard';
import {ListingAside} from '~/components/ListingAside';
import {ActiveFilterChips} from '~/components/ActiveFilterChips';
import {Pagination} from '~/components/Pagination';
import {
  buildFiltersFromParams,
  buildSortFromParams,
  currentPage,
  isRealSalesOrder,
} from '~/lib/filters';
import {
  collectAllNodes,
  fetchBestSellers,
  orderByRealSales,
  pageSlice,
} from '~/lib/best-sellers.server';
import {enhanceProducts} from '~/lib/product-images';

export const meta: Route.MetaFunction = () =>
  getSeoMeta({
    title: 'Всички продукти | Bactology - Български пробиотици',
    description:
      'Разгледай всички пробиотични продукти на Bactology - 25+ научно проучени формули за червата, имунитета, женското здраве, децата и красотата. Произведено в България.',
  });

const PAGE_SIZE = 12;

export async function loader({context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const url = new URL(request.url);
  const paginationVariables = getPaginationVariables(request, {pageBy: PAGE_SIZE});
  const filters = buildFiltersFromParams(url.searchParams);
  const {sortKey, reverse} = buildSortFromParams(url.searchParams);
  const salesOrder = isRealSalesOrder(url.searchParams);

  // Ranking by real sales cannot be delegated to the API, so the whole (small)
  // catalogue is fetched once and paginated here — otherwise page 1 would only
  // ever be the API's own first 12 products, re-sorted among themselves.
  const [products, collections] = await Promise.all([
    ctx.storefront.getProductsPaginated(
      salesOrder
        ? {first: 100, filters}
        : {...paginationVariables, sortKey, reverse, filters},
    ),
    ctx.storefront.getCollections(8).catch(() => []),
  ]);

  // Never mutate the connection: the storefront client caches the very object it
  // returns, so writing the page slice back into it served the next request a
  // catalogue of 12 — which is what emptied page 2. Always build a new one.
  let listing: any = products;

  if (salesOrder) {
    const [sales, allNodes] = await Promise.all([
      fetchBestSellers(ctx.env as Record<string, string | undefined>),
      collectAllNodes(products as any, (after) =>
        ctx.storefront.getProductsPaginated({first: 100, after, filters}) as any,
      ),
    ]);
    const slice = pageSlice(orderByRealSales(allNodes, sales), currentPage(url), PAGE_SIZE);
    listing = {
      ...(products as any),
      nodes: slice.nodes,
      pageInfo: {
        ...((products as any).pageInfo ?? {}),
        hasNextPage: slice.hasNextPage,
        hasPreviousPage: slice.hasPreviousPage,
      },
    };
  }

  // Apply AI-enhanced lifestyle photos for visual consistency across
  // every listing surface (matches homepage / sale / category cards).
  const productsWithEnhancement = {
    ...listing,
    nodes: enhanceProducts(listing.nodes ?? []),
  };

  return {products: productsWithEnhancement, collections};
}

export default function ProductsIndex() {
  const {products, collections} = useLoaderData<typeof loader>();
  const totalCount = (products as any).totalCount ?? 0;

  return (
    <div className="bb-listing">
      {/* Hero */}
      <header className="bb-listing-hero">
        <div className="bb-listing-hero-text">
          <span className="bb-listing-hero-tag">Каталог</span>
          <h1 className="bb-listing-hero-h1">
            Всички <span className="accent">пробиотици.</span>
          </h1>
          <p className="bb-listing-hero-sub">
            25+ научно проучени формули с автентичен Lactobacillus bulgaricus.
            Намери своя - за червата, имунитета, женското здраве, децата и красотата.
          </p>
        </div>
        <div className="bb-listing-hero-count" aria-label={`${totalCount} продукта в каталога`}>
          <span className="bb-listing-hero-count-num">{totalCount}</span>
          <span className="bb-listing-hero-count-label">
            {totalCount === 1 ? 'продукт' : 'продукта'}
          </span>
        </div>
      </header>

      <ListingBody products={products} collections={collections as any[]} />
    </div>
  );
}

/** Shared body — extracted so /collections/$handle can reuse it without
 *  duplicating the toolbar / chips / grid / load-more logic. */
export function ListingBody({products, collections}: {products: any; collections?: any[]}) {
  const filters = (products as any).filters ?? [];
  const totalCount = (products as any).totalCount ?? 0;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentSort = searchParams.get('sort') ?? '';
  /* Филтрите на телефон са в изскачащ панел, не под продуктите.
   *
   * Досега страничната колона беше `order-2`, тоест на телефон падаше ПОД
   * всички карти: за да стигне до нея, купувачът трябваше да превърти целия
   * списък - точно нещата, които търси, стояха най-накрая. Сега над списъка
   * има бутон „Филтри", а панелът се отваря на цял екран. */
  const [filtersOpen, setFiltersOpen] = useState(false);
  /* Колко филтъра са включени - числото в бутона.
   *
   * Броят се САМО познатите филтърни ключове (същите, които чете
   * `buildFiltersFromParams`). Ако вместо това се броеше всичко освен
   * сортирането, всеки чужд параметър в адреса щеше да се брои за филтър -
   * `utm_source`, `fbclid`, `gclid` от реклама - и посетител, дошъл от обява,
   * щеше да вижда „Филтри 2", без да е пипал нищо. */
  const FILTER_KEYS = ['available', 'minPrice', 'maxPrice', 'vendor', 'tag', 'onSale', 'isNew', 'isFeatured', 'category'];
  const activeFilterCount = [...searchParams.entries()].filter(
    ([k, v]) =>
      !!v && (FILTER_KEYS.includes(k) || k.startsWith('option_') || k.startsWith('prop_') || k.startsWith('brand_')),
  ).length;

  // Панелът заключва фона, докато е отворен, и се затваря с Esc.
  useEffect(() => {
    if (!filtersOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFiltersOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [filtersOpen]);

  function changeSort(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set('sort', value);
    else params.delete('sort');
    params.delete('cursor');
    params.delete('direction');
    navigate(`?${params.toString()}`, {preventScrollReset: true});
  }

  return (
    <>
      {/* Toolbar above grid */}
      <div className="bb-listing-toolbar">
        <div className="bb-listing-toolbar-info">
          <strong>{totalCount}</strong>{' '}
          {totalCount === 1 ? 'продукт' : 'продукта'}
        </div>
        {/* Само на телефон и таблет - на широк екран колоната е винаги видима. */}
        <button
          type="button"
          className="bb-filters-open"
          onClick={() => setFiltersOpen(true)}
          aria-expanded={filtersOpen}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="7" y1="12" x2="17" y2="12" />
            <line x1="10" y1="17" x2="14" y2="17" />
          </svg>
          Филтри
          {activeFilterCount > 0 && <span className="bb-filters-open-count">{activeFilterCount}</span>}
        </button>
        <div className="bb-listing-sort">
          <label htmlFor="bb-sort">Сортирай:</label>
          <select
            id="bb-sort"
            className="bb-listing-sort-select"
            value={currentSort}
            onChange={(e) => changeSort(e.target.value)}
          >
            {/* Default = ranked by units actually sold (admin order data). */}
            <option value="">Най-продавани</option>
            <option value="store">Ред на магазина</option>
            <option value="created-desc">Най-нови</option>
            <option value="price-asc">Цена: ниска → висока</option>
            <option value="price-desc">Цена: висока → ниска</option>
            <option value="title-asc">Име: А → Я</option>
            <option value="title-desc">Име: Я → А</option>
          </select>
        </div>
      </div>

      {/* Включените филтри стоят точно под лентата със сортирането и „Филтри",
          за да се махне някой с едно докосване - без панелът да се отваря пак.
          Дотук този ред стоеше НАД лентата и оставаше незабелязан. */}
      <ActiveFilterChips filters={filters} />

      {/* Sidebar (value-add: quiz + discovery + filters + trust) + grid */}
      {/* Колоната с филтрите се появява от 1024px нагоре - под тази ширина тя е
          панел (виж `.bb-filters-aside`), затова решетката там е една колона,
          вместо да пази празно място за нещо, което го няма в потока. */}
      <div className="grid gap-8 lg:grid-cols-[260px_1fr] lg:gap-10">
        {/* Един и същ списък с филтри в двата режима: на широк екран е колона
            вляво, на телефон - панел на цял екран. Няма втори препис, който
            после да се разминава. */}
        <div
          className={`bb-filters-scrim${filtersOpen ? ' is-open' : ''}`}
          onClick={() => setFiltersOpen(false)}
          aria-hidden="true"
        />
        <aside className={`bb-filters-aside order-2 lg:order-1${filtersOpen ? ' is-open' : ''}`}>
          <div className="bb-filters-sheet-head">
            <strong>Филтри</strong>
            <button type="button" onClick={() => setFiltersOpen(false)} aria-label="Затвори филтрите">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <div className="bb-filters-sheet-body">
            {/* Същият преглед и вътре в панела: отваряйки го, купувачът първо
                вижда какво вече е избрал. На широк екран не се рисува - там
                редът с етикетите стои под лентата над списъка. */}
            <div className="bb-filters-sheet-chips">
              <ActiveFilterChips filters={filters} />
            </div>
            <ListingAside filters={filters} totalCount={totalCount} collections={collections} />
          </div>
          <div className="bb-filters-sheet-foot">
            <button type="button" className="bb-filters-apply" onClick={() => setFiltersOpen(false)}>
              Виж {totalCount} {totalCount === 1 ? 'продукт' : 'продукта'}
            </button>
          </div>
        </aside>

        <div className="order-1 lg:order-2">
          {totalCount === 0 ? (
            <div className="bb-listing-empty">
              <svg className="bb-listing-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
              <h3>Не намерихме продукти</h3>
              <p>Опитай да изчистиш филтрите или промени критериите.</p>
            </div>
          ) : (
            <Pagination connection={products}>
              {({nodes, NextLink, isLoading}) => (
                <div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                    {nodes.map((product: any) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
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
                        Зареди още продукти
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
        </div>
      </div>
    </>
  );
}
