/**
 * ONE source for every product marking on the storefront: the text labels
 * ("Ново", "Бестселър", merchant-authored ones) and the image banners
 * ("клинично доказани щамове", the Forbes award).
 *
 * Why this file exists: the same information was being read four different
 * ways — the category card filtered `labels`, the home carousel took
 * `labels[0]` and repainted it pink, the PDP rendered its own set, and the
 * strains mark was a hardcoded <img> that only two of the four surfaces had.
 * So the same product showed different badges depending on where you looked
 * at it, and /selection/sale showed none at all.
 *
 * Everything here comes from the merchant's admin panel:
 *   • labels   → Продукти → Етикети   (name + colour + text colour)
 *   • isNew / isFeatured → the product's own "Нов" / "Препоръчан" flags
 *   • banners  → Продукти → Банери    (image + corner: tl/tr/bl/br)
 *
 * The CloudCart Storefront API returns all of it — no PAT, no admin call.
 * The catch is that its LIST query only asks for `labels`, while `banners`,
 * `isNew` and `isFeatured` are requested by the single-product query alone.
 * `product-marks.server.ts` closes that gap by pulling the marks for the whole
 * catalogue once and handing them to every surface through `setProductMarks`.
 */

export type MarkCorner = 'tl' | 'tr' | 'bl' | 'br';

export interface ProductBanner {
  id: string;
  name?: string | null;
  imageUrl: string;
  /** Corner chosen by the merchant in the admin panel. */
  position: MarkCorner;
}

export interface ProductLabel {
  name: string;
  color?: string | null;
  textColor?: string | null;
}

export interface MarkMoney {
  amount: string;
  currencyCode: string;
}

/**
 * Как търговецът е поискал промоцията да ИЗГЛЕЖДА - настройките от самата
 * отстъпка в панела, не от продукта.
 *
 * Storefront API-то ги връща и в списъчната заявка (проверено 2026-08-12), тоест
 * картата в категорията може да ги спазва точно както продуктовата страница.
 * Дотук нито едно от тези полета не се четеше: сайтът рисуваше свой розов
 * „-N%" и винаги показваше старата цена, каквото и да е избрано в панела.
 */
export interface MarkDiscount {
  /** Името на правилото, както го е кръстил търговецът. */
  name: string | null;
  /** „40.00%" - неговият собствен изказ на стойността. */
  valueLabel: string | null;
  /** Скрий зачертаната цена („Скрий цената на отстъпката" в панела). */
  hidePrice: boolean;
  /** Таймер в списъците / на продуктовата страница. */
  countdownOnListing: boolean;
  countdownOnDetail: boolean;
  /** Докога върви промоцията. `null` значи безсрочна, тоест няма какво да брои. */
  endDate: string | null;
  /** Цвят на етикета от панела. `null` значи къщният розов. */
  color: string | null;
  textColor: string | null;
}

export interface ProductMark {
  /** URL handle — the only id a cart line carries. */
  handle: string | null;
  isNew: boolean;
  isFeatured: boolean;
  labels: ProductLabel[];
  banners: ProductBanner[];
  /** What the shopper pays today — already includes any running promotion. */
  price: MarkMoney | null;
  /** The struck-through "was" price, straight from `compareAtPriceRange`. */
  compareAtPrice: MarkMoney | null;
  /** Настройките за вид на действащата отстъпка, ако има такава. */
  discount: MarkDiscount | null;
}

/** A text badge, already translated and coloured, ready to render. */
export interface MarkTag {
  key: string;
  text: string;
  /** Background colour — the merchant's own when they set one. */
  bg: string;
  fg: string;
}

const EMPTY: ProductMark = {
  handle: null,
  isNew: false,
  isFeatured: false,
  labels: [],
  banners: [],
  price: null,
  compareAtPrice: null,
  discount: null,
};

/**
 * The two built-in CloudCart labels come back in English and duplicate the
 * `isNew` / `isFeatured` flags, so they are translated once here and rendered
 * from the flags — never twice.
 */
const BUILT_IN: Record<string, {text: string; bg: string; fg: string}> = {
  New: {text: 'Ново', bg: 'var(--color-brand-pink)', fg: '#ffffff'},
  Featured: {text: 'Бестселър', bg: '#f59e0b', fg: '#ffffff'},
};

