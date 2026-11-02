/**
 * Промоции в количката, exactly as the merchant configured them:
 *
 *  • cross-sell "подарък над X лв." offers  (Приложения → Cross sell)
 *  • cart rules                            (Отстъпки → Правила за количката)
 *
 * Neither is exposed by the Storefront API, so both come from the Admin API —
 * see `cart-offers.server.ts`.
 *
 * ⚠️ What the shopper is actually charged is decided by CloudCart's checkout.
 * Everything here is presentation: it tells them what they have earned and how
 * far they are from the next thing. If the two ever disagree, checkout is right
 * and this is the bug.
 */

export interface GiftOffer {
  id: string;
  /** Merchant-authored headline, e.g. "Подарък хавлия при поръчки над 70 евро". */
  title: string;
  /** Cart total, in store currency, above which the gift is earned.
   *  0, когато условието на офертата не е сума, а продукт. */
  minTotal: number;
  /**
   * Handle-ите на продуктите, които трябва да са в количката, за да важи
   * офертата (условие `itemType: product` в панела). Празен списък значи, че
   * условието е по сума.
   *
   * Handle, а не идентификатор: редът в количката носи ВАРИАНТ
   * (`merchandise.id` е `ProductVariant/…`) и търсене по продукт никога не
   * лови. `merchandise.product.handle` е единствената връзка обратно.
   */
  requiresHandles: string[];
  productTitle: string;
  imageUrl: string | null;
  handle: string | null;
  /** The rewarded product, as the offer names it. */
  productId: string | null;
  /**
   * Офертата дава продукта БЕЗПЛАТНО (`discountType: free_product` в панела).
   *
   * Нулирането е работа на платформата: тя слага реда при прехвърлянето на
   * количката и му пише `cross_sell_id`, а оттам идват 100-те процента. Наш
   * ред със същия продукт остава с редовната си цена, каквото и да му подадем -
   * измерено на живо, таблицата е в `cart-gifts.server.ts`.
   */
  free: boolean;
  /**
   * Вариантът на наградата. Не се добавя - служи, за да разпознаем и махнем
   * подаръчен ред, останал от по-стар билд, преди количката да иде на касата.
   */
  variantId: string | null;
}

export interface CartRuleNotice {
  id: string;
  title: string;
  /** The merchant's own wording for the row, when they wrote one. */
  message: string | null;
}

/**
 * Стъпка от правило за количката по БРОЙ В КОЛИЧКАТА - „от N продукта −X %".
 *
 * Чете се от реда на правилото в панела (условие `cart_quantity`, действие
 * „отстъпка в проценти"), тоест смени ли търговецът стъпките, количката ги
 * следва без deploy. Платформата прилага най-високата стъпка, чийто долен праг
 * е достигнат - измерено на живо 12.10.2026 с „Buy More, Save More"
 * (2 бр. −10 %, 3 бр. −15 %, 4 бр. −20 %), въпреки че в панела редовете са
 * „между 2 и 3", „между 3 и 4" и се застъпват.
 */
export interface QuantityTier {
  minQty: number;
  percent: number;
  /** Отстъпката важи САМО за тези продукти (номера от панела). */
  onlyProductIds?: string[];
  /** Отстъпката НЕ важи за тези продукти - те само се броят към прага. */
  excludedProductIds?: string[];
}

/** Получава ли продуктът отстъпката на стъпката. */
function tierAppliesTo(tier: QuantityTier, productId: string): boolean {
  if (tier.onlyProductIds?.length) return tier.onlyProductIds.includes(productId);
  return !(tier.excludedProductIds ?? []).includes(productId);
}

export interface CartOffers {
  gifts: GiftOffer[];
  rules: CartRuleNotice[];
  /** Стъпките на действащите правила по брой, от най-ниската. */
  tiers?: QuantityTier[];
}

const EMPTY: CartOffers = {gifts: [], rules: [], tiers: []};

let current: CartOffers = EMPTY;

export function setCartOffers(next: CartOffers | null | undefined) {
  if (!next) return;
  if (!next.gifts.length && !next.rules.length && !next.tiers?.length) return;
  current = next;
}

export function cartOffers(): CartOffers {
  return current;
}

export interface TierStatus {
  /** Стъпката, която количката вече е взела И поне един продукт в нея
   *  получава; `null` под първата или когато никой продукт не участва. */
  current: QuantityTier | null;
  /** Следващата стъпка; `null`, когато е взета най-високата. */
  next: QuantityTier | null;
  /** Колко продукта остават до `next`. */
  need: number;
  /** Напредък към най-високата стъпка, 0-100. */
  pct: number;
  /** За `next` трябва да се добави продукт, който участва - нито един в
   *  количката не получава тази стъпка, затова „добави какъвто и да е" лъже. */
  needsEligible: boolean;
}

/**
 * Докъде е стигнала количката по стъпките. `null` - няма правило по брой, или
 * не се знае кои продукти са в количката (без тях не може да се каже честно).
 *
 * Прагът брои ЦЯЛАТА количка - и изключените продукти, - а отстъпката пада
 * само върху продуктите, за които стъпката важи (мерено на живо, виж
 * `quantityTiers` в `cart-offers.server.ts`).
 */
