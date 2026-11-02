import {dedupeGifts, type CartOffers, type GiftOffer, type CartRuleNotice, type QuantityTier} from './cart-offers';
import {adminGql, adminListAll, adminOrigin, adminPat} from './admin-api.server';
import {fetchConfigBundle} from './config-bundle.server';
import {envValue} from './env.server';

/**
 * Reads the merchant's cart promotions from the Admin API.
 *
 * Same two traps as everywhere else in this codebase:
 *   • the LIST query returns hollow rows — `targets`/`actions` on a cross-sell
 *     and `rows` on a cart rule only come back from the single-item query, so
 *     the ids are listed first and then pulled in one aliased request;
 *   • money arrives in hundredths (69.99 € shows up as 6999).
 *
 * SERVER ONLY — the `.server.ts` suffix keeps the PAT out of the client bundle.
 */

/* 15 минути, не 30 секунди.
 *
 * Този кеш живее в паметта на ЕДИН изолат, а Cloudflare пуска нов при всеки
 * снопче трафик - тоест на 30 секунди почти всяка заявка тръгваше пак към
 * админа. При единайсет такива извиквания на страница живият магазин изяде
 * ограничението на магазина и повали и админ панела с 429 (17.08.2026).
 * Промяна от панела се вижда до петнайсет минути; при спешност - едно
 * преразгръщане вдига нови изолати с празен кеш. */
/* Минута в паметта на изолата. Общият кеш (`shared-cache.server.ts`) поема
 * товара между изолатите, затова тук не е нужен дълъг срок - и промяна от
 * панела се вижда до около три минути, вместо до петнайсет. */
const CACHE_TTL_MS = 60 * 1000;

/**
 * Двата списъка се обхождат докрай, всеки поотделно. Магазинът има 37 кръстосани
 * оферти и 12 правила за количката днес; таван от сто е близо, а изчезнала
 * оферта не казва нищо за себе си. Виж `admin-api.server.ts`.
 */
const CROSS_SELL_FIELDS = 'id name status event offerTitle activeFrom activeTo discountType freeProducts';
const CART_RULE_FIELDS = 'id name title status statusKey activeFrom activeTo';

function detailQuery(crossSellIds: string[], cartRuleIds: string[]): string {
  const cs = crossSellIds.map(
    (id) => `c${id}: crossSell(id: "${id}") {
      id offerTitle
      targets { action itemId itemType comparison amount }
      actions { itemId itemType itemName }
    }`,
  );
  const cr = cartRuleIds.map(
    (id) => `r${id}: cartRule(id: "${id}") { id title rows { message triggers { filterType valueType value records } action { actionType valueType value triggers { filterType operator records } } } }`,
  );
  return `query CartOfferDetails { ${[...cs, ...cr].join(' ')} }`;
}

interface RawCrossSell {
  id: string;
  name: string;
  status: number;
  /** Кога се задейства офертата: add_to_cart | cart | checkout | … */
  event: string | null;
  offerTitle: string | null;
  activeFrom: string | null;
  activeTo: string | null;
  discountType: string | null;
  freeProducts: boolean;
}

interface RawCartRule {
  id: string;
  name: string;
  title: string | null;
  status: number;
  statusKey: string | null;
  activeFrom: string | null;
  activeTo: string | null;
}

/**
 * Правила за количката, които НЕ се обявяват в промо лентата.
 *
 * Клиентът поиска (19.08) в количката да останат само безплатната доставка и
 * термо чашата, а двата реда за Pets да си отидат: №15 „★Поръчай 2, плати 1
 * Pets" и №14 „★Поръчай 4, плати 2 Pets".
 *
 * Скрива се САМО обявяването. Кампаниите остават активни в панела и
 * продължават да свалят от сметката, когато в количката има Pets продукти:
 * намалението идва от `Cart.totals`, не оттук. Ако търговецът иска и самата
 * промоция да спре, това е ключът в панела, не този списък.
 *
 * По номер, а не по заглавие: заглавието се пише в панела и се сменя с едно
 * кликване, а тогава филтърът тихо спира да лови.
 *
 * ⚠️ №15 вече е друго правило: търговецът го преработи в „Buy More, Save More"
 * (2-3 продукта −10 %, 3-4 −15 %, 4+ −20 %). Обява в промо лентата пак няма -
 * правилото се вижда на реда с отстъпката, заедно с процента си
 * („Buy More, Save More - 10%", виж `ruleLabel` в `cart-rule-view.ts`).
 */
