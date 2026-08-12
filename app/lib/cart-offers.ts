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
  /** Cart total, in store currency, above which the gift is earned. */
  minTotal: number;
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

export interface CartOffers {
  gifts: GiftOffer[];
  rules: CartRuleNotice[];
}

const EMPTY: CartOffers = {gifts: [], rules: []};

let current: CartOffers = EMPTY;

export function setCartOffers(next: CartOffers | null | undefined) {
  if (!next) return;
  if (!next.gifts.length && !next.rules.length) return;
  current = next;
}

export function cartOffers(): CartOffers {
  return current;
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
 * The merchant has the same gift set up twice — once on "add to cart" and once
 * on "checkout" — with thresholds a cent apart. Showing it twice would read as
 * two different gifts, so identical rewards collapse to the easiest threshold.
 */
export function dedupeGifts(gifts: GiftOffer[]): GiftOffer[] {
  const byReward = new Map<string, GiftOffer>();
  for (const gift of gifts) {
    const key = `${gift.productTitle}|${Math.round(gift.minTotal)}`;
    const seen = byReward.get(key);
    if (!seen || gift.minTotal < seen.minTotal) byReward.set(key, gift);
  }
  return [...byReward.values()];
}
