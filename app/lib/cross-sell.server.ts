import {adminGql, adminListAll, adminOrigin, adminPat} from './admin-api.server';
import {fetchConfigBundle} from './config-bundle.server';
import {envValue} from './env.server';
import {cdnResize} from './product-images';
import {fmtEur, type CrossSellOffer, type CrossSellProduct} from './cross-sell';

/**
 * Кръстосаните оферти с изскачащ прозорец: коя да излезе и с какви продукти.
 *
 * Два входа:
 *   • `findPopupOffer` - живата витрина, след добавяне в количката;
 *   • `loadOfferPreview` - бутонът „Преглед" в панела, една оферта по номер,
 *     каквото и да е състоянието ѝ.
 *
 * Сумите в панела са в стотинки, както навсякъде: 1500 = 15,00 €, а 2000 при
 * процентна отстъпка = 20 %.
 *
 * SERVER ONLY - PAT-ът не бива да стига до браузъра.
 */

/** Плоските полета от списъка. Подробностите (условия, продукти) идват само от
 *  заявката за един запис - списъкът ги връща празни. */
const LIST_FIELDS = 'id name status sandbox event displayType activeFrom activeTo';

const DETAIL_FIELDS = `id offerTitle name description status sandbox event displayType
  type discountType discountPercent freeShipping freeProducts
  productsLimit hideOutOfStock hideCartProducts allMatch maxUserViews activeFrom activeTo
  background textColor buttonName cancelButtonName buttonBackground buttonTextColor popupEffect
  targets { action itemId itemType itemName comparison amount }
  actions { itemId itemType itemName }`;

interface ListRow {
  id: string;
  name: string;
  status: number;
  sandbox?: boolean;
  event: string | null;
  displayType?: string | null;
  activeFrom: string | null;
  activeTo: string | null;
}

interface Target {
  action: string | null;
  itemId: string | null;
  itemType: string | null;
  itemName: string | null;
  comparison: string | null;
  amount: number | null;
}

interface Detail extends ListRow {
  maxUserViews: number | null;
  offerTitle: string | null;
  description: string | null;
  type: string | null;
  discountType: string | null;
  discountPercent: number | null;
  freeShipping: boolean;
  freeProducts: boolean;
  productsLimit: number | null;
  hideOutOfStock: boolean;
  hideCartProducts: boolean;
  allMatch: boolean;
  background: string | null;
  textColor: string | null;
  buttonName: string | null;
  cancelButtonName: string | null;
  buttonBackground: string | null;
  buttonTextColor: string | null;
  popupEffect: string | null;
  targets: Target[] | null;
  actions: Array<{itemId: string | null; itemType: string | null; itemName: string | null}> | null;
}

/** Само такива оферти рисува Nitrogen. Останалите събития са на касата на
 *  платформата (`checkout*`) или на скрипта на класическата тема (`cart`). */
export function isNitrogenPopup(o: {event?: string | null; displayType?: string | null}): boolean {
  return o.event === 'add_to_cart' && o.displayType === 'popup';
}

export function isRunning(from: string | null, to: string | null, now = Date.now()): boolean {
  if (from && Date.parse(from) > now) return false;
  if (to && Date.parse(to) < now) return false;
  return true;
}

/* ─── Живата витрина ─────────────────────────────────────────────────── */

