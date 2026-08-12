/**
 * Количката на CloudCart, използвана директно от Nitrogen.
 *
 * ЗАЩО СЪЩЕСТВУВА. Кръстосаните оферти, правилата за количката, подаръците и
 * условията към тях се смятат от платформата, и то в мига, в който тя види
 * „някой добави продукт". Дотук добавянето минаваше през Storefront API-то
 * (`cartLinesAdd`), а платформата научаваше за количката наведнъж, при
 * прехвърлянето към касата. Тя виждаше готова количка, не виждаше добавяне -
 * затова събитието `add_to_cart` не се случваше за нея и от целия cross sell
 * работеха само офертите с изполване „каса".
 *
 * Измерено на живо на testnitrogen.live (2026-08-12): POST към `/cart/add`
 * само с `variant_id` връща `modal-popup-iframe` с адрес
 * `/crossSell/e/<събитие>/<оферта>/<ключ на реда>` - платформата вече е
 * оценила условията. Приемане с `cross_sell` + `cart_items` слага подаръка с
 * **0,00 €** и междинната сума не помръдва. Точно това не можеше да се
 * постигне отстрани: `CartLineInput.crossSellId` на Storefront API-то се
 * приема и не се записва.
 *
 * ⚠️ `/cart/*` е резервиран път в диспечера на Nova, тоест тези заявки не
 * стигат до storefront worker-а, а до платформата - от НАШИЯ домейн, значи
 * бисквитката е първа страна. Затова всичко тук е с относителни адреси; сочи
 * ли се служебният домейн, бисквитката отпада и количката се губи.
 */

/** Пътищата на платформата. Държат се тук, за да не се разпилеят из кода. */
const ADD = '/cart/add';
const COMPACT = '/cart/compact';
/** Страница на платформата, от която се чете CSRF маркерът. */
const TOKEN_SOURCE = '/cart';
/** Промо кодът се прилага от платформата, не от Storefront API-то. */
const DISCOUNT = '/checkout/discount-code';

/** Съобщение, че количката се е променила. Броячът в хедъра слуша за него. */
export const CART_CHANGED_EVENT = 'bb:cart-changed';
/** Съобщение, че платформата предлага оферта. Модалът слуша за него. */
export const CROSS_SELL_EVENT = 'bb:cross-sell';

export interface CrossSellOffer {
  /** Идентификаторът на офертата в панела. */
  id: string;
  /** Кое събитие я е задействало (`add_to_cart`, `checkout`…). */
  event: string;
  /** Ключът на реда, който я е задействал. Платформата го иска обратно. */
  cartItemKey: string;
}

export interface PlatformAddResult {
  ok: boolean;
  /** Съобщение за грешка от платформата, ако е отказала. */
  message: string | null;
  /** Офертата, която платформата предлага след това добавяне, ако има такава. */
  offer: CrossSellOffer | null;
}

/**
 * CSRF маркерът на платформата.
 *
 * Пази се в модула: една заявка на сесия. Нищо в Nitrogen страница не го носи -
 * той живее в `<meta name="csrf-token">` на страниците, които рисува
 * платформата, а `/cart` е точно такава и е на нашия домейн.
 */
let tokenPromise: Promise<string | null> | null = null;

async function csrfToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  if (!tokenPromise) {
    tokenPromise = (async () => {
      try {
        const res = await fetch(TOKEN_SOURCE, {credentials: 'include', redirect: 'follow'});
        const html = await res.text();
        return html.match(/name="csrf-token"\s+content="([^"]+)"/)?.[1] ?? null;
      } catch {
        return null;
      }
    })();
  }
  return tokenPromise;
}

/** Маркерът се подновява, ако сесията е изтекла и добавянето е отказано. */
function forgetToken() {
  tokenPromise = null;
}

/** "gid://cloudcart/ProductVariant/193" → "193". Числов вход минава непроменен. */
export function variantNumericId(idOrGid: string | undefined | null): string | null {
  if (!idOrGid) return null;
  const gid = String(idOrGid).match(/Variant\/(\d+)/)?.[1];
  if (gid) return gid;
  return /^\d+$/.test(String(idOrGid)) ? String(idOrGid) : null;
}

async function postForm(body: Record<string, string>): Promise<any | null> {
  const token = await csrfToken();
  if (!token) return null;
  const res = await fetch(ADD, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRF-TOKEN': token,
    },
    body: new URLSearchParams(body).toString(),
  });
  if (!res.ok) return null;
  return res.json();
}

/**
 * Офертата от отговора на платформата, ако тя е решила да предложи такава.
 *
 * Адресът има вида `/crossSell/e/<събитие>/<оферта>/<ключ на реда>`. Оттам се
 * взимат и трите неща, нужни за приемането - затова не се пази отделно
 * състояние: това, което трябва да се върне на платформата, вече е в адреса,
 * който самата тя е дала.
 */
function readOffer(data: any): CrossSellOffer | null {
  const target = data?.['modal-popup-iframe']?.target;
  if (typeof target !== 'string') return null;
  const m = target.match(/\/crossSell\/e\/([^/]+)\/(\d+)\/([A-Za-z0-9]+)/);
  if (!m) return null;
  return {event: m[1], id: m[2], cartItemKey: m[3]};
}

