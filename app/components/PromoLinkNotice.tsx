import {useEffect} from 'react';
import {announceCartAdd} from '~/lib/cart-sync';

/**
 * Довършва `/promo/<КОД>` (QR кода от брошурите) в браузъра.
 *
 * Маршрутът пренасочва с `?promo=<КОД>&promo_state=...`:
 *   • `applied`  - кодът вече е в количката;
 *   • `pending`  - количката е празна, кодът чака в сесията (`pending-promo.server.ts`);
 *   • `rejected` - платформата отказа кода за продуктите в количката.
 * Показва се зелената лента на `CartToast`, а параметрите се махат от адреса,
 * за да не се повтори при презареждане или споделяне на линка.
 */
export function PromoLinkNotice() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('promo');
    const state = url.searchParams.get('promo_state');
    if (!code || !state) return;

    announceCartAdd(
      state === 'rejected'
        ? `Промо кодът ${code} не може да се приложи към продуктите в количката`
        : `Промо кодът ${code} е добавен към количката ви`,
    );

    url.searchParams.delete('promo');
    url.searchParams.delete('promo_state');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  }, []);

  return null;
}
