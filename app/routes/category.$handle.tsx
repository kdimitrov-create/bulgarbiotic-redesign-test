import {useLoaderData, data, Link} from 'react-router';
import type {Route} from './+types/category.$handle';
import {getContext} from '~/lib/context';
import {getSeoMeta, getPaginationVariables} from '@cloudcart/nitro';
import {Image} from '@cloudcart/nitro-react';
import {Breadcrumbs} from '~/components/Breadcrumbs';
import {buildFiltersFromParams, buildSortFromParams} from '~/lib/filters';
import {ListingBody} from './product._index';
import {getCollectionIntro} from '~/lib/collections-content';
import {enhanceProducts} from '~/lib/product-images';
import {CATEGORY_EXTRA_PRODUCTS} from '~/lib/category-extra-products';

export const meta: Route.MetaFunction = ({data: d}) => {
  const col = d?.collection as any;
  const seo = getSeoMeta({
    title: col?.seo?.title || (col ? `${col.title} | Bactology` : 'Категория | Bactology'),
    description: col?.seo?.description || col?.description,
  });
  // SEO: filtered/faceted category URLs (predefined filters in the menu, e.g.
  // "ФИЛТРИ: против газове") → noindex, follow — avoid indexing thin/duplicate
  // facet pages while still following their links. Plain category pages AND
  // cursor-paginated pages (page 2+) carry NO filter params, so they stay
  // indexable (index, follow by default).
  if (d?.isFiltered) {
    return [...seo, {name: 'robots', content: 'noindex, follow'}];
  }
  return seo;
};

