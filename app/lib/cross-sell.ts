/**
 * Изскачащият прозорец на кръстосаните оферти - общото за сървъра и браузъра.
 *
 * Панелът (Маркетинг → Cross-Sell & UpSell) пази оферти „при добавяне в
 * количката → покажи прозорец с тези продукти". Класическата тема ги рисува
 * със свой скрипт, който на Nitrogen страница не съществува - затова до
 * 07.10.2026 нито една такава оферта не се показваше тук, а бутонът „Преглед"
 * в панела водеше на 404.
 *
 * Правилата повтарят платформата (wiki: cross-sell-filters-limits,
 * cross-sell-view-tracking): таванът на показванията и отказите се пазят в
 * бисквитки за 7 дни, тоест са на браузър, не на клиент.
 */

export interface CrossSellProduct {
  handle: string;
  title: string;
  imageUrl: string | null;
  price: number;
  /** Цената след отстъпката на офертата; `null` - офертата няма отстъпка. */
  offerPrice: number | null;
  /** Вариантът за количката. Само когато вариантът е един - иначе изборът е на
   *  клиента и бутонът води към продуктовата страница. */
  variantId: string | null;
}

export interface CrossSellOffer {
  id: string;
  title: string;
  description: string | null;
  buttonName: string;
  cancelButtonName: string;
  background: string | null;
  textColor: string | null;
  buttonBackground: string | null;
  buttonTextColor: string | null;
  /** none | confetti | fireworks | school_pride */
  popupEffect: string | null;
  /** Надпис за отстъпката („−15,00 €", „−20%", „Подарък", „Безплатна доставка"). */
  discountLabel: string | null;
  maxUserViews: number | null;
  products: CrossSellProduct[];
}

/** Колко пъти е видян всеки прозорец: `{"65": 2}`. */
export const VIEW_COOKIE = 'bb_cs_view';
/** Отказаните оферти: `65.43`. Отказаната не се показва повече. */
export const CANCEL_COOKIE = 'bb_cs_cancel';
/**
 * Браузърът на търговеца: отворил е прегледа от панела и вижда и офертите в
 * пясъчник. Класическата тема ги пуска само за влезлия администратор; тук
 * сесията на панела не се вижда, затова отключването е прегледът.
 */
export const SANDBOX_COOKIE = 'bb_cs_sandbox';
/** 7 дни - колкото и сесията на платформата. */
export const COOKIE_MAX_AGE_S = 7 * 24 * 60 * 60;

/** Събитието, с което `useTrackAddToCart` казва „този продукт току-що влезе". */
export const CROSS_SELL_EVENT = 'bb:cross-sell';

export interface CrossSellTrigger {
  handle: string;
  /** Продуктите в количката след добавянето - за „скрий продуктите в количката". */
  cartHandles: string[];
  /** Сумата на количката в евро - за условията „количката е над X". */
  subtotal: number;
}

export function parseCookies(header: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of String(header ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (!k) continue;
    try {
      out[k] = decodeURIComponent(part.slice(i + 1).trim());
    } catch {
      out[k] = part.slice(i + 1).trim();
    }
  }
  return out;
}

export function readViews(raw: string | undefined): Record<string, number> {
  try {
    const parsed = JSON.parse(raw || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function readCancelled(raw: string | undefined): Set<string> {
  return new Set(String(raw ?? '').split('.').filter(Boolean));
}

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${COOKIE_MAX_AGE_S}; Path=/; SameSite=Lax`;
}

/** Брои едно показване - вика се, когато прозорецът наистина се е отворил. */
export function rememberView(offerId: string) {
  if (typeof document === 'undefined') return;
  const views = readViews(parseCookies(document.cookie)[VIEW_COOKIE]);
  views[offerId] = (Number(views[offerId]) || 0) + 1;
  writeCookie(VIEW_COOKIE, JSON.stringify(views));
}

/** „Не, благодаря" - тази оферта не излиза повече в този браузър. */
export function rememberCancel(offerId: string) {
  if (typeof document === 'undefined') return;
  const ids = readCancelled(parseCookies(document.cookie)[CANCEL_COOKIE]);
  ids.add(offerId);
  writeCookie(CANCEL_COOKIE, [...ids].join('.'));
}

export function fmtEur(n: number): string {
  return (
    new Intl.NumberFormat('bg-BG', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(n) +
    ' €'
  );
}