/** House colours for a merchant label that has no colour set in the admin. */
const DEFAULT_LABEL = {bg: 'var(--color-brand-blue)', fg: '#ffffff'};

let current: Record<string, ProductMark> = {};
/** Built on first use from `current`, thrown away whenever that is replaced. */
let byHandle: Record<string, ProductMark> | null = null;

/**
 * Install the catalogue-wide marks fetched by the server. Ignores an empty
 * payload so a failed fetch keeps whatever each product carried on its own —
 * a missing badge is cosmetic, a wrong one is not.
 */
export function setProductMarks(next: Record<string, ProductMark> | null | undefined) {
  if (!next || !Object.keys(next).length) return;
  current = next;
  byHandle = null;
}

/** "gid://cloudcart/Product/37" → "37". Plain numeric ids pass through. */
export function markProductId(idOrGid: string | undefined | null): string | null {
  if (!idOrGid) return null;
  const m = String(idOrGid).match(/Product\/(\d+)/);
  return m?.[1] ?? (String(idOrGid).match(/^\d+$/) ? String(idOrGid) : null);
}

/**
 * The marks for one product. Fields the product carries itself win — the PDP
 * query returns everything first-hand — and the catalogue map fills the rest,
 * which is what makes listings show the same badges as the product page.
 */
export function marksFor(product: any): ProductMark {
  const id = markProductId(product?.id);
  const shared = (id && current[id]) || EMPTY;
  const ownBanners: ProductBanner[] | undefined = product?.banners;
  const ownLabels: ProductLabel[] | undefined = product?.labels;
  return {
    handle: product?.handle ?? shared.handle,
    isNew: product?.isNew ?? shared.isNew,
    isFeatured: product?.isFeatured ?? shared.isFeatured,
    labels: ownLabels?.length ? ownLabels : shared.labels,
    banners: ownBanners?.length ? ownBanners : shared.banners,
    price: shared.price,
    compareAtPrice: shared.compareAtPrice,
    // Продуктовата заявка носи своя `discount`; каталожната снимка покрива
    // повърхностите, чиято заявка го е пропуснала.
    discount: toMarkDiscount(product?.discount) ?? shared.discount,
  };
}

/**
 * `product.discount` от Storefront API-то, приведен към нашия вид.
 *
 * ⚠️ `percent` НЕ се взема оттук. CloudCart го закръгля по своя сметка и връща
 * 19 за правило от 20 % и 14 за правило от 15 % - проверено на живо. Процентът
 * се извежда от самите цени, които картата печата (`displayDiscountPercent`),
 * за да не си противоречат числото и цените под него.
 */
export function toMarkDiscount(raw: any): MarkDiscount | null {
  if (!raw) return null;
  return {
    name: raw.name ?? null,
    valueLabel: raw.typeValueFormatted ?? null,
    hidePrice: !!raw.hideDiscountPrice,
    countdownOnListing: !!raw.countdownOnListing,
    countdownOnDetail: !!raw.countdownOnDetail,
    endDate: raw.endDate ?? null,
    color: raw.color ?? null,
    textColor: raw.textColor ?? null,
  };
}

/** Настройките за вид на отстъпката, действаща за този продукт. */
export function markDiscount(product: any): MarkDiscount | null {
  return marksFor(product).discount;
}

/**
 * The authoritative price pair for a product: what it costs now and what it
 * cost before the promotion.
 *
 * Why this exists: CloudCart's `PRODUCT_LISTING_FIELDS` — the fragment behind
 * every paginated category page — asks for `priceRange` and nothing else. No
 * variants, no `compareAtPrice`, no `discount`. A listing card therefore sees
 * only the already-discounted price with no sign that a promotion is running,
 * which is how a 17.67 € product ended up advertised at 9.90 €: the card
 * assumed the price was the pre-discount one and took 44 % off it a second time.
 *
 * 🛑 NEVER compute a sale price by applying a percentage to a catalogue price.
 * CloudCart already folds active promotions into `priceRange`; the "was" price
 * is `compareAtPriceRange`, which the catalogue fetch supplies here for the
 * surfaces whose own query left it out.
 */