export async function loader({params, context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const url = new URL(request.url);
  const paginationVariables = getPaginationVariables(request, {pageBy: 12});
  const filters = buildFiltersFromParams(url.searchParams);
  const {sortKey, reverse} = buildSortFromParams(url.searchParams);

  // Try with filters; if the Storefront API rejects an unknown tag/option
  // value (returns 500), gracefully retry without filters so the user lands
  // on the unfiltered category instead of a generic error page.
  // Captured so we can surface a non-blocking notice in the UI.
  let filterError = false;
  const fetchProducts = async () => {
    try {
      return await ctx.storefront.getCollectionProductsPaginated(params.handle, {
        ...paginationVariables,
        sortKey,
        reverse,
        filters,
      });
    } catch (err) {
      if (filters.length > 0) {
        filterError = true;
        console.warn('[category loader] filter failed, retrying without filters:', err);
        return ctx.storefront.getCollectionProductsPaginated(params.handle, {
          ...paginationVariables,
          sortKey,
          reverse,
        });
      }
      throw err;
    }
  };

  const [result, collections] = await Promise.all([
    fetchProducts(),
    ctx.storefront.getCollections(8).catch(() => []),
  ]);

  if (!result) throw data('Категорията не е намерена', {status: 404});

  // Redesign-only supplement: inject hand-picked extra products into specific
  // categories without editing the live store's collections. Only on the
  // unfiltered first page, appended after (and deduped against) the real ones.
  const extraHandles = CATEGORY_EXTRA_PRODUCTS[params.handle] ?? [];
  const isFirstPage = !url.searchParams.has('cursor') && !url.searchParams.has('page');
  let extraNodes: any[] = [];
  if (extraHandles.length > 0 && isFirstPage && filters.length === 0) {
    const existing = new Set(((result.products as any).nodes ?? []).map((n: any) => n.handle));
    const fetched = await Promise.all(
      extraHandles
        .filter((h) => !existing.has(h))
        .map((h) => ctx.storefront.getProduct(h).catch(() => null)),
    );
    extraNodes = fetched.filter(Boolean);
  }

  // Apply AI-enhanced lifestyle photos so every product card on listings
  // uses the same brand-consistent imagery as the homepage / sale page.
  const productsWithEnhancement = {
    ...result.products,
    nodes: enhanceProducts([...(((result.products as any).nodes) ?? []), ...extraNodes]),
    totalCount: ((result.products as any).totalCount ?? 0) + extraNodes.length,
  };

  return {
    collection: result.collection,
    products: productsWithEnhancement,
    collections,
    filterError,
    // Active facet filters present in the URL → page should be noindex,follow
    // (see meta above). Cursor pagination alone does NOT set this.
    isFiltered: filters.length > 0,
  };
}

export default function CollectionPage() {
  const {collection, products, collections} = useLoaderData<typeof loader>();
  const col = collection as any;

  // Build BG breadcrumb trail (skip current category since it's the page title)
  const breadcrumbItems = (col.breadcrumb ?? [])
    .filter((b: any) => b.handle !== col.handle)
    .map((b: any) => ({title: b.title, to: `/category/${b.handle}`}));
  breadcrumbItems.push({title: col.title});

  const children = col.children?.nodes ?? [];
  const showChildren = col.displayChildren && children.length > 0;
  const totalCount = (products as any).totalCount ?? 0;

  // Hand-written hero intro per handle. Falls back to nothing if unknown —
  // the long CloudCart description is reserved for the <meta> SEO tag only.
  const heroIntro = getCollectionIntro(col.handle);
  // Curated per-category banner overrides the CloudCart collection image.
  const heroBanner = heroIntro?.banner ?? col.image?.url;
  // Editable category copy (client #2): rendered from the CloudCart collection
  // "описание" field so the client can add/edit category text in the admin.
  const categoryCopy = col.descriptionHtml || col.description || '';

  return (
    <div className="bb-listing">
      <Breadcrumbs items={breadcrumbItems} />

      {/* Collection hero — uses real CloudCart image if available, falls back
          to brand gradient. Tag + title + short hand-written intro (not the
          SEO-stuffed collection.description). */}
      <header className="bb-listing-hero" style={heroBanner ? {
        backgroundImage: `linear-gradient(135deg, rgba(245, 239, 227, 0.92), rgba(253, 238, 243, 0.85)), url(${heroBanner})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      } : undefined}>
        <div className="bb-listing-hero-text">
          <span className="bb-listing-hero-tag">{heroIntro?.tag ?? 'Категория'}</span>
          <h1 className="bb-listing-hero-h1">{collection.title}</h1>
          {heroIntro?.intro && (
            <p className="bb-listing-hero-sub">{heroIntro.intro}</p>
          )}
        </div>
        <div className="bb-listing-hero-count" aria-label={`${totalCount} продукта в категорията`}>
          <span className="bb-listing-hero-count-num">{totalCount}</span>
          <span className="bb-listing-hero-count-label">
            {totalCount === 1 ? 'продукт' : 'продукта'}
          </span>
        </div>
      </header>

      {/* Subcategories — horizontal scrolling pills */}
      {showChildren && (
        <div className="bb-listing-subcats" aria-label="Подкатегории">
          {children.map((child: any) => (
            <Link
              key={child.id}
              to={`/category/${child.handle}`}
              className="bb-listing-subcat"
              prefetch="intent"
            >
              {child.image?.url ? (
                <Image data={child.image} alt={child.title} className="bb-listing-subcat-img" />
              ) : (
                <img src="/noimage.svg" alt={child.title} className="bb-listing-subcat-img" />
              )}
              <span>{child.title}</span>
              {child.productsCount != null && (
                <span className="bb-listing-subcat-count">{child.productsCount}</span>
              )}
            </Link>
          ))}
        </div>
      )}

      <ListingBody products={products} collections={collections as any[]} />

      {/* Editable category text from the CloudCart "описание" field (client #2). */}
      {categoryCopy && (
        <section className="max-w-3xl mx-auto px-5 py-10 md:py-14">
          <div
            className="prose prose-sm prose-gray max-w-none [&_p]:my-3 [&_ul]:my-3 [&_li]:my-1 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:font-bold [&_h3]:mt-4"
            dangerouslySetInnerHTML={{__html: categoryCopy}}
          />
        </section>
      )}
    </div>
  );
}
