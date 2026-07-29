import {useEffect} from 'react';
import {useRouteLoaderData} from 'react-router';

const CONSENT_KEY = 'bactology-cookies-v1';

/**
 * GDPR-safe analytics loader (ACTION-PLAN blocker #5).
 *
 * Injects Google Analytics 4 + Meta Pixel ONLY when:
 *   1. the visitor accepted cookies (CookieBanner → sessionStorage), AND
 *   2. the IDs are configured.
 *
 * IDs travel from env via the root loader (`gaId` / `pixelId`). To activate:
 *   - add `PUBLIC_GA_ID` / `PUBLIC_META_PIXEL_ID` to `.env` (local dev), and
 *   - add the same as Nova worker bindings in `.github/workflows/nova-deploy.yml`.
 * Until then this renders nothing — safe no-op.
 */
export function Analytics() {
  const data = useRouteLoaderData('root') as
    | {gaId?: string | null; pixelId?: string | null}
    | undefined;
  const gaId = data?.gaId ?? null;
  const pixelId = data?.pixelId ?? null;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(CONSENT_KEY) !== 'accepted') return;
    if (!gaId && !pixelId) return;
    const w = window as any;
    if (w.__analyticsLoaded) return;
    w.__analyticsLoaded = true;

    if (gaId) {
      const s = document.createElement('script');
      s.async = true;
      s.src = 'https://www.googletagmanager.com/gtag/js?id=' + gaId;
      document.head.appendChild(s);
      w.dataLayer = w.dataLayer || [];
      w.gtag = function () {
        w.dataLayer.push(arguments);
      };
      w.gtag('js', new Date());
      w.gtag('config', gaId);
    }

    if (pixelId) {
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
      w.fbq('init', pixelId);
      w.fbq('track', 'PageView');
    }
  }, [gaId, pixelId]);

  return null;
}
