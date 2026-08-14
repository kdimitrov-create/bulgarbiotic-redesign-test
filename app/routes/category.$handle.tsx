import {useLoaderData, data, Link} from 'react-router';
import type {Route} from './+types/category.$handle';
import {getContext} from '~/lib/context';
import {getSeoMeta, getPaginationVariables} from '@cloudcart/nitro';
import {Image} from '@cloudcart/nitro-react';
import {Breadcrumbs} from '~/components/Breadcrumbs';
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
import {ListingBody} from './product._index';
import {getCollectionIntro} from '~/lib/collections-content';
import {enhanceProducts} from '~/lib/product-images';
import {CATEGORY_EXTRA_PRODUCTS} from '~/lib/category-extra-products';
import {useCcPage, useEcommerceEvent, numericId, setProductIds} from '~/lib/analytics';
import {
  SINGLES_FIRST_CATEGORIES,
  fetchPackageHandles,
  singlesFirst,
} from '~/lib/singles-first.server';

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

const PAGE_SIZE = 12;

export async function loader(args: Route.LoaderArgs) {
  /* Причината за 500-ците, видяна на живо (14.08): магазинът отговаря
   * „429 Too Many Requests", когато няколко страници се рисуват наведнъж.
   * Записва се в конзолата с истинското си име - в производство React Router
   * подменя съобщението с „Unexpected Server Error" и иначе не се разбира
   * какво се е счупило. */
  try {
    return await categoryLoader(args);
  } catch (error) {
    console.error(
      'category loader: %s - %s',
      (error as Error)?.name ?? 'Error',
      (error as Error)?.message ?? String(error),
    );
    throw error;
  }
}

async function categoryLoader({params, context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const url = new URL(request.url);
  const paginationVariables = getPaginationVariables(request, {pageBy: PAGE_SIZE});
  const filters = buildFiltersFromParams(url.searchParams);
  const {sortKey, reverse} = buildSortFromParams(url.searchParams);
  // Default order = units actually sold. Needs the whole category in one call,
  // because the ranking is ours and the API cannot paginate by it.
  const salesOrder = isRealSalesOrder(url.searchParams);
  const pageVars = salesOrder ? {first: 100} : paginationVariables;

  // Try with filters; if the Storefront API rejects an unknown tag/option
  // value (returns 500), gracefully retry without filters so the user lands
  // on the unfiltered category instead of a generic error page.
  // Captured so we can surface a non-blocking notice in the UI.
  let filterError = false;
  const fetchProducts = async () => {
    try {
      return await ctx.storefront.getCollectionProductsPaginated(params.handle, {
        ...pageVars,
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

  const [result, allCollections] = await Promise.all([
    fetchProducts(),
    ctx.storefront.getCollections(8).catch(() => []),
  ]);

  /* Страничното меню ползва точно четири полета - и това е всичко, което
   * заминава към браузъра.
   *
   * ⚠️ Мереното е грубо: описанията на осемте колекции тежат ~44 KB и до днес
   * пътуваха с ВСЯКА категорийна страница. Тоест страницата за „перли" носеше
   * в кода си текста на „за деца", „за жени", „за отслабване" и така нататък.
   * Освен килограмите, това е и вътрешно дублирано съдържание - едни и същи
   * абзаци на седем адреса, което размива темата на всяка от тях.
   * `collections-content.ts` го казва направо: описанието на колекция е
   * „almost always a 2-10 KB SEO-stuffed" текст. Нищо от него не се рисува тук.
   */
  const collections = (allCollections as any[]).map((c) => ({
    id: c.id,
    title: c.title,
    handle: c.handle,
    productsCount: c.productsCount,
  }));

  if (!result) throw data('Категорията не е намерена', {status: 404});

  // Redesign-only supplement: inject hand-picked extra products into specific
  // categories without editing the live store's collections. Only on the
  // unfiltered first page, appended after (and deduped against) the real ones.
  // With the sales ordering the whole category is in hand, so the extras have to
  // be present on every page — they are ranked with the rest, not pinned last.
  const extraHandles = CATEGORY_EXTRA_PRODUCTS[params.handle] ?? [];
  const isFirstPage = !url.searchParams.has('cursor') && !url.searchParams.has('page');
  let extraNodes: any[] = [];
  if (extraHandles.length > 0 && (salesOrder || isFirstPage) && filters.length === 0) {
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
  // In sales order the whole category is ranked, so every page of it is needed
  // up front — the API caps a single request well below `first: 100`.
  const categoryNodes = salesOrder
    ? await collectAllNodes(result.products as any, (after) =>
        ctx.storefront
          .getCollectionProductsPaginated(params.handle, {first: 100, after, filters})
          .then((r: any) => r?.products ?? null),
      )
    : ((result.products as any).nodes ?? []);

  const everyNode = enhanceProducts([...categoryNodes, ...extraNodes]);
  let nodes = everyNode;
  let pageInfo = (result.products as any).pageInfo;

  // Pearls (and any category added to the set) lead with the standalone
  // products; the packages that contain them follow. Applied BEFORE paging so
  // the singles are on page one, not scattered across pages.
  const packageHandles = SINGLES_FIRST_CATEGORIES.has(params.handle)
    ? await fetchPackageHandles(ctx.storefront)
    : null;

  if (salesOrder) {
    const sales = await fetchBestSellers(ctx.env as Record<string, string | undefined>);
    let ordered = orderByRealSales(everyNode, sales);
    if (packageHandles) ordered = singlesFirst(ordered, packageHandles);
    const slice = pageSlice(ordered, currentPage(url), PAGE_SIZE);
    nodes = slice.nodes;
    pageInfo = {...(pageInfo ?? {}), hasNextPage: slice.hasNextPage, hasPreviousPage: slice.hasPreviousPage};
  } else if (packageHandles) {
    nodes = singlesFirst(everyNode, packageHandles);
  }

  const productsWithEnhancement = {
    ...result.products,
    nodes,
    pageInfo,
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

  /* Измерване: категория. Класическата тема праща тук `ViewContent` с
   * `content_type: product_group`. Подаваме първите продукти от листинга -
   * толкова, колкото носи и оригиналът, без да пълним заявката с целия каталог. */
  const listItems = ((products as any).nodes ?? []).slice(0, 10).map((p: any, i: number) => ({
    item_id: numericId(p.id),
    item_name: p.title,
    item_category: col.title,
    price: parseFloat(p.priceRange?.minVariantPrice?.amount ?? '0'),
    index: i,
    quantity: 1,
  }));
  // Картите в листинга също добавят в количката - без тази карта техният
  // `add_to_cart` щеше да тръгне с handle вместо с id.
  setProductIds(Object.fromEntries(
    ((products as any).nodes ?? []).map((p: any) => [p.handle, String(numericId(p.id))]),
  ));
  useCcPage({type: 'category', id: numericId(col.id), name: col.title, url: `/category/${col.handle}`});
  useEcommerceEvent(
    'view_item_list',
    {
      currency: (products as any).nodes?.[0]?.priceRange?.minVariantPrice?.currencyCode ?? 'EUR',
      item_list_name: col.title,
      items: listItems,
    },
    listItems.length > 0,
  );

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
