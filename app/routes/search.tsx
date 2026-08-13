import {useLoaderData, useNavigate, useNavigation, useSearchParams} from 'react-router';
import {useCcPage, useEcommerceEvent, numericId} from '~/lib/analytics';
import {useEffect, useRef, useState, useCallback} from 'react';
import type {Route} from './+types/search';
import {getContext} from '~/lib/context';
import {getSeoMeta, getPaginationVariables} from '@cloudcart/nitro';
import {ListingBody} from './product._index';
import {MagnifyingGlassIcon, XMarkIcon} from '@heroicons/react/24/outline';
import {buildFiltersFromParams, buildSortFromParams} from '~/lib/filters';
import {enhanceProducts} from '~/lib/product-images';

// Same banner treatment as the category listings (matches /category/all-products).
const SEARCH_HERO_BG =
  'linear-gradient(135deg, rgba(245, 239, 227, 0.92), rgba(253, 238, 243, 0.85)), url(https://bulgarbiotic.bg/cdn/img/logo/4/4.svg?v=1777460513)';

export const meta: Route.MetaFunction = () => getSeoMeta({title: 'Търсене | Bactology'});

export async function loader({request, context}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const url = new URL(request.url);
  const q = url.searchParams.get('q') ?? '';

  if (!q) {
    const collections = await ctx.storefront.getCollections(8).catch(() => []);
    return {query: q, products: null, collections};
  }

  const paginationVariables = getPaginationVariables(request, {pageBy: 12});
  const filters = buildFiltersFromParams(url.searchParams);
  const {sortKey, reverse} = buildSortFromParams(url.searchParams);

  const [products, collections] = await Promise.all([
    ctx.storefront.getProductsPaginated({
      ...paginationVariables,
      sortKey,
      reverse,
      filters,
      query: q,
    }),
    ctx.storefront.getCollections(8).catch(() => []),
  ]);

  // Apply AI-enhanced lifestyle photos for visual consistency with the listings.
  const productsWithEnhancement = {
    ...products,
    nodes: enhanceProducts((products as any).nodes ?? []),
  };

  return {query: q, products: productsWithEnhancement, collections};
}

export default function SearchPage() {
  const {query, products, collections} = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const isSearching = navigation.state === 'loading';

  /* Измерване: търсене. Класическата тема праща `Search` с търсената дума;
   * без него Meta и TikTok не могат да строят аудитории по намерение. */
  useCcPage({type: 'search', name: query});
  useEcommerceEvent('search', {
    search_term: query,
    items: ((products as any)?.nodes ?? []).slice(0, 10).map((p: any, i: number) => ({
      item_id: numericId(p.id),
      item_name: p.title,
      index: i,
      quantity: 1,
    })),
  });

  // Input is fully local — never overwritten by URL/loader data.
  const [inputValue, setInputValue] = useState(query);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const performSearch = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams);
      params.delete('page');
      params.delete('cursor');
      params.delete('direction');
      if (value) params.set('q', value);
      else params.delete('q');
      navigate(`/search?${params.toString()}`, {replace: true, preventScrollReset: true});
    },
    [navigate, searchParams],
  );

  function handleInputChange(value: string) {
    setInputValue(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(value), 300);
  }

  function clearSearch() {
    setInputValue('');
    navigate('/search', {replace: true, preventScrollReset: true});
    inputRef.current?.focus();
  }

  const totalCount = (products as any)?.totalCount ?? products?.nodes?.length ?? 0;
  const hasResults = !!(products?.nodes && products.nodes.length > 0);

  return (
    <div className="bb-listing">
      {/* Hero banner — same look as the category listings */}
      <header
        className="bb-listing-hero"
        style={{backgroundImage: SEARCH_HERO_BG, backgroundSize: 'cover', backgroundPosition: 'center'}}
      >
        <div className="bb-listing-hero-text">
          <span className="bb-listing-hero-tag">Търсене</span>
          <h1 className="bb-listing-hero-h1">
            {query ? (
              <>
                Резултати за <span className="accent">„{query}"</span>
              </>
            ) : (
              <>
                Търси в <span className="accent">каталога.</span>
              </>
            )}
          </h1>

          {/* Live search input */}
          <div className="bb-search-hero-form">
            <MagnifyingGlassIcon className="bb-search-hero-icon" />
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Търси продукти, категории…"
              autoComplete="off"
              aria-label="Търсене"
            />
            {inputValue && (
              <button type="button" onClick={clearSearch} aria-label="Изчисти търсенето">
                <XMarkIcon className="size-5" />
              </button>
            )}
          </div>
        </div>

        <div className="bb-listing-hero-count" aria-label={`${totalCount} продукта`}>
          <span className="bb-listing-hero-count-num">{totalCount}</span>
          <span className="bb-listing-hero-count-label">
            {totalCount === 1 ? 'продукт' : 'продукта'}
          </span>
        </div>
      </header>

      {/* Results (same body as category listings) OR empty states */}
      {hasResults ? (
        <ListingBody products={products} collections={collections as any[]} />
      ) : query && products && !isSearching ? (
        <div className="bb-listing-empty">
          <svg className="bb-listing-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
          <h3>Не намерихме продукти за „{query}"</h3>
          <p>Опитай друга дума или разгледай всички продукти.</p>
        </div>
      ) : !query ? (
        <div className="bb-listing-empty">
          <svg className="bb-listing-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <h3>Започни да пишеш, за да търсиш</h3>
          <p>Търси из всички пробиотични продукти на Bactology.</p>
        </div>
      ) : null}

      <style>{`
        .bb-search-hero-form {
          display: flex; align-items: center; gap: 8px;
          margin-top: 18px;
          max-width: 460px;
          background: #fff;
          border: 1.5px solid rgba(10, 37, 64, 0.12);
          border-radius: 999px;
          padding: 6px 10px 6px 14px;
          box-shadow: 0 8px 24px -14px rgba(10, 37, 64, 0.35);
        }
        .bb-search-hero-form input {
          flex: 1;
          border: 0; outline: 0; background: transparent;
          font-family: inherit; font-size: 15px;
          color: var(--color-ink);
          padding: 8px 2px;
        }
        .bb-search-hero-form input::placeholder { color: rgba(10, 37, 64, 0.42); }
        .bb-search-hero-icon { width: 20px; height: 20px; color: var(--color-brand-pink); flex-shrink: 0; }
        .bb-search-hero-form button {
          display: inline-flex; align-items: center; justify-content: center;
          width: 32px; height: 32px; border: 0; cursor: pointer;
          background: var(--color-cream-2); color: var(--color-ink);
          border-radius: 999px; flex-shrink: 0;
          transition: background 0.15s, color 0.15s;
        }
        .bb-search-hero-form button:hover { background: var(--color-brand-pink); color: #fff; }
      `}</style>
    </div>
  );
}
