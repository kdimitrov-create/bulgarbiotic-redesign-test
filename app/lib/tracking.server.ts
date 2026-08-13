import {envValue} from './env.server';

/**
 * Идентификаторите за проследяване - едно място, откъдето тръгва всичко.
 *
 * Стойностите НЕ са измислени: извадени са от самия магазин през Admin API-то
 * и сверени с това, което живият bulgarbiotic.bg реално зарежда.
 *
 *   googleAppSettings(key: "google_tags")      → GTM-5X5M2HX      (активно)
 *   googleAppSettings(key: "google_analytics") → G-TJENFFMPTW     (активно)
 *   googleAppSettings(key: "google_dynamic")   → 830-437-6247     (Google Ads)
 *
 * ⚠️ GA4 и Google Ads НЕ се зареждат оттук. И двата са tag-ове ВЪТРЕ в
 * контейнера GTM-5X5M2HX (проверено в самия контейнер: `G-TJENFFMPTW` и
 * `AW-17779035215` стоят в тялото му). Зареди ли се и gtag.js паралелно,
 * всяко посещение и всяко събитие се брои ДВА пъти. Затова тук стои само
 * контейнерът - той пуска останалите.
 *
 * Meta и TikTok: и двата липсват на оригинала. Нито `fbq`, нито `ttq` се
 * срещат в HTML-а на bulgarbiotic.bg, нито в тялото на контейнера, а в
 * каталога с приложения на CloudCart изобщо няма Meta/TikTok pixel (само
 * feed-овете `app.xml_feed.facebook` и `app.xml_feed.tiktok`, които са
 * продуктови емисии, не пиксели). Значи ID-тата им идват от рекламните
 * акаунти на клиента - попълват се тук или през средата.
 */

/** Контейнерът на клиента. Той носи GA4 + Google Ads + Clarity. */
const GTM_ID = 'GTM-5X5M2HX';

/** Няма го на оригинала - чака ID от Meta Events Manager. */
const META_PIXEL_ID = '';

/** Няма го на оригинала - чака ID от TikTok Events Manager. */
const TIKTOK_PIXEL_ID = '';

/**
 * GA4 през gtag.js - НАРОЧНО празно.
 *
 * Оставено само като аварийна ръчка, ако някой ден контейнерът отпадне.
 * Докато `gtmId` е попълнен, това ТРЯБВА да остане празно (двойно броене).
 */
const GA_ID = '';

export type TrackingIds = {
  gtmId: string | null;
  metaPixelId: string | null;
  tiktokPixelId: string | null;
  gaId: string | null;
};

const clean = (v: string | undefined | null) => {
  const s = String(v ?? '').trim();
  return s ? s : null;
};

/**
 * Средата бие закованото, закованото бие празното.
 *
 * ⚠️ Storefront 111 няма НИТО ЕДНА променлива на средата (виж `docs/STATE.md`),
 * а локално `cloudcart nitrogen dev` подава на `ctx.env` само четири ключа.
 * Затова закованите стойности горе са това, което реално работи на живо -
 * средата е само предпазител, ако някой ден се добавят променливи от панела.
 */
export function resolveTracking(env: Record<string, string | undefined> | undefined): TrackingIds {
  return {
    gtmId: clean(envValue(env, 'PUBLIC_GTM_ID')) ?? clean(GTM_ID),
    metaPixelId: clean(envValue(env, 'PUBLIC_META_PIXEL_ID')) ?? clean(META_PIXEL_ID),
    tiktokPixelId: clean(envValue(env, 'PUBLIC_TIKTOK_PIXEL_ID')) ?? clean(TIKTOK_PIXEL_ID),
    gaId: clean(envValue(env, 'PUBLIC_GA_ID')) ?? clean(GA_ID),
  };
}