export async function findPopupOffer(
  env: Record<string, string | undefined>,
  input: {
    handle: string;
    cartHandles: string[];
    subtotal: number;
    views: Record<string, number>;
    cancelled: Set<string>;
    sandbox: boolean;
  },
): Promise<CrossSellOffer | null> {
  const origin = adminOrigin(env);
  const pat = adminPat(env);
  if (!origin || !pat) return null;

  /* Списъкът идва от общия пакет с настройките - тоест без своя заявка. Днес
   * в магазина няма нито една активна такава оферта, затова този път трябва да
   * свършва тук, без да пита нищо повече. */
  const bundle = await fetchConfigBundle(env).catch(() => null);
  const rows: ListRow[] = bundle
    ? (bundle.crossSells as ListRow[])
    : await adminListAll<ListRow>(origin, pat, {
        root: 'crossSells',
        nodeFields: LIST_FIELDS,
        label: 'cross-sell/popup',
      });

  const candidates = rows.filter((r) => {
    if (r.status !== 1 || !isNitrogenPopup(r) || !isRunning(r.activeFrom, r.activeTo)) return false;
    if (r.sandbox && !input.sandbox) return false;
    return !input.cancelled.has(String(r.id));
  });
  if (!candidates.length) return null;

  /* Таванът на показванията идва чак с подробностите: `maxUserViews` в
   * списъка гърми (виж `config-bundle.server.ts`). 0 и празно значат „без
   * таван", не „нула показвания". */
  const details = (
    await fetchDetails(origin, pat, candidates.map((c) => String(c.id)), 'CrossSellPopupDetails')
  ).filter((d) => {
    const cap = Number(d.maxUserViews) || 0;
    return !cap || (Number(input.views[String(d.id)]) || 0) < cap;
  });
  const trigger = await storefrontTrigger(env, input.handle);
  if (!trigger) return null;

  // Няколко съвпаднали оферти - платформата избира на случаен принцип.
  const matched = shuffle(details.filter((d) => targetsMatch(d, trigger, input.subtotal)));
  for (const offer of matched) {
    const products = await resolveProducts(env, offer, {
      exclude: offer.hideCartProducts ? new Set(input.cartHandles) : new Set(),
    });
    // Празен прозорец не се показва и не се брои (wiki: cross-sell-view-tracking).
    if (products.length) return toOffer(offer, products);
  }
  return null;
}

/* ─── Прегледът от панела ───────────────────────────────────────────── */

export interface OfferPreview {
  offer: CrossSellOffer;
  /** В пясъчник - прегледът отключва офертата за браузъра на търговеца. */
  sandbox: boolean;
  /** Защо клиентите НЯМА да видят офертата, по ред на важност. Празно - ще я видят. */
  warnings: string[];
}

export async function loadOfferPreview(
  env: Record<string, string | undefined>,
  id: string,
): Promise<OfferPreview | null> {
  const origin = adminOrigin(env);
  const pat = adminPat(env);
  if (!origin || !pat || !/^\d+$/.test(id)) return null;

  // Името на заявката е в списъка на живите в `shared-cache.server.ts`: прегледът
  // трябва да показва току-що записаното, а не отговор отпреди пет минути.
  const [offer] = await fetchDetails(origin, pat, [id], 'CrossSellPreview');
  if (!offer) return null;

  // Прегледът показва и продуктите в количката - не знае чия е количката.
  const products = await resolveProducts(env, offer, {exclude: new Set()});

  const warnings: string[] = [];
  if (offer.status !== 1) warnings.push('Офертата е неактивна - клиентите не я виждат. Активирай я от панела.');
  if (offer.event !== 'add_to_cart') {
    warnings.push(
      offer.event?.startsWith('checkout')
        ? 'Събитието е в касата - там прозорецът го рисува платформата, с нейния дизайн, не този.'
        : `Събитието „${offer.event}" не съществува в Nitrogen. Работи „Добавяне в количката".`,
    );
  }
  if (offer.displayType !== 'popup') {
    warnings.push('Типът е „Добави в количката", не „Покажи прозорец" - такава оферта не показва прозорец.');
  }
  if (!isRunning(offer.activeFrom, offer.activeTo)) warnings.push('Извън периода на активност.');
  if (offer.sandbox) {
    warnings.push(
      'Режим пясъчник: вижда се само в браузър, който е отворил този преглед (за 7 дни). Клиентите не я виждат.',
    );
  }
  if (!products.length) warnings.push('Няма продукт за показване - всички предложени са изчерпани или не бяха намерени.');
  if ((offer.targets ?? []).some((t) => t.itemType === 'selection')) {
    warnings.push('Условие по селекция (smart collection) не се проверява в Nitrogen - то никога не съвпада.');
  }

  return {offer: toOffer(offer, products), sandbox: !!offer.sandbox, warnings};
}

