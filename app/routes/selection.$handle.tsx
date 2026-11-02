import {useLoaderData, data} from 'react-router';
import type {Route} from './+types/selection.$handle';
import {getContext} from '~/lib/context';
import {getSeoMeta} from '@cloudcart/nitro';
import {Breadcrumbs} from '~/components/Breadcrumbs';
import {ListingBody} from '~/components/ListingBody';
import {enhanceProducts} from '~/lib/product-images';
import {markPricing, setProductMarks} from '~/lib/product-marks';
import {fetchProductMarks} from '~/lib/product-marks.server';
import {setAutoDiscounts, setFreeShippingOver} from '~/lib/active-discounts';
import {fetchAutoDiscounts} from '~/lib/live-discounts.server';
import {fetchBestSellers, orderByRealSales} from '~/lib/best-sellers.server';
import {fetchSmartCollection} from '~/lib/smart-collections.server';
import {useCcPage, useEcommerceEvent, numericId, setProductIds} from '~/lib/analytics';

/**
 * Умна колекция („селекция") - `/selection/{handle}`.
 *
 * Платформата сервира селекциите на този адрес и търговецът ги ползва в менюта,
 * банери и кампании. Дотук редизайнът имаше само `selection.sale.tsx` - една
 * ръчно написана страница „Промоции", която случайно седи на този път. Всичко
 * останало под `/selection/` падаше в catch-all-а и връщаше 404: на живо
 * 28.09.2026 три от четирите селекции на магазина бяха счупени - `imunitet`,
 * `perli` и `probiotici-za-otslabvane`.
 *
 * Съставът идва от Admin API-то (виж `smart-collections.server.ts`), защото
 * Storefront API-то не познава селекции. Самите продукти обаче се дърпат от
 * Storefront API-то по handle, за да носят истинските цени, наличности и
 * снимки - и за да минат през същата обработка като всеки друг листинг.
 *
 * ⚠️ `selection.sale.tsx` остава и има предимство: в маршрутизацията статичният
 * сегмент бие динамичния, тоест `/selection/sale` продължава да отваря ръчната
 * страница, а не тази.
 */

export const meta: Route.MetaFunction = ({data: d}) => {
  const c = d?.selection as any;
  if (!c) return getSeoMeta({title: 'Селекция | Bactology'});

  /* Панелът предварително попълва SEO полетата с името на селекцията, а не с
   * написан текст: и трите селекции на магазина вървят със `seoTitle` и
   * `seoDescription` равни на „Имунитет", „Перли", „Пробиотици за отслабване".
   * Такова заглавие е по-бедно от собственото ни, а описание от една дума е
   * по-лошо от никакво - затова стойност, която само повтаря името, се смята
   * за непопълнена. Напише ли търговецът истински текст, той бие нашия. */
  const same = (v: string | null | undefined) =>
    !v || v.trim().toLowerCase() === String(c.name).trim().toLowerCase();

  return getSeoMeta({
    title: same(c.seoTitle) ? `${c.name} | Bactology` : (c.seoTitle as string),
    description: same(c.seoDescription) ? c.description || undefined : (c.seoDescription as string),
  });
};