const HIDDEN_RULE_IDS = new Set(['15', '14']);

let cache: {at: number; data: CartOffers} | null = null;

/** Never throws; returns null when unconfigured or the call failed. */
export async function fetchCartOffers(
  env: Record<string, string | undefined>,
): Promise<CartOffers | null> {
  const pat = adminPat(env);
  const origin = adminOrigin(env);
  if (!pat || !origin) return null;

  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;

  try {
    /* И двата списъка идват от общия пакет с настройките, тоест без свои две
     * заявки. Падне ли пакетът, четат се сами. */
    const bundled = await fetchConfigBundle(env);
    const [allCrossSells, allCartRules] = bundled
      ? [bundled.crossSells as RawCrossSell[], bundled.cartRules as RawCartRule[]]
      : await Promise.all([
          adminListAll<RawCrossSell>(origin, pat, {
            root: 'crossSells',
            nodeFields: CROSS_SELL_FIELDS,
            label: 'cart-offers/crossSells',
          }),
          adminListAll<RawCartRule>(origin, pat, {
            root: 'cartRules',
            nodeFields: CART_RULE_FIELDS,
            label: 'cart-offers/cartRules',
          }),
        ]);

    /* Кое е „подарък".
     *
     * `freeProducts` НЕ стига. Кампанийната оферта №62 („вземи втора опаковка
     * подарък") е с `discountType: free_product`, но `freeProducts: false` -
     * измерено 28.08.2026. Двете полета в панела се пълнят от различни
     * превключватели, а за купувача резултатът е един и същ, затова тук се
     * приема всяко от двете. */
    const running = allCrossSells.filter(
      (c) =>
        c.status === 1 &&
        (c.freeProducts || c.discountType === 'free_product') &&
        isRunning(c.activeFrom, c.activeTo),
    );
    const crossSells = running.filter((c) => firesOnNitrogen(c.event));

    // Оферта, която платформата няма как да задейства, се пропуска нарочно, но
    // не мълчаливо: иначе изглежда, че кодът е счупен, а разликата е една
    // настройка в панела.
    for (const skipped of running.filter((c) => !firesOnNitrogen(c.event))) {
      console.warn(
        `cart-offers: офертата „${skipped.offerTitle || skipped.name}" (№${skipped.id}) е с изполване „${skipped.event}" и не се обявява. ` +
          `Това е събитие на класическата тема; в Nitrogen смени изполването на „checkout".`,
      );
    }
    /* Действащите правила - ВСИЧКИ, и скритите от обявите: стъпките на
     * „Buy More, Save More" (№15) се четат от тях, макар правилото да не се
     * обявява с име. Обявите долу пак пропускат `HIDDEN_RULE_IDS`. */
    const runningRules = allCartRules.filter(
      (r) => r.status === 1 && isRunning(r.activeFrom, r.activeTo),
    );
    const cartRules = runningRules.filter((r) => !HIDDEN_RULE_IDS.has(String(r.id)));

    if (!crossSells.length && !runningRules.length) {
      cache = {at: Date.now(), data: {gifts: [], rules: [], tiers: []}};
      return cache.data;
    }

    const details = await adminGql<Record<string, any>>(
      origin, pat,
      detailQuery(crossSells.map((c) => String(c.id)), runningRules.map((r) => String(r.id))),
    );

    const gifts: GiftOffer[] = [];
    for (const offer of crossSells) {
      const detail = details?.[`c${offer.id}`];
      const reward = (detail?.actions ?? []).find((a: any) => a.itemType === 'product');
      if (!reward) continue;

      /* Условието на офертата идва в два вида и досега се четеше само единият:
       *   • по СУМА - условие с `action: "cart"` и `amount` в стотинки
       *     (хавлията: 6999 = 69,99 €);
       *   • по ПРОДУКТ - условие с `itemType: "product"` и `comparison: "is"`
       *     (кампанийната №62: „продукт 58 е в количката").
       * Вторият вид просто отпадаше и офертата не съществуваше за витрината. */
      const threshold = (detail?.targets ?? []).find((t: any) => t.action === 'cart' && t.amount);
      const requiredIds = (detail?.targets ?? [])
        .filter((t: any) => t.itemType === 'product' && t.itemId && t.comparison !== 'is_not')
        .map((t: any) => String(t.itemId));
      if (!threshold && !requiredIds.length) continue;

      gifts.push({
        id: String(offer.id),
        title: offer.offerTitle || offer.name,
        minTotal: threshold ? Number(threshold.amount) / 100 : 0,
        requiresHandles: [],
        requiresProductIds: requiredIds,
        productTitle: reward.itemName ?? 'Подарък',
        imageUrl: null,
        handle: null,
        productId: String(reward.itemId),
        free: offer.freeProducts || offer.discountType === 'free_product',
        variantId: null,
      } as GiftOffer & {requiresProductIds: string[]});
    }

    // The offer names a product; the cart needs a variant. One batched request
    // turns every rewarded product into the variant the line will carry - и в
    // същата заявка се вадят handle-ите на продуктите, които офертата ИСКА,
    // защото редът в количката се разпознава само по handle.
    await attachVariants(env, gifts);

    const rules: CartRuleNotice[] = cartRules.map((rule) => {
      const detail = details?.[`r${rule.id}`];
      const message = (detail?.rows ?? []).map((row: any) => row?.message).find(Boolean) ?? null;
      return {id: String(rule.id), title: rule.title || rule.name, message};
    });

    const data: CartOffers = {
      gifts: dedupeGifts(gifts),
      rules,
      tiers: quantityTiers(runningRules.map((r) => details?.[`r${r.id}`])),
    };
    cache = {at: Date.now(), data};
    return data;
  } catch (error) {
    console.error('cart-offers: could not load promotions —', (error as Error).message);
    return cache?.data ?? null;
  }
}