export function markPricing(product: any): {price: MarkMoney | null; compareAtPrice: MarkMoney | null} {
  const shared = marksFor(product);
  const variant = product?.variants?.nodes?.[0];

  const price: MarkMoney | null =
    variant?.price ?? product?.priceRange?.minVariantPrice ?? shared.price ?? null;

  // Order matters: a variant-level override beats the product-level one, and a
  // range from the product's own query beats the shared catalogue snapshot.
  const compareAtPrice: MarkMoney | null =
    variant?.compareAtPrice ??
    product?.discount?.msrpPrice ??
    product?.compareAtPriceRange?.minVariantPrice ??
    shared.compareAtPrice ??
    null;

  // A "was" price at or below the current one is not a promotion — CloudCart
  // returns the regular price there when nothing is running.
  const compare = compareAtPrice ? parseFloat(compareAtPrice.amount) : 0;
  const now = price ? parseFloat(price.amount) : 0;
  return {price, compareAtPrice: compare > now ? compareAtPrice : null};
}

/**
 * The marks for a product identified only by its URL handle.
 *
 * The cart needs this because a cart line carries no product id at all: its
 * `merchandise.id` is a **variant** gid, so `markProductId` — and therefore
 * `marksFor` — can never resolve one. The handle on `merchandise.product` is
 * the only thing that ties a line back to the catalogue.
 */
export function marksForHandle(handle: string | null | undefined): ProductMark | null {
  if (!handle) return null;
  if (!byHandle) {
    byHandle = {};
    for (const mark of Object.values(current)) {
      if (mark.handle) byHandle[mark.handle] = mark;
    }
  }
  return byHandle[handle] ?? null;
}

/** The same money, multiplied out for a quantity. */
function scaleMoney(money: MarkMoney | null | undefined, quantity: number): MarkMoney | null {
  if (!money) return null;
  const amount = parseFloat(money.amount);
  if (!isFinite(amount)) return null;
  return {amount: String(amount * quantity), currencyCode: money.currencyCode};
}

/**
 * Двете цени на един РЕД в количката: колко струва сега и колко е струвал.
 *
 * Чете се от `cost` на самия ред, защото само там числата са пълни:
 *
 *   • `cost.amountPerQuantity`          — реалната цена за брой
 *   • `cost.compareAtAmountPerQuantity` — зачертаната цена за брой
 *   • `cost.totalAmount`                — реалната сума на реда
 *   • `discountAllocations`             — кое правило колко е свалило
 *
 * ⚠️ Тук стоеше обратното твърдение: че `merchandise.price` е реалната цена, а
 * `cost.totalAmount` е MSRP. Днес не е вярно и разликата не е козметична.
 * Измерено на живо 2026-08-13, 2 бр. Femin с количествен пакет „Femin x2":
 *
 *   merchandise.price = 21,62   cost.amountPerQuantity = 22,49
 *   cost.compareAtAmountPerQuantity = 31,56   cost.totalAmount = 44,98
 *   alloc: PRODUCT · „Femin x2 пакет" · −18,14
 *
 * Тоест `merchandise.price` е каталожната цена на един брой и НЕ знае за
 * количествения пакет, докато `cost` знае. Старата сметка показваше „плащаш
 * 43,24, беше 44,98, спестяваш 1,74"; истината е „плащаш 44,98, беше 63,12,
 * спестяваш 18,14". И количествен пакет, и промо код се появяват в `cost` -
 * нищо не остава за пресмятане отстрани.
 *
 * Каталожната снимка остава резерва за тънките редове, които количката понякога
 * връща без `cost`.
 */