export async function loader({params, context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const env = ctx.env as Record<string, string | undefined>;
  const handle = params.handle as string;

  const selection = await fetchSmartCollection(env, handle);
  if (!selection) throw data('Селекцията не е намерена', {status: 404});

  /* Правилата и каталожните марки се четат тук, а не се чакат от root-а:
   * route loader-ите вървят успоредно с него, тоест на студен worker картите
   * щяха да се нарисуват без зачертана цена и без процент отстъпка. Същата
   * причина, поради която го прави и страницата „Промоции". */
  const [live, marks] = await Promise.all([fetchAutoDiscounts(env), fetchProductMarks(env)]);
  setAutoDiscounts(live?.discounts, live?.handles);
  setFreeShippingOver(live?.freeShippingOver);
  setProductMarks(marks);

  /* Продукт, който вече не се сервира на сайта (спрян, изтрит, скрит), се
   * проваля тихо и просто отпада от списъка - селекцията в панела може да е
   * по-стара от каталога. */
  const fetched = await Promise.all(
    selection.productHandles.map((h) => ctx.storefront.getProduct(h).catch(() => null)),
  );

  const url = new URL(request.url);
  let nodes = enhanceProducts((fetched.filter(Boolean) as any[]).map(withVariantStock));

  /* Бързите филтри от страничната колона се прилагат тук. Storefront API-то
   * не може да пресее селекция (то не я познава), но целият състав е в ръцете
   * ни - а селекциите са десетки продукта, не хиляди. Без това чиповете
   * „Само промоции" / „Ново" / „В наличност" щяха да се натискат напразно. */
  const onSale = url.searchParams.get('onSale') === 'true';
  const isNew = url.searchParams.get('isNew') === 'true';
  const isFeatured = url.searchParams.get('isFeatured') === 'true';
  const available = url.searchParams.get('available') === 'true';

  nodes = nodes.filter((p: any) => {
    if (available && p.availableForSale === false) return false;
    if (isNew && !p.isNew) return false;
    if (isFeatured && !p.isFeatured) return false;
    if (onSale) {
      // Намален е продукт, чиято зачертана цена е над текущата - същият
      // критерий като на „Промоции". Видът на правилото няма значение.
      const {price, compareAtPrice} = markPricing(p);
      if (
        !price ||
        !compareAtPrice ||
        parseFloat(compareAtPrice.amount) <= parseFloat(price.amount)
      ) {
        return false;
      }
    }
    return true;
  });

  const isFiltered = onSale || isNew || isFeatured || available;

  // Подредбата повтаря избора от лентата над списъка. По подразбиране - по
  // реално продадени бройки, както на категорийните страници.
  const sort = url.searchParams.get('sort') ?? '';
  const amount = (p: any) => parseFloat(p?.priceRange?.minVariantPrice?.amount ?? '0');
  const byTitle = (a: any, b: any) => String(a.title).localeCompare(String(b.title), 'bg');
  const created = (p: any) => new Date(p?.createdAt ?? 0).getTime();

  if (sort === 'store') {
    // Редът, в който панелът връща селекцията - изборът на търговеца.
  } else if (sort === 'price-asc') {
    nodes.sort((a: any, b: any) => amount(a) - amount(b));
  } else if (sort === 'price-desc') {
    nodes.sort((a: any, b: any) => amount(b) - amount(a));
  } else if (sort === 'created-desc') {
    nodes.sort((a: any, b: any) => created(b) - created(a));
  } else if (sort === 'title-asc') {
    nodes.sort(byTitle);
  } else if (sort === 'title-desc') {
    nodes.sort((a: any, b: any) => byTitle(b, a));
  } else {
    const sales = await fetchBestSellers(env);
    nodes = orderByRealSales(nodes, sales);
  }

  return {
    selection,
    /* Формата, която `ListingBody` чака. Цялата селекция е на една страница:
     * `filters` е празен, защото фасетите идват от Storefront API-то, а то не
     * може да брои по селекция - страничната колона тогава рисува бързите
     * филтри, навигацията и блока с гаранциите, което е и смисълът ѝ тук. */
    products: {
      nodes,
      filters: [],
      totalCount: nodes.length,
      pageInfo: {hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null},
    },
    collections: await ctx.storefront
      .getCollections(8)
      .then((cs: any[]) =>
        cs.map((c) => ({id: c.id, title: c.title, handle: c.handle, productsCount: c.productsCount})),
      )
      .catch(() => []),
    isFiltered,
  };
}

/**
 * Наличността, разчетена както я чете продуктовата страница.
 *
 * `isAvailable` иска `quantityAvailable`, за да различи „изключено проследяване"
 * (`null` → наличен) от „свършила наличност" (`0` → изчерпан). Полето обаче
 * съществува само върху ВАРИАНТ - на `Product` то не е в схемата, затова в
 * листингите винаги е `undefined` и всеки продукт с `availableForSale: false`
 * се рисува „Изчерпан". Точно това щеше да сполети „Пакет Имунитет": витрината
 * го връща `false`, защото проследяването му е изключено, а собствената му
 * страница го показва „В наличност" и позволява покупка.
 *
 * Тук продуктите идват от `getProduct`, тоест вариантите са налице - и
 * стойността просто се пренася нагоре, вместо картата да гадае.
 */
function withVariantStock(product: any) {
  if (product?.quantityAvailable !== undefined) return product;
  const variant = product?.variants?.nodes?.[0];
  if (!variant) return product;
  return {...product, quantityAvailable: variant.quantityAvailable ?? null};
}

export default function SelectionPage() {
  const {selection, products, collections} = useLoaderData<typeof loader>();
  const sel = selection as any;
  const totalCount = (products as any).totalCount ?? 0;

  const listItems = ((products as any).nodes ?? []).slice(0, 10).map((p: any, i: number) => ({
    item_id: numericId(p.id),
    item_name: p.title,
    item_category: sel.name,
    price: parseFloat(p.priceRange?.minVariantPrice?.amount ?? '0'),
    index: i,
    quantity: 1,
  }));
  // Картите в списъка също добавят в количката - без тази карта техният
  // `add_to_cart` тръгва с handle вместо с id.
  setProductIds(
    Object.fromEntries(
      ((products as any).nodes ?? []).map((p: any) => [p.handle, String(numericId(p.id))]),
    ),
  );
  useCcPage({
    type: 'category',
    id: numericId(sel.id),
    name: sel.name,
    url: `/selection/${sel.urlHandle}`,
  });
  useEcommerceEvent(
    'view_item_list',
    {
      currency: (products as any).nodes?.[0]?.priceRange?.minVariantPrice?.currencyCode ?? 'EUR',
      item_list_name: sel.name,
      items: listItems,
    },
    listItems.length > 0,
  );

  return (
    <div className="bb-listing">
      {/* „Начало" го слага самият компонент - тук върви само текущата страница. */}
      <Breadcrumbs items={[{title: sel.name}]} />

      <header className="bb-listing-hero">
        <div className="bb-listing-hero-text">
          <span className="bb-listing-hero-tag">Селекция</span>
          <h1 className="bb-listing-hero-h1">{sel.name}</h1>
        </div>
        <div className="bb-listing-hero-count" aria-label={`${totalCount} продукта в селекцията`}>
          <span className="bb-listing-hero-count-num">{totalCount}</span>
          <span className="bb-listing-hero-count-label">
            {totalCount === 1 ? 'продукт' : 'продукта'}
          </span>
        </div>
      </header>

      <ListingBody products={products} collections={collections as any[]} />

      {/* Текстът от полето „описание" на селекцията в панела, ако търговецът е
          попълнил такъв - същото поведение като при категориите. */}
      {sel.description && (
        <section className="max-w-3xl mx-auto px-5 py-10 md:py-14">
          <div
            className="prose prose-sm prose-gray max-w-none [&_p]:my-3 [&_ul]:my-3 [&_li]:my-1 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:font-bold [&_h3]:mt-4"
            dangerouslySetInnerHTML={{__html: sel.description}}
          />
        </section>
      )}
    </div>
  );
}
