import {useLoaderData, useSearchParams, useNavigate} from 'react-router';
import type {Route} from './+types/product._index';
import {getContext} from '~/lib/context';
import {getSeoMeta, getPaginationVariables} from '@cloudcart/nitro';
import {ProductCard} from '~/components/ProductCard';
import {ListingAside} from '~/components/ListingAside';
import {ActiveFilterChips} from '~/components/ActiveFilterChips';
import {Pagination} from '~/components/Pagination';
import {buildFiltersFromParams, buildSortFromParams} from '~/lib/filters';
import {enhanceProducts} from '~/lib/product-images';

export const meta: Route.MetaFunction = () =>
  getSeoMeta({
    title: 'Всички продукти | Bactology — Български пробиотици',
    description:
      'Разгледай всички пробиотични продукти на Bactology — 25+ научно проучени формули за червата, имунитета, женското здраве, децата и красотата. Произведено в България.',
  });

export async function loader({context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const url = new URL(request.url);
  const paginationVariables = getPaginationVariables(request, {pageBy: 12});
  const filters = buildFiltersFromParams(url.searchParams);
  const {sortKey, reverse} = buildSortFromParams(url.searchParams);

  const [products, collections] = await Promise.all([
    ctx.storefront.getProductsPaginated({
      ...paginationVariables,
      sortKey,
      reverse,
      filters,
    }),
    ctx.storefront.getCollections(8).catch(() => []),
  ]);

  // Apply AI-enhanced lifestyle photos for visual consistency across
  // every listing surface (matches homepage / sale / category cards).
  const productsWithEnhancement = {
    ...products,
    nodes: enhanceProducts((products as any).nodes ?? []),
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
            Намери своя — за червата, имунитета, женското здраве, децата и красотата.
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
      <ActiveFilterChips filters={filters} />

      {/* Toolbar above grid */}
      <div className="bb-listing-toolbar">
        <div className="bb-listing-toolbar-info">
          <strong>{totalCount}</strong>{' '}
          {totalCount === 1 ? 'продукт' : 'продукта'}
        </div>
        <div className="bb-listing-sort">
          <label htmlFor="bb-sort">Сортирай:</label>
          <select
            id="bb-sort"
            className="bb-listing-sort-select"
            value={currentSort}
            onChange={(e) => changeSort(e.target.value)}
          >
            <option value="">Препоръчани</option>
            <option value="best-selling">Най-продавани</option>
            <option value="created-desc">Най-нови</option>
            <option value="price-asc">Цена: ниска → висока</option>
            <option value="price-desc">Цена: висока → ниска</option>
            <option value="title-asc">Име: А → Я</option>
            <option value="title-desc">Име: Я → А</option>
          </select>
        </div>
      </div>

      {/* Sidebar (value-add: quiz + discovery + filters + trust) + grid */}
      <div className="grid gap-8 md:grid-cols-[260px_1fr] md:gap-10">
        <aside className="order-2 md:order-1">
          <ListingAside filters={filters} totalCount={totalCount} collections={collections} />
        </aside>

        <div className="order-1 md:order-2">
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