/**
 * Слага продукт в количката на платформата.
 *
 * `variant_id` сам стига - платформата намира продукта по него (проверено).
 * Затова всеки бутон в магазина работи с това, което вече носи, без да търси
 * продуктов номер отделно.
 */
export async function platformAdd(
  variantIdOrGid: string,
  quantity = 1,
): Promise<PlatformAddResult> {
  const variant = variantNumericId(variantIdOrGid);
  if (!variant) return {ok: false, message: 'Продуктовият вариант не е намерен', offer: null};

  try {
    let data = await postForm({variant_id: variant, quantity: String(quantity)});
    // Изтекла сесия изглежда като „формите не съвпадат". Един повторен опит с
    // пресен маркер, вместо мъртъв бутон.
    if (!data || data.status === 'error') {
      forgetToken();
      data = await postForm({variant_id: variant, quantity: String(quantity)});
    }
    if (!data) return {ok: false, message: 'Количката не отговори', offer: null};
    if (data.status === 'error') {
      return {ok: false, message: readError(data), offer: null};
    }
    notifyCartChanged();
    return {ok: true, message: null, offer: readOffer(data)};
  } catch (error) {
    return {ok: false, message: (error as Error).message, offer: null};
  }
}

/**
 * Приема кръстосана оферта.
 *
 * `cross_sell` и `cart_items` са това, което прави подаръка подарък: по тях
 * платформата връзва новия ред с офертата и слага нейните 100 %. Без тях същият
 * продукт влиза с редовната си цена.
 */
export async function platformAcceptOffer(
  offer: CrossSellOffer,
  variantIdOrGid: string,
  quantity = 1,
): Promise<boolean> {
  const variant = variantNumericId(variantIdOrGid);
  if (!variant) return false;
  try {
    const data = await postForm({
      cross_sell: offer.id,
      cart_items: offer.cartItemKey,
      variant_id: variant,
      quantity: String(quantity),
    });
    if (!data || data.status === 'error') return false;
    notifyCartChanged();
    return true;
  } catch {
    return false;
  }
}

function readError(data: any): string {
  if (typeof data?.msg === 'string' && data.msg) return data.msg;
  const field = data?.field;
  if (field && typeof field === 'object') {
    const first = Object.values(field)[0];
    if (Array.isArray(first) && typeof first[0] === 'string') return first[0];
  }
  return 'Продуктът не можа да бъде добавен';
}

export interface PlatformCartLine {
  productId: string;
  variantId: string;
  quantity: number;
}

/**
 * Какво има в количката на платформата.
 *
 * Няма JSON endpoint - проверени са `/cart/json`, `/cart.json`, `/cart/items`
 * и `/cart/get`, всичките 404. `/cart/compact` връща готов HTML, но вътре в
 * него платформата вгражда `cartSpinnerItems` - точно съставът на количката
 * като JSON. Чете се той, а не подредбата на HTML-а, защото HTML е оформление
 * и се мени, а този обект е данни.
 */
export async function platformCartLines(): Promise<PlatformCartLine[] | null> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch(`${COMPACT}?_=${Date.now()}`, {
      credentials: 'include',
      headers: {'X-Requested-With': 'XMLHttpRequest'},
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {html?: string};
    const raw = json.html?.match(/cartSpinnerItems\s*=\s*(\{[\s\S]*?\});/)?.[1];
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Record<string, any>;
    return Object.values(parsed).map((row) => ({
      productId: String(row.product_id ?? ''),
      variantId: String(row.variant_id ?? ''),
      quantity: Number(row.quantity) || 0,
    }));
  } catch {
    return null;
  }
}

/** Броят артикули в количката на платформата, за брояча в хедъра. */
export async function platformCartCount(): Promise<number | null> {
  const lines = await platformCartLines();
  if (!lines) return null;
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

/**
 * Прилага промо код върху количката на платформата.
 *
 * Дотук кодът отиваше на Storefront API-то (`cartDiscountCodesUpdate`). То го
 * приемаше и връщаше същата сума, а касата - вече на платформата - изобщо не го
 * знаеше. Адресът е този, който класическата тема ползва в количката, и е на
 * нашия домейн, значи бисквитката е първа страна.
 */
export async function platformApplyDiscount(code: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const value = String(code ?? '').trim();
  if (!value) return false;
  const token = await csrfToken();
  if (!token) return false;
  try {
    const res = await fetch(DISCOUNT, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-TOKEN': token,
      },
      body: new URLSearchParams({discount_code: value}).toString(),
    });
    if (!res.ok) return false;
    const data = (await res.json().catch(() => null)) as any;
    if (data && data.status === 'error') return false;
    notifyCartChanged();
    return true;
  } catch {
    return false;
  }
}

export function notifyCartChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CART_CHANGED_EVENT));
}

export function announceOffer(offer: CrossSellOffer) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CROSS_SELL_EVENT, {detail: offer}));
}