export function tierStatus(
  quantity: number,
  productIds: string[] | null,
  tiers: QuantityTier[] = current.tiers ?? [],
): TierStatus | null {
  if (!tiers.length || !productIds) return null;
  /* Офертата се обявява само когато в количката има продукт, който участва
   * поне в една стъпка (клиент, 28.10.2026). Количка само с изключени
   * продукти (3× Smart Start) не получава ред за нея. */
  if (!productIds.some((id) => tiers.some((t) => tierAppliesTo(t, id)))) return null;
  const qty = Math.max(0, Math.floor(quantity || 0));
  const tierAt = (n: number) => tiers.filter((t) => n >= t.minQty).pop() ?? null;
  const covers = (t: QuantityTier) => productIds.some((id) => tierAppliesTo(t, id));
  const top = tiers[tiers.length - 1];
  const pct = Math.min(100, (qty / top.minQty) * 100);

  const reached = tierAt(qty);
  if (reached && !covers(reached)) {
    /* Прагът е стигнат, но отстъпката няма върху какво да падне. Още един
     * продукт вдига броя с едно. Важи ли стъпката на новия брой за нещо вече в
     * количката (2× Femin + перли: изключени при −10 %, не и при −15 %), става
     * всеки продукт; иначе трябва да е продукт, който участва. */
    const next = tierAt(qty + 1);
    return {current: null, next, need: 1, pct, needsEligible: !next || !covers(next)};
  }
  const next = tiers.find((t) => qty < t.minQty) ?? null;
  return {
    current: reached,
    next,
    need: next ? next.minQty - qty : 0,
    pct,
    needsEligible: next ? !covers(next) : false,
  };
}

/** „1 продукт" / „2 продукта". */
export function productsLabel(count: number): string {
  return count === 1 ? '1 продукт' : `${count} продукта`;
}

export interface GiftProgress extends GiftOffer {
  earned: boolean;
  /** How much more has to go in the basket. 0 once earned. */
  remaining: number;
  /** 0–100, for the progress bar. */
  percent: number;
}

/**
 * The gift offers measured against a cart total. Sorted so the one the shopper
 * is closest to earning comes first — that is the one worth nudging them about.
 */

export function giftProgress(subtotal: number): GiftProgress[] {
  return current.gifts
    // Офертите по продукт нямат праг - лента „още 0,00 €" за тях е безсмислица.
    // Те минават през `productGifts`.
    .filter((gift) => !gift.requiresHandles.length)
    .map((gift) => {
      const earned = subtotal >= gift.minTotal;
      return {
        ...gift,
        earned,
        remaining: earned ? 0 : gift.minTotal - subtotal,
        percent: gift.minTotal > 0 ? Math.min(100, Math.round((subtotal / gift.minTotal) * 100)) : 0,
      };
    })
    .sort((a, b) => a.remaining - b.remaining || a.minTotal - b.minTotal);
}

/**
 * Офертите, чието условие е ПРОДУКТ, спечелени за тази количка.
 *
 * Такава е кампанийната „вземи втора опаковка подарък": условието ѝ е
 * „продукт 58 е в количката", а наградата е същият продукт. Няма праг, няма
 * лента - или е спечелена, или я няма.
 */
export function productGifts(handlesInCart: Set<string>): GiftOffer[] {
  return current.gifts.filter(
    (gift) =>
      gift.requiresHandles.length &&
      gift.requiresHandles.some((h) => handlesInCart.has(h)),
  );
}

/*
 * ⛔ Тук стоеше `giftBonusByHandle` - знакът „+1 бр. безплатно" върху самия ред.
 *
 * Изхвърлен на 01.09, след като се изясни, че случаят, за който беше писан, е
 * невъзможен: вид на показване „Автоматично добавяне" заключва
 * `hide_cart_products`, тоест наградата НИКОГА не може да е продукт, който вече
 * е в количката. Платформата винаги прави ОТДЕЛЕН ред за подаръка - така се
 * вижда и на живата каса.
 *
 * Докато стоеше, знакът лъжеше в единствения случай, в който се появяваше: ред
 * с подаръчния продукт, купен с пари, получаваше надпис „+1 бр. безплатно",
 * а точно тогава офертата не се задейства.
 */

/**
 * The merchant has the same gift set up twice — once on "add to cart" and once
 * on "checkout" — with thresholds a cent apart. Showing it twice would read as
 * two different gifts, so identical rewards collapse to the easiest threshold.
 */
export function dedupeGifts(gifts: GiftOffer[]): GiftOffer[] {
  const byReward = new Map<string, GiftOffer>();
  for (const gift of gifts) {
    const key = `${gift.productTitle}|${Math.round(gift.minTotal)}|${gift.requiresHandles.join(',')}`;
    const seen = byReward.get(key);
    if (!seen || gift.minTotal < seen.minTotal) byReward.set(key, gift);
  }
  return [...byReward.values()];
}
