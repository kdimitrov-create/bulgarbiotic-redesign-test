import {useLoaderData, data, Link} from 'react-router';
import type {Route} from './+types/category.$handle';
import {notFoundOrRedirect} from '~/lib/redirects';
import {makeSoft} from '~/lib/soft.server';
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
import {ListingBody} from '~/components/ListingBody';
import {KIDS_CAMPAIGN} from '~/components/MegaMenu';
import {DYSON_CAMPAIGN} from '~/lib/dyson-campaign';
import {categoryBannersFor} from '~/lib/category-banners';
import {getCollectionIntro} from '~/lib/collections-content';
import {enhanceProducts} from '~/lib/product-images';
import {markPricing} from '~/lib/product-marks';
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

/** Резервната стойност на четенето на продуктите: „не отговори", което е нещо
 * различно и от „няма такава категория" (null), и от „празна категория". */
const UNAVAILABLE = Symbol('category-unavailable');

export async function loader({params, context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const url = new URL(request.url);
  const paginationVariables = getPaginationVariables(request, {pageBy: PAGE_SIZE});
  // „Само промоции" се пресмята при нас, не от API-то.
  //
  // `{onSale: true}` на Storefront API-то познава само отстъпка, закачена за
  // самия продукт. Промоциите на този магазин са автоматични правила на ниво
  // поръчка, тоест филтърът връщаше ПРАЗЕН списък - чипът „Само промоции"
  // изпразваше страницата („Виж 0 продукта"), при все че магазинът върви с
  // активна кампания. Страницата „Промоции" отдавна не му вярва и гледа
  // цените; тук е същото: намален е продукт, чиято зачертана цена е по-висока
  // от текущата.
  const onSaleOnly = url.searchParams.get('onSale') === 'true';
  const filters = buildFiltersFromParams(url.searchParams).filter(
    (f: any) => !('onSale' in f),
  );
  const {sortKey, reverse} = buildSortFromParams(url.searchParams);
  // Default order = units actually sold. Needs the whole category in one call,
  // because the ranking is ours and the API cannot paginate by it.
  const salesOrder = isRealSalesOrder(url.searchParams);

  // Подредбата по цена е НАША.
  //
  // Storefront API-то не изпълнява `sortKey: PRICE` за колекции: „възходящо" и
  // „низходящо" връщат ЕДИН И СЪЩ ред, и той не е по цена (мерено на живо
  // 17.08.2026 - `TITLE` и `CREATED_AT` в същото време работят, значи не е от
  // подаването). Тоест две от седемте подредби в падащото меню не правеха нищо.
  //
  // Освен това клиентът подрежда по цената, която ВИЖДА, а тя тук е с приспадната
  // автоматична отстъпка и се смята при нас - API-то не я знае. Затова цялата
  // категория идва наведнъж и се подрежда тук, както става и при „най-продавани".
  const priceSort = url.searchParams.get('sort');
  const ownPriceOrder = priceSort === 'price-asc' || priceSort === 'price-desc';
  const pageVars = salesOrder || ownPriceOrder ? {first: 100} : paginationVariables;

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
      // Без филтри дотук се хвърляше нагоре, тоест посетителят получаваше
      // страница с грешка вместо категорията. Мерено 17.08 на четирима
      // едновременни посетители по двайсет адреса: една от 80 заявки падна
      // точно тук, на празен isolate. Един повторен опит след кратко изчакване
      // струва по-малко от една счупена категория - и се вижда в дневника,
      // за да не мине незабелязано.
      console.warn('[category loader] заявката се отказа, един повторен опит:', err);
      await new Promise((r) => setTimeout(r, 400));
      return ctx.storefront.getCollectionProductsPaginated(params.handle, {
        ...pageVars,
        sortKey,
        reverse,
        filters,
      });
    }
  };

  /* Останалите четения минават през `soft` - резервна стойност И краен срок.
   *
   * Подредбата по продажби е ПОДРАЗБИРАЩАТА се, тоест на всяко отваряне на
   * категория тръгват още две неща: цялата категория на страници
   * (`collectAllNodes`) и класацията от админското API. До 27.08.2026 нито
   * едното имаше защита - откажеше ли магазинът за миг, посетителят получаваше
   * „500 · Нещо се обърка" вместо категорията. Сега най-лошото е категория в
   * реда на API-то. */
  const soft = makeSoft('категория');

  /* ⚠️ Дотук ТОВА беше единственото четене на страницата без краен срок.
   *
   * Повторен опит имаше, но повторният опит лекува ОТКАЗ, не ВИСЕНЕ. Заспеше ли
   * заявката, `Promise.all` не се разрешаваше, SSR-ът не връщаше нищо и
   * Cloudflare убиваше зареждането - „500 · Нещо се обърка" или празно чакане,
   * докато всяка друга подредба на същия адрес отваряше за половин секунда
   * (мерено 02.09.2026). Причината беше в общия кеш и е поправена там, но
   * правилото важи само по себе си: НИТО ЕДНО четене не бива да може да свали
   * страница. Останалите на този loader отдавна минават през `soft`. */
  const [result, allCollections] = await Promise.all([
    soft('продуктите на категорията', fetchProducts(), UNAVAILABLE as any),
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

  /* Просрочване НЕ е „няма такава категория".
   *
   * Ако просроченото четене падне в същото `if`, посетителят и Google получават
   * 404 за страница, която съществува - а 404 се помни. Затова отделен, кратък
   * отказ с покана да се опита пак. */
  if ((result as unknown) === UNAVAILABLE) {
    throw data('Категорията не отговори навреме, опитайте пак', {
      status: 503,
      headers: {'Retry-After': '5'},
    });
  }

  if (!result) notFoundOrRedirect(request, 'Категорията не е намерена');

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
  const firstPageNodes = (result.products as any).nodes ?? [];
  const categoryNodes = salesOrder || ownPriceOrder
    ? await soft(
        'всички страници на категорията',
        collectAllNodes(result.products as any, (after) =>
          ctx.storefront
            .getCollectionProductsPaginated(params.handle, {first: 100, after, filters})
            .then((r: any) => r?.products ?? null),
        ),
        firstPageNodes,
      )
    : firstPageNodes;

  const everyNode = enhanceProducts([...categoryNodes, ...extraNodes]).filter((p: any) => {
    if (!onSaleOnly) return true;
    const {price, compareAtPrice} = markPricing(p);
    return Boolean(
      price && compareAtPrice && parseFloat(compareAtPrice.amount) > parseFloat(price.amount),
    );
  });
  let nodes = everyNode;
  let pageInfo = (result.products as any).pageInfo;

  // Pearls (and any category added to the set) lead with the standalone
  // products; the packages that contain them follow. Applied BEFORE paging so
  // the singles are on page one, not scattered across pages.
  const packageHandles = SINGLES_FIRST_CATEGORIES.has(params.handle)
    ? await soft('пакетите', fetchPackageHandles(ctx.storefront), null as Set<string> | null)
    : null;

  if (salesOrder) {
    // Без класацията подредбата е тази на API-то - `orderByRealSales` приема null.
    const sales = await soft(
      'класация по продажби',
      fetchBestSellers(ctx.env as Record<string, string | undefined>),
      null,
    );
    let ordered = orderByRealSales(everyNode, sales);
    if (packageHandles) ordered = singlesFirst(ordered, packageHandles);
    const slice = pageSlice(ordered, currentPage(url), PAGE_SIZE);
    nodes = slice.nodes;
    pageInfo = {...(pageInfo ?? {}), hasNextPage: slice.hasNextPage, hasPreviousPage: slice.hasPreviousPage};
  } else if (ownPriceOrder) {
    const shown = (p: any) => {
      const {price} = markPricing(p);
      const n = price ? parseFloat(price.amount) : NaN;
      return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
    };
    let ordered = [...everyNode].sort((a, b) =>
      priceSort === 'price-desc' ? shown(b) - shown(a) : shown(a) - shown(b),
    );
    if (packageHandles) ordered = singlesFirst(ordered, packageHandles);
    const slice = pageSlice(ordered, currentPage(url), PAGE_SIZE);
    nodes = slice.nodes;
    pageInfo = {...(pageInfo ?? {}), hasNextPage: slice.hasNextPage, hasPreviousPage: slice.hasPreviousPage};
  } else if (onSaleOnly) {
    // Пресятото е в ръцете ни, значи и страниците се режат тук - иначе
    // страничникът обещава следваща страница по броя ПРЕДИ пресяването.
    const ordered = packageHandles ? singlesFirst(everyNode, packageHandles) : everyNode;
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
    totalCount: onSaleOnly
      ? everyNode.length
      : ((result.products as any).totalCount ?? 0) + extraNodes.length,
  };

  return {
    collection: result.collection,
    products: productsWithEnhancement,
    collections,
    filterError,
    // Active facet filters present in the URL → page should be noindex,follow
    // (see meta above). Cursor pagination alone does NOT set this.
    isFiltered: filters.length > 0 || onSaleOnly,
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

      {/* Back to school: кампанийният банер влиза В колоната с продуктите -
          подравнен с картите, не с целия контейнер (клиент, 24.08). Пада сам
          с KIDS_CAMPAIGN.active = false. */}
      <ListingBody
        products={products}
        collections={collections as any[]}
        footer={
          <>
          {KIDS_CAMPAIGN.active && KIDS_CAMPAIGN.categoryBannerActive && col.handle === KIDS_CAMPAIGN.categoryHandle ? (
            <section className="bb-kids-banner" aria-label="Кампания Back to school">
              {/* Под 640px - портретният мобилен файл; иначе широкият. Размерите
                  са на източника и на img, за да не подскача решетката. */}
              <picture>
                <source
                  media="(max-width: 640px)"
                  srcSet={`${KIDS_CAMPAIGN.categoryBannerMobile}?format=webp`}
                  width={400}
                  height={550}
                />
                <img
                  src={`${KIDS_CAMPAIGN.categoryBanner}?format=webp&width=1600`}
                  width={1900}
                  height={800}
                  alt="Back to school - подарък раница при покупка на три детски продукта и томбола за детско колело"
                  loading="lazy"
                  onError={(e) => {
                    // Правилото за CDN-а: при 404 на вариант с размери - голият адрес
                    // (и без <source>, за да не се върти пак към счупения вариант).
                    const img = e.currentTarget as HTMLImageElement;
                    img.parentElement?.querySelectorAll('source').forEach((s) => s.remove());
                    img.src = window.innerWidth <= 640 ? KIDS_CAMPAIGN.categoryBannerMobile : KIDS_CAMPAIGN.categoryBanner;
                  }}
                />
              </picture>
            </section>
          ) : null}

          {/* Кампанията „1+1 + томбола Dyson": същото място и същата рамка
              под продуктите на „Пробиотици за жени" - клиентът поиска изрично
              „по подобие на Back to school". Пада с DYSON_CAMPAIGN.active. */}
          {DYSON_CAMPAIGN.active && DYSON_CAMPAIGN.showCategoryBanner && col.handle === DYSON_CAMPAIGN.categoryHandle ? (
            <section className="bb-campaign-banner" aria-label="Кампания 1+1 подарък">
              <picture>
                {/* Отделен портретен файл за телефон има само ако дизайнерът е
                    дал такъв; иначе широкият се ползва навсякъде. */}
                {DYSON_CAMPAIGN.categoryBannerMobile ? (
                  <source
                    media="(max-width: 640px)"
                    srcSet={DYSON_CAMPAIGN.categoryBannerMobile}
                  />
                ) : null}
                <img
                  src={`${DYSON_CAMPAIGN.categoryBanner}?format=webp&width=1640`}
                  width={DYSON_CAMPAIGN.bannerWidth}
                  height={DYSON_CAMPAIGN.bannerHeight}
                  alt={DYSON_CAMPAIGN.bannerAlt}
                  loading="lazy"
                  onError={(e) => {
                    // Правилото за CDN-а: при 404 на вариант с размери - голият
                    // адрес, и без <source>, за да не се върти пак към счупения.
                    const img = e.currentTarget as HTMLImageElement;
                    img.parentElement?.querySelectorAll('source').forEach((el) => el.remove());
                    img.src = DYSON_CAMPAIGN.categoryBanner;
                  }}
                />
              </picture>
            </section>
          ) : null}

          {/* Банерите на категорията (`category-banners.ts`): между „Зареди
              още продукти" и описанието - мястото, което клиентът посочи
              (12.10.2026). Под 640px - портретният мобилен файл. */}
          {categoryBannersFor(col.handle).map((banner) => (
            <section key={banner.desktop} className="bb-campaign-banner" aria-label={banner.alt}>
              <picture>
                <source
                  media="(max-width: 640px)"
                  type="image/webp"
                  srcSet={`${banner.mobile}.webp`}
                  width={banner.mobileWidth}
                  height={banner.mobileHeight}
                />
                <source
                  media="(max-width: 640px)"
                  srcSet={`${banner.mobile}.jpg`}
                  width={banner.mobileWidth}
                  height={banner.mobileHeight}
                />
                <source type="image/webp" srcSet={`${banner.desktop}.webp`} />
                <img
                  src={`${banner.desktop}.jpg`}
                  width={banner.desktopWidth}
                  height={banner.desktopHeight}
                  alt={banner.alt}
                  loading="lazy"
                  decoding="async"
                />
              </picture>
            </section>
          ))}

          {/* Описанието на категорията (полето „описание" в панела).
              Живее ТУК, вътре в колоната с продуктите, а не под решетката.
              Страничната лента с филтрите е по-висока от четирите карти и
              опъва реда; описанието под решетката започваше чак след нея и
              между банера и текста зееха ~430 празни пиксела (клиент, 01.09).
              Оттук текстът тръгва веднага след банера, а лентата си върви
              успоредно. */}
          {categoryCopy ? (
            <section className="max-w-3xl pt-8 pb-4">
              <div
                className="prose prose-sm prose-gray max-w-none [&_p]:my-3 [&_ul]:my-3 [&_li]:my-1 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:font-bold [&_h3]:mt-4"
                dangerouslySetInnerHTML={{__html: categoryCopy}}
              />
            </section>
          ) : null}
          </>
        }
      />

    </div>
  );
}
