import {useEffect} from 'react';
import {useRouteLoaderData, useLocation} from 'react-router';
import {
  CONSENT_EVENT,
  hasConsent,
  getCcPageData,
  pushCcPageData,
} from '~/lib/analytics';

/**
 * Зарежда контейнерите след съгласие (ACTION-PLAN blocker #5).
 *
 * Класическата тема прави три неща в този ред и всички tag-ове разчитат на
 * него: слага `window.cc_page_data`, бута го в `dataLayer`, чак тогава пуска
 * контейнера. `app/lib/analytics.ts` възпроизвежда договора; тук е частта,
 * която реално пуска скриптовете.
 *
 * Какво се зарежда:
 *   GTM  - контейнерът на клиента. ВЪТРЕ в него са GA4 и Google Ads, затова
 *          gtag.js НЕ се зарежда отделно (иначе двойно броене).
 *   Meta - собствен скрипт: пикселът НЕ е в контейнера.
 *   TikTok - собствен скрипт, по същата причина.
 *
 * Без съгласие не тръгва нищо. Събитията, натрупани в `dataLayer` преди
 * съгласието, не се губят: контейнерът изпива опашката, щом се зареди.
 */
export function Analytics() {
  const data = useRouteLoaderData('root') as
    | {
        tracking?: {
          gtmId?: string | null;
          metaPixelId?: string | null;
          tiktokPixelId?: string | null;
          gaId?: string | null;
        } | null;
      }
    | undefined;

  const gtmId = data?.tracking?.gtmId ?? null;
  const metaPixelId = data?.tracking?.metaPixelId ?? null;
  const tiktokPixelId = data?.tracking?.tiktokPixelId ?? null;
  const gaId = data?.tracking?.gaId ?? null;

  const {pathname} = useLocation();

  /* ---------------------------------------------------------------- */
  /* Данните за страницата - преди контейнера, както в класическата тема */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    pushCcPageData(getCcPageData(pathname));
  }, [pathname]);

  /* ---------------------------------------------------------------- */
  /* Скриптовете - веднъж, след съгласие                               */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!gtmId && !metaPixelId && !tiktokPixelId && !gaId) return;

    function load() {
      // Съгласието се чете през `hasConsent()`, а не директно от storage:
      // банерът пише в localStorage, а старите записи стоят в sessionStorage.
      if (!hasConsent()) return false;

      const w = window as any;
      if (w.__analyticsLoaded) return true;
      w.__analyticsLoaded = true;

      if (gtmId) {
        w.dataLayer = w.dataLayer || [];
        w.dataLayer.push({'gtm.start': Date.now(), event: 'gtm.js'});
        const s = document.createElement('script');
        s.async = true;
        s.src = 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(gtmId);
        document.head.appendChild(s);
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
        const ttq: any = (w.ttq = w.ttq || []);
        if (!ttq.__loaded) {
          ttq.__loaded = true;
          ttq.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie'];
          ttq.setAndDefer = function (obj: any, method: string) {
            obj[method] = function () {
              obj.push([method].concat(Array.prototype.slice.call(arguments, 0)));
            };
          };
          for (const m of ttq.methods) ttq.setAndDefer(ttq, m);
          ttq.load = function (id: string) {
            ttq._i = ttq._i || {};
            ttq._i[id] = [];
            ttq._t = ttq._t || {};
            ttq._t[id] = +new Date();
            ttq._o = ttq._o || {};
            ttq._o[id] = {};
            const s = document.createElement('script');
            s.async = true;
            s.src = 'https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=' + encodeURIComponent(id) + '&lib=ttq';
            document.head.appendChild(s);
          };
          ttq.load(tiktokPixelId);
          ttq.page();
        }
      }

      return true;
    }

    if (load()) return;

    // Още няма съгласие - изчакваме избора от банера. `setConsent` вдига
    // събитието нарочно, за да тръгне контейнерът без презареждане.
    function onConsent() {
      if (load()) window.removeEventListener(CONSENT_EVENT, onConsent);
    }
    window.addEventListener(CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(CONSENT_EVENT, onConsent);
  }, [gtmId, metaPixelId, tiktokPixelId, gaId]);

  return null;
}
