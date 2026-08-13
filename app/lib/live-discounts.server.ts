import type {AutoDiscount} from './active-discounts';
import {adminGql, adminListAll, adminOrigin, adminPat} from './admin-api.server';

/**
 * Действащите автоматични отстъпки, прочетени от Admin API-то, за да може
 * търговецът да смени промоция от панела и да я види на сайта без нов deploy.
 *
 * ⚠️ Това НЕ е източникът на цените. Цената и зачертаната цена идват от
 * Storefront API-то (`priceRange` / `compareAtPriceRange`) и са верни за всеки
 * вид отстъпка. Проверено на живо 2026-08-12: продукт 79 под правило от 40 %
 * се връща 21,47 € срещу 35,79 €, и то дори в списъчната заявка. Оттук идва
 * само това, което API-то не казва: кои продукти са в промоция изобщо и с кое
 * правило, за страницата „Промоции" и за съобщенията в количката.
 *
 * SERVER ONLY — the `.server.ts` suffix keeps the PAT out of the client bundle.
 * The token never reaches the browser: the loader ships only the resulting
 * discount list, which is public information anyway.
 */

// 30s. The merchant edits a percentage and wants to see it, so freshness wins over
// saving calls. It cannot go to zero: the fetch is awaited in the root loader, so a
// miss adds three admin round-trips to that page render. If pages ever feel slow,
// the fix is serve-stale-then-refresh, not a longer window.
const CACHE_TTL_MS = 30 * 1000;

export interface LiveDiscounts {
  discounts: AutoDiscount[];
  /** product id → url handle, for the surfaces that only know the handle (cart lines). */
  handles: Record<string, string>;
  /**
   * Прагът за безплатна доставка от действащо правило от вид „shipping",
   * в основната валута. `0` значи безплатна доставка без праг, `null` значи
   * че такова правило няма и важи настройката на BumpCart.
   */
  freeShippingOver: number | null;
}

let cache: {at: number; data: LiveDiscounts} | null = null;

/**
 * Step 1 — list the active rules. Deliberately does NOT ask for `targets`:
 * verified 2026-07-31 that the LIST query always returns `targets: []`, while
 * `discount(id:)` returns the real rows for the same discount. Asking here would
 * quietly yield zero targeted products and the feature would never light up.
 *
 * Обхожда се докрай, а не само първата стотица: активните правила на живия
 * магазин са 94 и растат. Виж `admin-api.server.ts`.
 */
const LIST_FIELDS = 'id name type typeValue code orderOver dateStart dateEnd active color textColor';

/** Step 3 — url handles for the targeted products, aliased into one request. */
function handlesQuery(ids: string[]): string {
  const fields = ids.map((id) => `p${id}: product(id: "${id}") { id urlHandle }`);
  return `query DiscountedHandles { ${fields.join(' ')} }`;
}

/** Step 2 — one batched request with an alias per discount to pull the targets. */
function targetsQuery(ids: string[]): string {
  const fields = ids.map((id) => `d${id}: discount(id: "${id}") { id targets { type itemId } }`);
  return `query DiscountTargets { ${fields.join(' ')} }`;
}

interface RawDiscount {
  id: string;
  name: string;
  type: string;
  typeValue: number | null;
  /** Промо код, който клиентът трябва да въведе. `null` значи автоматично правило. */
  code: string | null;
  orderOver: number | null;
  dateStart: string | null;
  dateEnd: string | null;
  /** Цветовете на етикета от панела. Само Admin API-то ги дава. */
  color: string | null;
  textColor: string | null;
  targets: Array<{type: string; itemId: string}> | null;
}

/**
 * Returns the merchant's currently-running percent discounts, or null when the
 * feature is not configured / the call failed — callers then keep the static
 * mirror. Never throws.
 */
export async function fetchAutoDiscounts(
  env: Record<string, string | undefined>,
): Promise<LiveDiscounts | null> {
  const pat = adminPat(env);
  const origin = adminOrigin(env);
  if (!pat || !origin) return null;

  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;

  try {
    const listed = (
      await adminListAll<RawDiscount>(origin, pat, {
        root: 'discounts',
        args: 'active: yes',
        nodeFields: LIST_FIELDS,
        label: 'live-discounts',
      })
    );

    // Правилата за доставка не се отнасят до продукт, затова се вадят отделно,
    // преди филтъра за продуктовите отстъпки.
    const freeShippingOver = shippingThreshold(listed);

    const productRules = listed.filter(isLiveOnStorefront);

    if (productRules.length === 0) {
      cache = {at: Date.now(), data: {discounts: [], handles: {}, freeShippingOver}};
      return cache.data;
    }

    // Step 2: targets, aliased into a single request (d<id>: discount(id:)).
    const targets = await adminGql<Record<string, {targets?: Array<{type: string; itemId: string}>} | null>>(
      origin, pat, targetsQuery(productRules.map((d) => String(d.id))),
    );

    const mapped = productRules
      .map((d) => toAutoDiscount(d, targets?.[`d${d.id}`]?.targets ?? []))
      .filter((d): d is AutoDiscount => d !== null);

    // Step 3: the cart only knows a line's handle, so ship a handle→id map too.
    // Without it a live discount on a product outside the old static map is
    // found on product cards (they have the id) but not in the cart.
    const ids = [...new Set(mapped.flatMap((d) => d.productIds))];
    const handleRows = ids.length
      ? await adminGql<Record<string, {id: string; urlHandle: string} | null>>(
          origin, pat, handlesQuery(ids),
        )
      : {};
    const handles: Record<string, string> = {};
    for (const id of ids) {
      const row = handleRows?.[`p${id}`];
      if (row?.urlHandle) handles[id] = row.urlHandle;
    }

    cache = {at: Date.now(), data: {discounts: mapped, handles, freeShippingOver}};
    return cache.data;
  } catch (error) {
    console.error('live-discounts: falling back to the static mirror —', (error as Error).message);
    // Serve a stale cache rather than nothing; otherwise let the caller fall back.
    return cache?.data ?? null;
  }
}