/* ─── Общото ────────────────────────────────────────────────────────── */

async function fetchDetails(origin: string, pat: string, ids: string[], opName: string): Promise<Detail[]> {
  const fields = ids.map((id) => `c${id}: crossSell(id: "${id}") { ${DETAIL_FIELDS} }`);
  const data = await adminGql<Record<string, Detail | null>>(
    origin,
    pat,
    `query ${opName} { ${fields.join(' ')} }`,
  );
  return ids.map((id) => data?.[`c${id}`]).filter(Boolean) as Detail[];
}

interface Trigger {
  id: string;
  vendor: string;
  collectionIds: Set<string>;
}

async function storefrontTrigger(env: Record<string, string | undefined>, handle: string): Promise<Trigger | null> {
  const data = await sfGql<{product: any}>(
    env,
    `query CrossSellTrigger($handle: String!) {
      product(handle: $handle) { id vendor collections(first: 50) { nodes { id } } }
    }`,
    {handle},
  );
  const p = data?.product;
  if (!p?.id) return null;
  return {
    id: numericId(p.id),
    vendor: String(p.vendor ?? ''),
    collectionIds: new Set((p.collections?.nodes ?? []).map((c: any) => numericId(c.id))),
  };
}

/**
 * Съвпадат ли условията на офертата с добавения продукт.
 *
 * Без условия - офертата е за всеки продукт. `allMatch` иска всички, иначе
 * стига едно. Условие по селекция (smart collection) не може да се провери от
 * Storefront API-то и не съвпада - прегледът казва това на търговеца.
 */
function targetsMatch(offer: Detail, trigger: Trigger, subtotal: number): boolean {
  /* Празен ред в условията не е условие. Панелът го записва сам при запис на
   * оферта без условия (№65 след изключването на пясъчника, 07.10.2026:
   * `{itemType: null, itemId: null}`) и досега той блокираше офертата. */
  const targets = (offer.targets ?? []).filter((t) => t.itemType || t.action);
  if (!targets.length) return true;
  const results = targets.map((t) => {
    let hit: boolean;
    if (t.action === 'cart' && t.amount != null) hit = subtotal >= Number(t.amount) / 100;
    else if (t.itemType === 'product') hit = String(t.itemId) === trigger.id;
    else if (t.itemType === 'category') hit = trigger.collectionIds.has(String(t.itemId));
    else if (t.itemType === 'vendor') hit = !!trigger.vendor && trigger.vendor === t.itemName;
    else return false;
    return t.comparison === 'is_not' ? !hit : hit;
  });
  return offer.allMatch ? results.every(Boolean) : results.some(Boolean);
}

const PRODUCT_FIELDS = `id handle title availableForSale
  featuredImage { url }
  priceRange { minVariantPrice { amount } }
  variants(first: 2) { nodes { id availableForSale } }`;