export function markPricingForLine(
  line: any,
  quantity?: number,
): {price: MarkMoney | null; compareAtPrice: MarkMoney | null} {
  const lineQty = Number(line?.quantity) || 0;
  const qty = Number.isFinite(quantity) ? Math.max(0, quantity as number) : lineQty;
  const shared = marksForHandle(line?.merchandise?.product?.handle);
  const cost = line?.cost;

  const unitNow: MarkMoney | null =
    cost?.amountPerQuantity ??
    (cost?.totalAmount && lineQty > 0
      ? {amount: String(parseFloat(cost.totalAmount.amount) / lineQty), currencyCode: cost.totalAmount.currencyCode}
      : null) ??
    line?.merchandise?.price ??
    shared?.price ??
    null;

  const unitWas: MarkMoney | null =
    cost?.compareAtAmountPerQuantity ??
    line?.merchandise?.compareAtPrice ??
    shared?.compareAtPrice ??
    null;

  const was = scaleMoney(unitWas, qty);
  const price = scaleMoney(unitNow, qty) ?? was;

  // Половин стотинка допуск: делене на сума по количество може да върне цена
  // косъм над реалната, а това не бива да се чете като промоция.
  const wasAmount = was ? parseFloat(was.amount) : 0;
  const nowAmount = price ? parseFloat(price.amount) : 0;
  return {price, compareAtPrice: wasAmount > nowAmount + 0.005 ? was : null};
}

/**
 * The text badges for a product, in the order they should stack: "Ново" and
 * "Бестселър" first, then the merchant's own labels. The discount percentage
 * is deliberately NOT in here — the client wants it stacked underneath, and
 * every surface gets it from the same pricing code.
 */
export function markTags(product: any): MarkTag[] {
  const mark = marksFor(product);
  const tags: MarkTag[] = [];
  if (mark.isNew) tags.push({key: 'new', ...BUILT_IN.New});
  if (mark.isFeatured) tags.push({key: 'featured', ...BUILT_IN.Featured});
  for (const label of mark.labels) {
    // Skip the two built-ins: they are already rendered from the flags above,
    // and CloudCart returns both the flag and a label row for the same thing.
    if (BUILT_IN[label.name]) {
      const key = label.name === 'New' ? 'new' : 'featured';
      if (!tags.some((t) => t.key === key)) tags.push({key, ...BUILT_IN[label.name]});
      continue;
    }
    tags.push({
      key: `label-${label.name}`,
      text: label.name,
      bg: label.color || DEFAULT_LABEL.bg,
      fg: label.textColor || DEFAULT_LABEL.fg,
    });
  }
  return tags;
}

/**
 * Banners the client does not want stamped on product photos (2026-08-06).
 *
 * "Forbes" says the same thing as the labelled pill in the buy box, and on the
 * photo it is a small dark square nobody can read. Matched by the banner NAME
 * from the admin panel, so re-uploading the image does not bring it back.
 *
 * ⚠️ This is a code-side veto only because the Product Banners app is not
 * exposed to the Admin GraphQL API ("app is not installed"), so it cannot be
 * switched off through the panel programmatically. Removing the banner in
 * Продукти → Банери is the cleaner fix; then this set can go.
 */
const HIDDEN_BANNERS = new Set(['forbes']);

/** The image banners grouped by the corner the merchant picked. */
export function markBanners(product: any): Record<MarkCorner, ProductBanner[]> {
  const out: Record<MarkCorner, ProductBanner[]> = {tl: [], tr: [], bl: [], br: []};
  for (const banner of marksFor(product).banners) {
    if (HIDDEN_BANNERS.has((banner.name ?? '').trim().toLowerCase())) continue;
    const corner = (String(banner.position || 'bl').toLowerCase() as MarkCorner);
    (out[corner] ?? out.bl).push(banner);
  }
  return out;
}

/**
 * Ask the CDN for the size we actually draw instead of the 600px original —
 * a 74px badge downloading 600px is the single most expensive thing on a
 * listing page. 2× the CSS size keeps it crisp on retina.
 *
 * Arbitrary sizes can 404 on the CloudCart CDN, so every caller pairs this
 * with an onError that falls back to `bannerFallbackUrl`.
 */
export function bannerImageUrl(url: string, cssSize: number): string {
  const target = Math.round(cssSize * 2);
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('width', String(target));
    parsed.searchParams.set('height', String(target));
    return parsed.toString();
  } catch {
    return url;
  }
}

/** The same image with no resize parameters — the always-valid fallback. */
export function bannerFallbackUrl(url: string): string {
  const cut = url.indexOf('?');
  return cut === -1 ? url : url.slice(0, cut);
}