/**
 * Видовете правила, които свалят цена на продукт.
 *
 * `percent` е единственият, който носи процент. `fixed` и `flat` свалят сума и
 * нямат такъв - за тях процентът остава 0 и всяка цифра пред клиента се смята
 * от самите цени, които API-то връща. Така продуктът излиза в „Промоции" и
 * получава badge, без да сме измислили процент, който не знаем.
 *
 * Дотук кодът приемаше само `percent` и мълчаливо изхвърляше останалите: правило
 * от вид „фиксирана сума" беше невидимо за сайта, макар касата да го прилагаше.
 */
const PRODUCT_RULE_KINDS: Record<string, 'percent' | 'amount'> = {
  percent: 'percent',
  fixed: 'amount',
  flat: 'amount',
};

function isLiveOnStorefront(d: RawDiscount): boolean {
  if (!PRODUCT_RULE_KINDS[d.type]) return false;
  // 🛑 Правило с код НЕ е автоматична отстъпка. Клиентът трябва да го въведе и
  // касата го прилага чак тогава.
  //
  // Това беше най-скъпата грешка тук. На bulgarbiotic.bg 66 от 71 правила, които
  // този филтър пропускаше, са промо кодове, и 65 от тях важат за целия каталог -
  // тоест всеки продукт „имаше" 30% отстъпка. Страницата на количката вадеше този
  // процент от сметката и показваше сума доста под тази, която касата събира, а
  // „Промоции" изброяваше целия магазин.
  //
  // Кодът си има свой път: `cartDiscountCodesUpdate` на Storefront API-то. То
  // смята сумата само - проверено 2026-08-13, количка от 21,62 пада на 4,32 с
  // код за 80 %. Затова тук няма нужда да го познаваме.
  if (d.code) return false;
  // Правило без стойност не сваля нищо. Платформата държи един такъв запис
  // („Default Fixed Discount", активен, без стойност и без цели) и той не бива
  // да маркира каквото и да е като промоция.
  if (!d.typeValue) return false;
  return isRunning(d);
}

function isRunning(d: RawDiscount): boolean {
  const now = Date.now();
  if (d.dateStart && Date.parse(d.dateStart) > now) return false;
  if (d.dateEnd && Date.parse(d.dateEnd) < now) return false;
  return true;
}

/**
 * Прагът за безплатна доставка, ако търговецът е пуснал правило от вид
 * „shipping". Сумата е в стотни, като всичко парично в този API.
 *
 * Правило без праг (цели `all`) значи безплатна доставка винаги, тоест 0.
 * Няма ли действащо такова правило, връща `null` и количката остава на
 * настройката на BumpCart.
 *
 * ⚠️ И двете правила в този магазин са изключени днес (№8 с праг 5113 = 51,13 €
 * и №453 без праг), затова е проверено само разчитането им, не и поведението на
 * живо. Сгреши ли, най-лошото е грешен праг в лентата „още X до безплатна
 * доставка" - цената на доставката се решава от куриера на касата.
 */
function shippingThreshold(rules: RawDiscount[]): number | null {
  const shipping = rules.filter((d) => d.type === 'shipping' && isRunning(d));
  if (!shipping.length) return null;
  const thresholds = shipping.map((d) => (d.orderOver ? d.orderOver / 100 : 0));
  // Най-ниският праг важи: това е първата сума, от която доставката е безплатна.
  return Math.min(...thresholds);
}

function toAutoDiscount(
  d: RawDiscount,
  targets: Array<{type: string; itemId: string}>,
): AutoDiscount | null {
  // Only product-scoped targets resolve without extra round-trips. Category-scoped
  // rules would need the category expanded to its products — if the merchant uses
  // those, this covers fewer products than checkout applies. Verify against real
  // data before relying on it.
  // CloudCart expresses "the whole catalogue" as a single target of type "all".
  // Verified 2026-08-03: a 38% store-wide rule arrives as targets [{type:"all"}]
  // with no product rows, and treating it as "no targets" made it invisible.
  const appliesToAll = targets.some((t) => t.type === 'all');
  const productIds = targets.filter((t) => t.type === 'product').map((t) => String(t.itemId));
  if (!appliesToAll && productIds.length === 0) return null;

  const kind = PRODUCT_RULE_KINDS[d.type];
  // Правило от вид „сума" няма процент. Нула тук не е загуба: badge-ът и
  // зачертаната цена се смятат от цените на API-то, а тази стойност служи само
  // да се избере „най-добрата" отстъпка, когато няма от какво да се изведе.
  const percent = kind === 'percent' ? toPercent(d.typeValue as number) : 0;
  if (kind === 'percent' && percent <= 0) return null;

  return {
    id: String(d.id),
    name: d.name,
    kind,
    percent,
    dateEnd: d.dateEnd,
    orderOver: d.orderOver,
    color: d.color ?? null,
    textColor: d.textColor ?? null,
    productIds,
    appliesToAll,
  };
}

/**
 * `typeValue` is not always a plain percentage: the live store returned 10000 for a
 * percent rule, i.e. hundredths. Anything above 100 is therefore read as hundredths;
 * the result is clamped so a bad value can never print "−10000%" on a product card.
 */
function toPercent(typeValue: number): number {
  const raw = typeValue > 100 ? typeValue / 100 : typeValue;
  return Math.max(0, Math.min(100, Math.round(raw)));
}
