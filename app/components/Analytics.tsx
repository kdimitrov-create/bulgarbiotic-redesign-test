import {useEffect, useRef} from 'react';
import {useRouteLoaderData, useLocation} from 'react-router';
import {
  getCcPageData,
  pushCcPageData,
  pushCcCustomerData,
  pushPageView,
  flushPendingEvents,
  GUEST_CUSTOMER_DATA,
  type CcCustomerData,
  setGa4BridgeId,
} from '~/lib/analytics';
import {
  loadCloudCartAnalytics,
  flushCloudCartEvents,
  ccUpdateCustomer,
  ccPageView,
} from '~/lib/cc-analytics';

/**
 * Зарежда контейнерите след съгласие (ACTION-PLAN blocker #5).
 *
 * Класическата тема прави три неща в този ред и всички tag-ове разчитат на
 * него: слага `window.cc_page_data`, бута го в `dataLayer`, чак тогава пуска
 * контейнера. `app/lib/analytics.ts` възпроизвежда договора; тук е частта,
 * която реално пуска скриптовете.
 *
 * Какво се зарежда:
 *   GTM  - ДВА контейнера. Първият е на клиента (GTM-5X5M2HX): ВЪТРЕ в него са
 *          GA4, Google Ads, Clarity и Cookiebot, затова gtag.js НЕ се зарежда
 *          отделно (иначе двойно броене). Вторият е на самата CloudCart
 *          (GTM-KT8R2G) - платформата го слага на всеки магазин с класическа
 *          тема, а нашата витрина я замества, затова го слагаме ние.
 *   Meta - собствен скрипт: пикселът НЕ е в контейнера.
 *   TikTok - собствен скрипт, по същата причина.
 *
 *
 * ⛔ Clarity НЕ се зарежда оттук. `vjuooarrx2` на клиента е вътре в контейнера
 * GTM-5X5M2HX (tag 72) и записва на всяка страница. Втори проект от кода ГО
 * ИЗБИВА - Clarity записва един проект на страница, първият качил се печели,
 * вторият праща само `dup.<projectId>`. Пробвано и върнато на 18.08.2026.
 *
 * Без съгласие не тръгва нищо. Събитията, натрупани в `dataLayer` преди
 * съгласието, не се губят: контейнерът изпива опашката, щом се зареди.
 */