/**
 * Ще види ли платформата тази оферта, когато количката стигне до нея.
 *
 * `add_to_cart` и `cart` са събития на КЛАСИЧЕСКАТА тема - неин скрипт ги праща
 * при добавяне и при отваряне на количката. Nitrogen рисува свой DOM и такова
 * събитие никога не стига до платформата, значи подарък по такава оферта не се
 * дава. Проверено на живо 2026-08-12 и на двата магазина: с „checkout" редът
 * идва с `cross_sell_id` и 0,00 €, с „add_to_cart" не идва изобщо.
 *
 * Затова офертата не само не работи - тя не бива и да се ОБЯВЯВА. Лентата
 * „Печелиш хавлия за 0,00 €" върху оферта, която няма да се задейства, е
 * обещание, което касата не изпълнява.
 *
 * Събитията вътре в самата каса минават: там платформата води клиента.
 */
const NITROGEN_EVENTS = new Set([
  'checkout',
  'checkout_select_payment',
  'checkout_select_shipping',
]);

function firesOnNitrogen(event: string | null | undefined): boolean {
  return NITROGEN_EVENTS.has(String(event ?? ''));
}

/**
 * Стъпките „от N продукта в количката −X %" от редовете на правилата.
 *
 * Взима се САМО ред с едно-единствено условие по брой в цялата количка, без
 * ограничение по продукти, и с отстъпка в проценти. Ред с друго условие
 * (например „Pets 4=2" - брой на конкретен продукт) не е тази промоция и
 * обявяването му като „добави още 1 продукт" би излъгало. При две правила с
 * еднакъв праг важи по-високият процент.
 *
 * ИЗКЛЮЧЕНИЯТА стоят в ДЕЙСТВИЕТО на реда (`action.triggers`), не в условието:
 * „отстъпка −15 % за продуктите, които НЕ са …". Всяка стъпка има свой списък -
 * в „Buy More, Save More" (№15) −10 % изключва 19 продукта, а −15 % и −20 % по 8.
 * Мерено на живо 28.10.2026 с тестови колички:
 *
 *   3× Smart Start (изключен)              → правилото не сваля нищо
 *   3× Smart Start + 1× Anti Stress        → −20 %, но само на Anti Stress
 *   2× Femin + перли (изключен при −10 %)  → нищо
 *   3× Femin + перли (НЕ е изключен при −15 %) → −15 %
 *
 * Тоест прагът брои ЦЯЛАТА количка, а отстъпката пада само върху продуктите,
 * за които стъпката важи. Без списъка лентата пишеше „Имаш −15 %" над количка
 * само с изключени продукти (клиент, 28.10.2026).
 *
 * Условие в действието, което не е по продукт (категория, марка …), тук не
 * може да се провери - такава стъпка отпада, вместо да обещава отстъпка.
 */
