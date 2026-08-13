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

/**
 * Вторият контейнер на живия магазин - управлението на съгласието.
 *
 * Проверен: нула пиксела вътре, но 59 споменавания на „consent". Той бута
 * `cookie_consent_*` в dataLayer и точно затова `fbq` стои неинициализиран на
 * bulgarbiotic.bg, докато посетителят не приеме маркетинговите бисквитки.
 *
 * ⚠️ НАРОЧНО ИЗКЛЮЧЕН. Този редизайн си има собствен банер (`CookieBanner`).
 * Пуснат едновременно с него, посетителят получава ДВА банера, които се борят
 * за един и същ избор. Включва се чак когато се реши кой от двата остава -
 * тогава тук се слага 'GTM-KT8R2G' и `CookieBanner` отпада.
 */
const CONSENT_GTM_ID = '';

/**
 * Meta Pixel на магазина.
 * Източник: marketingAppSettings(key: "app.xml_feed.facebook").pixel
 * Живият магазин го зарежда през `facebook_pixel.min.js` (приложението
 * „Facebook Dynamic Ads"), но само на страници, които рисува класическата тема.
 */
const META_PIXEL_ID = '530956661433130';

/**
 * TikTok Pixel на магазина.
 * Източник: marketingAppSettings(key: "app.xml_feed.tiktok").pixel_code
 * ⚠️ Events API-то на TikTok е ВКЛЮЧЕНО (`capi_status: 1`), тоест платформата
 * праща и сървърни събития. Преди пускане на живо се проверява в TikTok Events
 * Manager дали `AddToCart` не се брои два пъти - веднъж от нашия браузърен
 * пиксел и веднъж сървърно от `/cart/add`.
 */
const TIKTOK_PIXEL_ID = 'CQ1VKIJC77U1G0V3L16G';

/**
 * GA4 през gtag.js - НАРОЧНО празно.
 *
 * Оставено само като аварийна ръчка, ако някой ден контейнерът отпадне.
 * Докато `gtmId` е попълнен, това ТРЯБВА да остане празно (двойно броене).
 */
const GA_ID = '';

export type TrackingIds = {
  gtmId: string | null;
  consentGtmId: string | null;
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
    consentGtmId: clean(envValue(env, 'PUBLIC_CONSENT_GTM_ID')) ?? clean(CONSENT_GTM_ID),
    metaPixelId: clean(envValue(env, 'PUBLIC_META_PIXEL_ID')) ?? clean(META_PIXEL_ID),
    tiktokPixelId: clean(envValue(env, 'PUBLIC_TIKTOK_PIXEL_ID')) ?? clean(TIKTOK_PIXEL_ID),
    gaId: clean(envValue(env, 'PUBLIC_GA_ID')) ?? clean(GA_ID),
  };
}