export function Analytics() {
  const data = useRouteLoaderData('root') as
    | {
        tracking?: {
          gtmId?: string | null;
          platformGtmId?: string | null;
          metaPixelId?: string | null;
          tiktokPixelId?: string | null;
          gaId?: string | null;
          ccStoreId?: string | null;
          ga4BridgeId?: string | null;
        } | null;
        customer?: {
          id?: number | string | null;
          first_name?: string | null;
          last_name?: string | null;
          email?: string | null;
        } | null;
      }
    | undefined;

  const gtmId = data?.tracking?.gtmId ?? null;
  const platformGtmId = data?.tracking?.platformGtmId ?? null;
  const metaPixelId = data?.tracking?.metaPixelId ?? null;
  const tiktokPixelId = data?.tracking?.tiktokPixelId ?? null;
  const gaId = data?.tracking?.gaId ?? null;
  const ccStoreId = data?.tracking?.ccStoreId ?? null;
  const viewer = data?.customer ?? null;
  const ga4BridgeId = data?.tracking?.ga4BridgeId ?? null;

  const {pathname} = useLocation();

  /* ---------------------------------------------------------------- */
  /* GA4 мостът - id-то отива в analytics.ts и опашката се изпива      */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    setGa4BridgeId(ga4BridgeId);
  }, [ga4BridgeId]);

  /* ---------------------------------------------------------------- */
  /* Данните за страницата - преди контейнера, както в класическата тема */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    const page = getCcPageData(pathname);
    /* Контейнерът чете седем полета от `cc_page_data`. Дотук пълнехме едно
     * (`locale`) и трите за клиента стояха празни - тоест Enhanced Conversions
     * на Google Ads вървяха без подобрените данни. Двете за касата
     * (`chosen_shipping.*`) не са наши: `/checkout` го рисува платформата. */
    pushCcPageData({
      locale: 'bg_BG',
      ...page,
      customer: {
        first_name: viewer?.first_name ?? null,
        last_name: viewer?.last_name ?? null,
        email: viewer?.email ?? null,
      },
    });

    /* Вторият обект, който платформата подава през `/datalayer.js` - път,
     * който при нас е 404, защото домейнът е насочен към витрината. */
    const customerData: CcCustomerData = viewer
      ? {
          ...GUEST_CUSTOMER_DATA,
          id: viewer.id ?? null,
          group_id: null,
          group_name: null,
          first_name: viewer.first_name ?? null,
          last_name: viewer.last_name ?? null,
          full_name:
            [viewer.first_name, viewer.last_name].filter(Boolean).join(' ') || null,
          email: viewer.email ?? null,
          type: 'customer',
        }
      : GUEST_CUSTOMER_DATA;
    pushCcCustomerData(customerData);
  }, [pathname, viewer]);

  /* ---------------------------------------------------------------- */
  /* Собствената аналитика на CloudCart - таблото в админ панела       */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if (!ccStoreId) return;
    let alive = true;
    loadCloudCartAnalytics(ccStoreId).then(() => {
      if (!alive) return;
      flushCloudCartEvents();
    });
    return () => {
      alive = false;
    };
  }, [ccStoreId]);

  /* Едно посещение на страница при всяка смяна на маршрута.
   *
   * ⭐ Класическата тема праща по едно на зареждане; в SPA зарежданията ги
   * няма, значи без този ефект цялата сесия щеше да се брои като една
   * страница - точно както се случва днес и на GA4 (виж `docs/ANALYTICS-
   * ASSESSMENT-2026-08-20.md`, точка A1).
   *
   * Събитията, изпреварили скрипта, чакат в опашка и се пращат от ефекта горе. */
  useEffect(() => {
    if (!ccStoreId) return;
    ccUpdateCustomer(
      viewer ? {subscriber_id: viewer.id ?? null, type: 'customer'} : null,
    );
    ccPageView(getCcPageData(pathname));
  }, [ccStoreId, pathname, viewer]);

  /* ---------------------------------------------------------------- */
  /* Преглед на страница при смяна на маршрут (SPA)                    */
  /* ---------------------------------------------------------------- */
  const firstRender = useRef(true);
  useEffect(() => {
    // Първият преглед идва от самата инициализация на пикселите.
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    pushPageView();
  }, [pathname]);

  /* ---------------------------------------------------------------- */
  /* Скриптовете - веднъж, след съгласие                               */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!gtmId && !platformGtmId && !metaPixelId && !tiktokPixelId && !gaId) return;

    /* Съгласието вече е на Cookiebot, не наше.
     *
     * Собственият банер отпадна (клиент, 17.08.2026): Cookiebot идва вътре в
     * контейнера GTM-5X5M2HX и посетителят получаваше ДВА банера един след
     * друг - нашия, а щом го приеме и контейнерът се вдигне, и този на
     * Cookiebot. Мерено на живо същия ден.
     *
     * ⚠️ Затова контейнерът вече се вдига БЕЗУСЛОВНО. Останеше ли старата
     * проверка без банер, който да я изпълни, GTM никога не тръгва - а с него
     * не тръгва и Cookiebot, тоест сайтът остава изобщо без управление на
     * съгласието.
     *
     * Какво пуска какво:
     *   • GA4, Google Ads, Clarity - в контейнера, Cookiebot ги пуска и спира
     *     през Consent Mode;
     *   • Meta и TikTok - наши, извън контейнера, затова чакат маркетинговото
     *     съгласие на Cookiebot тук долу. Пуснати безусловно, те биха се
     *     задействали и при отказ.
     */
    function loadContainers() {
      const w = window as any;
      /* Обикновено вече е свършено от реда в `<head>` (виж `root.tsx`): той
         тръгва на `DOMContentLoaded`, тоест доста преди хидратацията. Тогава
         тук остава само да се изпие опашката - затова `flushPendingEvents`
         НЕ е вътре в проверката. Дотук беше и провалът се маскираше: ранният
         изход прескачаше и изпиването. */
      if (!w.__analyticsLoaded) {
        w.__analyticsLoaded = true;

        // Резервен път: ако редът в `<head>` не се е изпълнил.
        const containers = [gtmId, platformGtmId].filter(Boolean) as string[];
        if (containers.length) {
          w.dataLayer = w.dataLayer || [];
          w.dataLayer.push({'gtm.start': Date.now(), event: 'gtm.js'});
          for (const id of containers) {
            const s = document.createElement('script');
            s.async = true;
            s.src = 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(id);
            document.head.appendChild(s);
          }
        }
      }

      // Само ако контейнерът липсва - иначе GA4 се брои два пъти.
      if (gaId && !gtmId) {
        const s = document.createElement('script');
        s.async = true;
        s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(gaId);
        document.head.appendChild(s);
        w.dataLayer = w.dataLayer || [];
        w.gtag = function () {
          w.dataLayer.push(arguments);
        };
        w.gtag('js', new Date());
        w.gtag('config', gaId);
      }

      flushPendingEvents();
      return true;
    }

    /** Пикселите извън контейнера - само при маркетингово съгласие. */
    function loadPixels() {
      const w = window as any;
      if (w.__pixelsLoaded) return true;
      w.__pixelsLoaded = true;

      if (metaPixelId) {
        const n: any = (w.fbq = function () {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        });
        if (!w._fbq) w._fbq = n;
        n.push = n;
        n.loaded = true;
        n.version = '2.0';
        n.queue = [];
        const t = document.createElement('script');
        t.async = true;
        t.src = 'https://connect.facebook.net/en_US/fbevents.js';
        document.head.appendChild(t);
        w.fbq('init', metaPixelId);
        w.fbq('track', 'PageView');
      }

      if (tiktokPixelId) {
        // Официалният зареждащ фрагмент на TikTok, свит до нужното: опашка
        // от методи, която истинският SDK изпива, щом се качи.
        // ⚠️ БЕЗ този ред TikTok не тръгва. `events.js` се качва (200, 9 KB),
        // `ttq.track` съществува и не гърми нищо - но SDK-то чете оттук името
        // на глобалната променлива с опашката. Не го ли намери, никога не поема
        // щафетата: събитията се трупат в масива и НИТО ЕДНА заявка не излиза.
        // Точно това видяхме на живо - пикселът изглеждаше зареден и мълчеше.
        w.TiktokAnalyticsObject = 'ttq';
        const ttq: any = (w.ttq = w.ttq || []);
        if (!ttq.__loaded) {
          ttq.__loaded = true;
          ttq.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie', 'holdConsent', 'revokeConsent', 'grantConsent'];
          ttq.setAndDefer = function (obj: any, method: string) {
            obj[method] = function () {
              obj.push([method].concat(Array.prototype.slice.call(arguments, 0)));
            };
          };
          for (const m of ttq.methods) ttq.setAndDefer(ttq, m);
          ttq.instance = function (id: string) {
            const inst = ttq._i[id] || [];
            for (const m of ttq.methods) ttq.setAndDefer(inst, m);
            return inst;
          };
          ttq.load = function (id: string, opts?: Record<string, unknown>) {
            // ⚠️ `_u` НЕ е излишно. SDK-то чете оттам собствения си адрес, за да
            // си дозареди останалите парчета. Без него `events.js` се качва,
            // `ttq.track` съществува - и НИЩО не тръгва по мрежата. Точно това
            // се случи при първата проверка на живо: TikTok мълчеше, а всичко
            // изглеждаше наред. Взето 1:1 от официалния фрагмент на TikTok.
            const url = 'https://analytics.tiktok.com/i18n/pixel/events.js';
            ttq._i = ttq._i || {};
            ttq._i[id] = [];
            ttq._i[id]._u = url;
            ttq._t = ttq._t || {};
            ttq._t[id] = +new Date();
            ttq._o = ttq._o || {};
            ttq._o[id] = opts || {};
            const s = document.createElement('script');
            s.async = true;
            s.src = url + '?sdkid=' + encodeURIComponent(id) + '&lib=ttq';
            document.head.appendChild(s);
          };
          ttq.load(tiktokPixelId);
          ttq.page();
        }
      }

      // Събитията на текущата страница вече са минали, преди пикселите да ги
      // има - подаваме им ги сега, иначе първата отворена страница не се отчита.
      flushPendingEvents();

      return true;
    }

    // Контейнерът тръгва веднага - с него идва и самият Cookiebot.
    loadContainers();

    /** Дал ли е посетителят маркетингово съгласие в Cookiebot. */
    function marketingAllowed(): boolean {
      const cb = (window as any).Cookiebot;
      return cb?.consent?.marketing === true;
    }

    if (marketingAllowed()) {
      loadPixels();
      return;
    }

    /* Cookiebot известява избора със свои събития. Слушаме и двете, защото
       „приемам всички" и „само необходимите" минават по различни пътища, а
       посетителят може да си промени избора по-късно от иконката. */
    function onCookiebot() {
      if (marketingAllowed()) {
        loadPixels();
        window.removeEventListener('CookiebotOnAccept', onCookiebot);
        window.removeEventListener('CookiebotOnConsentReady', onCookiebot);
      }
    }
    window.addEventListener('CookiebotOnAccept', onCookiebot);
    window.addEventListener('CookiebotOnConsentReady', onCookiebot);
    return () => {
      window.removeEventListener('CookiebotOnAccept', onCookiebot);
      window.removeEventListener('CookiebotOnConsentReady', onCookiebot);
    };
  }, [gtmId, platformGtmId, metaPixelId, tiktokPixelId, gaId]);

  return null;
}
