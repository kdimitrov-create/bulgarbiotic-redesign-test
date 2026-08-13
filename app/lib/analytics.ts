import {useEffect} from 'react';
import {useLocation} from 'react-router';

/**
 * Мостът между Nitrogen storefront-а и GTM контейнера (GTM-5X5M2HX).
 *
 * Класическата тема на CloudCart слага на всяка страница:
 *
 *   window.cc_page_data = {"type":"product","id":80,"name":"…","price":28.12,…}
 *   dataLayer.push({cc_page_data: window.cc_page_data})
 *
 * и чак после зарежда контейнера. Всички tag-ове вътре (GA4, Google Ads
 * remarketing + conversions, Meta Pixel) четат ТОЧНО тези имена на полета.
 *
 * Nitrogen рендерира собствен DOM, значи нищо от това не се случва само.
 * Тук възпроизвеждаме същия договор, за да остане контейнерът непокътнат -
 * без да пипаме нито един tag, trigger или conversion в GTM.
 *
 * Правило: имената на полетата НЕ се преименуват. Формата е копирана 1:1 от
 * живия bulgarbiotic.bg.
 */

export const CONSENT_KEY = 'bactology-cookies-v1';
/** Банерът вдига това, за да не чака GTM цял reload, за да види избора. */
export const CONSENT_EVENT = 'bb:consent';

export type CcPageData = {type: string; [key: string]: unknown};

/**
 * "gid://cloudcart/Product/80" → 80
 *
 * Storefront API-то връща id-та като gid низове, а CloudCart, GTM и
 * продуктовият feed работят с голото число. Подадем ли gid-а, Google Ads
 * dynamic remarketing няма да намери продукта във feed-а и аудиториите
 * остават празни.
 */
/**
 * handle → продуктово id, попълнено от сървъра.
 *
 * Редът в количката не носи id (виж `product-ids.server.ts`), затова
 * ecommerce събитията от количката се обръщат тук. Празна карта означава само
 * че id-то ще липсва - не чупи нищо.
 */
let idsByHandle: Record<string, string> = {};

export function setProductIds(next: Record<string, string> | null | undefined) {
  if (next && Object.keys(next).length) idsByHandle = next;
}

/** Продуктовото id за handle, или самия handle, ако картата не го знае. */
export function idForHandle(handle: string | undefined | null): string {
  const h = String(handle ?? '');
  return idsByHandle[h] ?? h;
}

export function numericId(idOrGid: unknown): number | string {
  const s = String(idOrGid ?? '');
  const m = s.match(/\/(\d+)$/);
  if (m) return Number(m[1]);
  return /^\d+$/.test(s) ? Number(s) : s;
}

/* ------------------------------------------------------------------ */
/* dataLayer                                                           */
/* ------------------------------------------------------------------ */

export function dataLayer(): any[] {
  const w = window as any;
  return (w.dataLayer = w.dataLayer || []);
}

export function pushEvent(event: string, payload: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  dataLayer().push({event, ...payload});
}

/**
 * Слага данните за страницата в dataLayer.
 *
 * Първият push с `undefined` не е излишен: GTM слива вложените обекти
 * РЕКУРСИВНО, така че след продуктова страница `cc_page_data.id` остава да
 * виси и на началната. Изчистваме ключа, после подаваме новия обект.
 */
export function pushCcPageData(data: CcPageData) {
  if (typeof window === 'undefined') return;
  (window as any).cc_page_data = data;
  dataLayer().push({cc_page_data: undefined});
  dataLayer().push({cc_page_data: data});
}

/* ------------------------------------------------------------------ */
/* GA4 ecommerce                                                       */
/* ------------------------------------------------------------------ */

export type EcomItem = {
  item_id: string | number;
  item_name: string;
  item_category?: string;
  price?: number;
  quantity?: number;
  index?: number;
};

/**
 * Стандартните GA4 ecommerce събития: view_item, view_item_list, select_item,
 * add_to_cart, view_cart, begin_checkout, purchase, search.
 *
 * Тези имена не са избрани от нас - проверени са срещу самия контейнер
 * GTM-5X5M2HX (публично четим на googletagmanager.com/gtm.js?id=…). Вътре
 * тригерите чакат точно тях, а променливите четат `eventModel.items.0.item_id`,
 * `eventModel.value`, `eventModel.currency`. Значи подадем ли ги в този вид,
 * GA4 и Google Ads проработват БЕЗ да се пипа нищо в контейнера.
 */
export function pushEcommerce(
  event: string,
  payload: {currency?: string; value?: number; items: EcomItem[]; [key: string]: unknown},
) {
  if (typeof window === 'undefined') return;
  // Без нулиране следващото събитие наследява продуктите от предишното -
  // GTM пази стария `ecommerce` обект и ги слива.
  dataLayer().push({ecommerce: null});
  dataLayer().push({event, ecommerce: payload});
  pushMetaEvent(event, payload);
  pushTikTokEvent(event, payload);
}

/**
 * Meta Pixel-ът не е в GTM контейнера, значи не получава нищо от dataLayer.
 * Вместо да описваме събитията два пъти, тук се превежда едно и също
 * повикване към речника на Meta.
 *
 * `content_ids` трябва да съвпадат с ID-тата в каталога на Meta - това са
 * същите голи числа на CloudCart, които подаваме и на Google.
 */
