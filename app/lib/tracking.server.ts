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
 * Контейнерът на самата CloudCart - платформеният, не на търговеца.
 *
 * Платформата го слага на всеки магазин с класическа тема. Проверено на живо
 * на 18.08.2026: zora.bg вдига GTM-NXSHC5J + GTM-KT8R2G, visvitalis.bg вдига
 * GTM-NZBDW4N9 + GTM-KT8R2G. Нашата витрина замества класическата тема, затова
 * при нас той не идва от само себе си - слага се оттук.
 *
 * ⚠️ Днес на ТОЗИ магазин пуска почти нищо. Тялото му е разчетено: от 21
 * правила 20 са заковани за чужди домейни (zora.bg, webstore.peugeot.bg,
 * thecomicweb.com, alexandertomov), а за bulgarbiotic няма нито дума.
 * Единственото правило „за всички" вдига 9 tag-а, от които 6 са НА ПАУЗА,
 * 2 са само слушатели (клик и видимост на `div.cc-order-details-product-name` -
 * селектор от класическата тема, който в нашия HTML не съществува), и един
 * работи: детектор за роботи, който праща POST към detector.p-iliev.workers.dev.
 *
 * Стои тук за еднаквост с другите магазини: добави ли CloudCart утре tag за
 * bulgarbiotic, той тръгва без да пипаме код. Цената е ~364 KB контейнер на
 * зареждане, но от CDN-а на Google - тоест страницата натежава, магазинът НЕ
 * се товари. Виж `docs/ANALYTICS.md`.
 *
 * ⛔ Внимание при подмяна. Този контейнер НЕ носи Cookiebot в тялото си
 * (проверено - нула споменавания) и точно затова е безопасен като втори.
 * Сложи ли се тук контейнер, който носи Cookiebot, банерът се вдига ДВА пъти -
 * това вече се е случвало и е причината полето да стои празно до 18.08.2026.
 */
const PLATFORM_GTM_ID = 'GTM-KT8R2G';


/**
 * ⛔ Clarity НЕ се зарежда оттук. Проектът `vjuooarrx2` на клиента върви вътре
 * в контейнера GTM-5X5M2HX (tag 72) и записва на всяка страница.
 *
 * Опитахме втори наш проект (`y47ik4x1t3`, 18.08.2026) и той ИЗБИ клиентския.
 * Clarity записва ЕДИН проект на страница: който фрагмент се качи пръв, вика
 * `start`, а вторият вижда вдигнат `clarity` и се отказва - праща само събитие
 * `dup.<projectId>` и не записва нищо. Мерено на живо: разликата беше 17 ms
 * (566 срещу 583), тоест кой печели е НАДПРЕВАРА, не решение - при друга мрежа
 * редът се обръща.
 *
 * Решено (клиент, 18.08.2026): остава този на клиента, в GTM.
 * Виж `docs/ANALYTICS.md`.
 */

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
 * Числовото id на магазина - за СОБСТВЕНАТА аналитика на CloudCart.
 *
 * Тя пълни таблото в админ панела и върви на адрес `cca.cloudcart.com/<id>`.
 * Класическата тема я вдига сама; нашата витрина я замества, значи трябва да я
 * вдигнем ние. Виж `app/lib/cc-analytics.ts`.
 *
 * ⭐ Откъде е числото: адресът на продуктовата емисия, издаден от админ панела
 * на ТОЗИ магазин, е `/csv_feed/MjYzNzctZ29vZ2xlX2Fkd29yZHM`, а това в base64 е
 * `26377-google_adwords`. Същият шаблон е проверен на два чужди магазина:
 * `10383-google_adwords` ↔ `cca.cloudcart.com/10383` (visvitalis.bg) и
 * `402-…` ↔ `cca.cloudcart.com/402` (zora.bg).
 *
 * ⚠️ Beacon-ът НЕ може да потвърди числото - връща `void(0)` с код 200 на
 * всяко id, включително измислено (проверено на 20.08.2026 с `99999999`).
 * Тоест грешно id се приема мълчаливо и таблото остава празно.
 * Проверката е в админ панела: Статистика → има ли посещения от днес.
 */
const CC_STORE_ID = '26377';

/**
 * GA4 през gtag.js - НАРОЧНО празно.
 *
 * Оставено само като аварийна ръчка, ако някой ден контейнерът отпадне.
 * Докато `gtmId` е попълнен, това ТРЯБВА да остане празно (двойно броене).
 */
const GA_ID = '';

/**
 * GA4 мостът за ecommerce събитията от каталога.
 *
 * ⚠️ Това НЕ зарежда gtag.js (за разлика от GA_ID). Praща gtag('event', …,
 * {send_to}) през дестинацията, която контейнерът вече е вдигнал.
 *
 * Защо съществува (установено на 20.08.2026, проверено ВЪТРЕ в GTM и GA4):
 *   - Контейнерът GTM-5X5M2HX НИКОГА не е имал GA4 event тагове. Единственият
 *     GA4 таг е конфигурацията (Google Tag, tag 59) - тя праща само page_view.
 *     Паузираните тагове по CE-тригерите са TikTok Pixel, не GA4.
 *   - view_item / add_to_cart / view_cart и т.н. в GA4 идваха от САМАТА
 *     класическа тема (платформата ги праща директно, не през контейнера).
 *     При превключването към витрината (16-17.08) каталожният фунел спря.
 *   - Касата остава платформена: begin_checkout, add_shipping_info,
 *     add_payment_info и purchase продължават да пристигат в GA4 от /checkout.
 *     Затова мостът праща САМО каталожните събития (виж GA4_BRIDGE_EVENTS в
 *     `analytics.ts`) - касовите биха се броили двойно.
 *   - Доказано на живо: gtag('event', …, {send_to: 'G-TJENFFMPTW'}) от наша
 *     страница стигна до Realtime на property-то (тест `nitro_bridge_test2`).
 *
 * ⛔ Добави ли Metrix GA4 event тагове в контейнера, мостът се маха ОТТУК
 * (или те не ги добавят) - двете заедно броят двойно. Виж `docs/ANALYTICS.md`.
 */
const GA4_BRIDGE_ID = 'G-TJENFFMPTW';

export type TrackingIds = {
  gtmId: string | null;
  platformGtmId: string | null;
  metaPixelId: string | null;
  tiktokPixelId: string | null;
  gaId: string | null;
  ccStoreId: string | null;
  ga4BridgeId: string | null;
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
    platformGtmId: clean(envValue(env, 'PUBLIC_PLATFORM_GTM_ID')) ?? clean(PLATFORM_GTM_ID),
    metaPixelId: clean(envValue(env, 'PUBLIC_META_PIXEL_ID')) ?? clean(META_PIXEL_ID),
    tiktokPixelId: clean(envValue(env, 'PUBLIC_TIKTOK_PIXEL_ID')) ?? clean(TIKTOK_PIXEL_ID),
    gaId: clean(envValue(env, 'PUBLIC_GA_ID')) ?? clean(GA_ID),
    ccStoreId: clean(envValue(env, 'PUBLIC_CC_STORE_ID')) ?? clean(CC_STORE_ID),
    ga4BridgeId: clean(envValue(env, 'PUBLIC_GA4_BRIDGE_ID')) ?? clean(GA4_BRIDGE_ID),
  };
}