function quantityTiers(details: any[]): QuantityTier[] {
  const byQty = new Map<number, QuantityTier>();
  for (const detail of details) {
    for (const row of detail?.rows ?? []) {
      const triggers = row?.triggers ?? [];
      if (triggers.length !== 1) continue;
      const t = triggers[0];
      if (t?.filterType !== 'cart_quantity' || (t?.records ?? []).length) continue;
      if (!['between', 'gte', 'eq'].includes(String(t?.valueType))) continue;
      const action = row?.action;
      if (action?.actionType !== 'discount' || action?.valueType !== 'percent') continue;
      const minQty = parseInt(String(t.value), 10);
      const percent = parseFloat(String(action.value));
      if (!(minQty > 0) || !(percent > 0)) continue;
      const scope = productScope(action?.triggers ?? []);
      if (!scope) continue;
      const seen = byQty.get(minQty);
      if (!seen || percent > seen.percent) byQty.set(minQty, {minQty, percent, ...scope});
    }
  }
  return [...byQty.values()].sort((a, b) => a.minQty - b.minQty);
}

/** За кои продукти важи отстъпката на реда. `null` - условие, което не четем. */
function productScope(triggers: any[]): Pick<QuantityTier, 'onlyProductIds' | 'excludedProductIds'> | null {
  const scope: Pick<QuantityTier, 'onlyProductIds' | 'excludedProductIds'> = {};
  for (const t of triggers) {
    const ids = (t?.records ?? []).map(String);
    if (!ids.length) continue;
    if (t?.filterType !== 'product') return null;
    if (t?.operator === 'not_in') scope.excludedProductIds = [...(scope.excludedProductIds ?? []), ...ids];
    else if (t?.operator === 'in') scope.onlyProductIds = [...(scope.onlyProductIds ?? []), ...ids];
    else return null;
  }
  return scope;
}

function isRunning(from: string | null, to: string | null): boolean {
  const now = Date.now();
  if (from && Date.parse(from) > now) return false;
  if (to && Date.parse(to) < now) return false;
  return true;
}

/**
 * The first variant of every rewarded product, in one request.
 *
 * The admin names the gift by product id, the cart adds by variant id. Without
 * this the storefront knows what it owes the shopper and cannot hand it over.
 */
async function attachVariants(
  env: Record<string, string | undefined>,
  gifts: GiftOffer[],
): Promise<void> {
  const required = (g: GiftOffer) => ((g as any).requiresProductIds ?? []) as string[];
  const ids = [
    ...new Set([
      ...gifts.map((g) => g.productId),
      ...gifts.flatMap(required),
    ].filter(Boolean)),
  ] as string[];
  const origin = adminOrigin(env);
  const token = envValue(env, 'PUBLIC_STOREFRONT_API_TOKEN');
  if (!ids.length || !origin || !token) return;

  const fields = ids
    .filter((id) => /^\d+$/.test(id))
    .map((id) => `p${id}: product(id: "${id}") { id handle featuredImage { url } variants(first: 1) { nodes { id } } }`);
  if (!fields.length) return;

  try {
    const res = await fetch(`${origin}/api/sf`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'X-Storefront-Access-Token': token},
      body: JSON.stringify({query: `query GiftVariants { ${fields.join(' ')} }`}),
    });
    if (!res.ok) return;
    const json = (await res.json()) as {data?: Record<string, any>};
    for (const gift of gifts) {
      const node = json.data?.[`p${gift.productId}`];
      if (node) {
        gift.variantId = node.variants?.nodes?.[0]?.id ?? null;
        gift.handle = node.handle ?? null;
        gift.imageUrl = node.featuredImage?.url ?? null;
      }
      // Условието „този продукт е в количката" се проверява по handle - виж
      // бележката при `requiresHandles`.
      gift.requiresHandles = required(gift)
        .map((id) => json.data?.[`p${id}`]?.handle)
        .filter(Boolean) as string[];
    }
  } catch (error) {
    console.warn('cart-offers: gift variants unresolved —', (error as Error).message);
  }
}