/**
 * ⚠️ Нарочно БЕЗ `begin_checkout` и `purchase`.
 *
 * Касата и количката не са наши: `/cart` и `/checkout` са резервирани пътища и
 * ги рисува класическата тема. Там приложението „Facebook Dynamic Ads" вече
 * пуска `facebook_pixel.min.js` и сам подава `InitiateCheckout` и `Purchase`
 * (проверено на живо на bulgarbiotic.bg - скриптът се зарежда на страницата).
 *
 * Платформата НЕ засича повторно инсталиран пиксел. Подадем ли и ние същите
 * две събития, всяка поръчка се брои два пъти и ROAS-ът става двойно по-хубав,
 * отколкото е. Затова тук стоят само събитията, които класическата тема вече
 * не вижда, защото Nitrogen е поел тези страници.
 */
const META_EVENTS: Record<string, string> = {
  view_item: 'ViewContent',
  add_to_cart: 'AddToCart',
  search: 'Search',
};

function pushMetaEvent(
  event: string,
  payload: {currency?: string; value?: number; items: EcomItem[]; [key: string]: unknown},
) {
  const name = META_EVENTS[event];
  const fbq = (window as any).fbq;
  if (!name || typeof fbq !== 'function') return;
  const items = payload.items ?? [];
  fbq('track', name, {
    content_type: 'product',
    content_ids: items.map((i) => String(i.item_id)),
    contents: items.map((i) => ({id: String(i.item_id), quantity: i.quantity ?? 1})),
    content_name: items[0]?.item_name,
    value: payload.value,
    currency: payload.currency,
  });
}

/**
 * Същото за TikTok. Пикселът също не е в контейнера, значи и той не вижда
 * нищо от dataLayer.
 *
 * Имената са стандартните на TikTok Events Manager - подадем ли своите
 * (`add_to_cart`), отчетите остават празни, защото TikTok ги мери по своите.
 * `content_id` е същото голо число на CloudCart, което подаваме на Google и
 * на Meta - така един и същ продукт се разпознава и в трите каталога.
 */
/** Същото разделение като при Meta - касата се брои от платформата. */
const TIKTOK_EVENTS: Record<string, string> = {
  view_item: 'ViewContent',
  add_to_cart: 'AddToCart',
  search: 'Search',
};

function pushTikTokEvent(
  event: string,
  payload: {currency?: string; value?: number; items: EcomItem[]; [key: string]: unknown},
) {
  const name = TIKTOK_EVENTS[event];
  const ttq = (window as any).ttq;
  if (!name || !ttq || typeof ttq.track !== 'function') return;
  const items = payload.items ?? [];
  ttq.track(name, {
    contents: items.map((i) => ({
      content_id: String(i.item_id),
      content_type: 'product',
      content_name: i.item_name,
      quantity: i.quantity ?? 1,
      price: i.price,
    })),
    value: payload.value,
    currency: payload.currency,
  });
}

/**
 * Пуска ecommerce събитие веднъж на посещение на страницата, не на всеки render.
 *
 * Не чака съгласие нарочно: push-ът пише в обикновен масив в паметта - нула
 * бисквитки, нула мрежови заявки. Ако посетителят приеме после, контейнерът
 * тръгва и изпива цялата опашка, включително това събитие. Иначе `view_item`
 * на първата отворена страница се губеше винаги.
 */
export function useEcommerceEvent(
  event: string,
  payload: {currency?: string; value?: number; items: EcomItem[]; [key: string]: unknown},
) {
  const json = JSON.stringify(payload);
  useEffect(() => {
    pushEcommerce(event, JSON.parse(json));
  }, [event, json]);
}

/* ------------------------------------------------------------------ */
/* Съгласие                                                            */
/* ------------------------------------------------------------------ */

export function hasConsent(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    // sessionStorage се чете само за миграция: старият банер пазеше избора
    // там, тоест съгласието се губеше при всяко ново табче.
    return (
      localStorage.getItem(CONSENT_KEY) === 'accepted' ||
      sessionStorage.getItem(CONSENT_KEY) === 'accepted'
    );
  } catch {
    // Safari в частен режим и блокирани бисквитки хвърлят при достъп.
    return false;
  }
}

export function setConsent(value: 'accepted' | 'rejected') {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    /* без storage просто няма да се запомни между зарежданията */
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, {detail: value}));
}

export function readConsent(): string | null {
  try {
    return localStorage.getItem(CONSENT_KEY) ?? sessionStorage.getItem(CONSENT_KEY);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Данни за текущата страница                                          */
/* ------------------------------------------------------------------ */

/**
 * Пази се заедно с пътя, за който е записано. Така страница, която не е
 * извикала `useCcPage`, не наследява данните на предишната - вместо това
 * <Analytics/> получава неутралното {type: 'other'}.
 */
let current: {path: string; data: CcPageData} | null = null;

export function getCcPageData(path: string): CcPageData {
  return current && current.path === path ? current.data : {type: 'other'};
}

/**
 * Извиква се от route компонента, за да опише страницата пред GTM.
 *
 *   useCcPage({type: 'product', id: 80, name: product.title, …});
 *
 * Ефектът тук се изпълнява ПРЕДИ ефекта на <Analytics/>, защото route-ът
 * стои по-нагоре в дървото (PageLayout рендерира {children} преди
 * <Analytics/>). Значи данните са налични, когато контейнерът тръгне.
 */
export function useCcPage(data: CcPageData) {
  const {pathname} = useLocation();
  const json = JSON.stringify(data);
  useEffect(() => {
    current = {path: pathname, data: JSON.parse(json)};
  }, [pathname, json]);
}