async function resolveProducts(
  env: Record<string, string | undefined>,
  offer: Detail,
  opts: {exclude: Set<string>},
): Promise<CrossSellProduct[]> {
  const actions = offer.actions ?? [];
  const productIds = actions.filter((a) => a.itemType === 'product' && a.itemId).map((a) => String(a.itemId));
  const categoryIds = actions.filter((a) => a.itemType === 'category' && a.itemId).map((a) => String(a.itemId));
  if (!productIds.length && !categoryIds.length) return [];

  const fields = [
    ...productIds.filter((id) => /^\d+$/.test(id)).map((id) => `p${id}: product(id: "${id}") { ${PRODUCT_FIELDS} }`),
    ...categoryIds
      .filter((id) => /^\d+$/.test(id))
      .map((id) => `c${id}: collection(id: "${id}") { products(first: 20) { nodes { ${PRODUCT_FIELDS} } } }`),
  ];
  const data = await sfGql<Record<string, any>>(env, `query CrossSellProducts { ${fields.join(' ')} }`);
  if (!data) return [];

  const nodes: any[] = [
    ...productIds.map((id) => data[`p${id}`]),
    ...categoryIds.flatMap((id) => data[`c${id}`]?.products?.nodes ?? []),
  ].filter(Boolean);

  const seen = new Set<string>();
  const unique = nodes.filter((n) => {
    if (!n?.handle || seen.has(n.handle)) return false;
    seen.add(n.handle);
    return true;
  });

  const filtered = unique.filter(
    (n) => !opts.exclude.has(n.handle) && (!offer.hideOutOfStock || n.availableForSale !== false),
  );

  // Платформата също разбърква продуктите при всяко показване.
  const limit = Math.min(10, Math.max(1, Number(offer.productsLimit) || 3));
  return shuffle(filtered)
    .slice(0, limit)
    .map((n) => {
      const price = parseFloat(n.priceRange?.minVariantPrice?.amount ?? '0') || 0;
      const variants = n.variants?.nodes ?? [];
      return {
        handle: n.handle,
        title: n.title ?? '',
        imageUrl: n.featuredImage?.url ? cdnResize(n.featuredImage.url, 320) : null,
        price,
        offerPrice: offerPrice(offer, price),
        variantId: variants.length === 1 ? variants[0].id : null,
      };
    });
}

/**
 * Цената с отстъпката на офертата.
 *
 * Отстъпка има само офертата тип „extended" - при „simple" полетата за
 * отстъпка са скрити в панела, но пак пазят подразбиращото се „percent"
 * (оферта №65: `percent` без стойност). „Подарък" (`free_product`) важи и без
 * тип - същото правило като в `cart-offers.server.ts`.
 */
function offerPrice(offer: Detail, price: number): number | null {
  const v = Number(offer.discountPercent) || 0;
  if (offer.discountType === 'free_product' || offer.freeProducts) return 0;
  if (offer.type !== 'extended' || v <= 0) return null;
  if (offer.discountType === 'percent') return round2(price * (1 - v / 100 / 100));
  if (offer.discountType === 'fixed') return round2(Math.max(0, price - v / 100));
  return null;
}

function discountLabel(offer: Detail): string | null {
  const v = Number(offer.discountPercent) || 0;
  if (offer.discountType === 'free_product' || offer.freeProducts) return 'Подарък';
  if (offer.type !== 'extended') return null;
  if (offer.discountType === 'shipping' || offer.freeShipping) return 'Безплатна доставка';
  if (v <= 0) return null;
  if (offer.discountType === 'percent') return `−${String(v / 100).replace('.', ',')}%`;
  if (offer.discountType === 'fixed') return `−${fmtEur(v / 100)}`;
  return null;
}

function toOffer(o: Detail, products: CrossSellProduct[]): CrossSellOffer {
  return {
    id: String(o.id),
    title: o.offerTitle || o.name,
    description: o.description,
    buttonName: o.buttonName || 'Добави',
    cancelButtonName: o.cancelButtonName || 'Не, благодаря',
    background: o.background,
    textColor: o.textColor,
    buttonBackground: o.buttonBackground,
    buttonTextColor: o.buttonTextColor,
    popupEffect: o.popupEffect,
    discountLabel: discountLabel(o),
    maxUserViews: o.maxUserViews ?? null,
    products,
  };
}

async function sfGql<T>(
  env: Record<string, string | undefined>,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T | null> {
  const origin = adminOrigin(env);
  const token = envValue(env, 'PUBLIC_STOREFRONT_API_TOKEN');
  if (!origin || !token) return null;
  try {
    const res = await fetch(`${origin}/api/sf`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'X-Storefront-Access-Token': token},
      body: JSON.stringify({query, variables}),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {data?: T};
    return json.data ?? null;
  } catch (error) {
    console.warn('cross-sell: storefront query failed —', (error as Error).message);
    return null;
  }
}

function numericId(gid: string): string {
  return String(gid).split('/').pop() ?? String(gid);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
