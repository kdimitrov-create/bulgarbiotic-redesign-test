import {useEffect, useRef} from 'react';
import {useFetchers} from 'react-router';
import {CART_ACTION} from '~/lib/cart-action';
import {announceCartAdd} from '~/lib/cart-sync';

/**
 * Прехвърля количката към платформата след ВСЯКО добавяне, откъдето и да идва.
 *
 * Първо това стоеше вътре в `AddToCartButton`. Продуктовата страница работеше,
 * но листингът, витрината на началната, допълненията в чекмеджето и наградата
 * от колелото добавят през свои бутони - те не се синхронизираха и количката на
 * платформата излизаше празна (клиент, 2026-08-11).
 *
 * Затова наблюдението е тук, в layout-а: гледа всички fetcher-и към адреса на
 * количката и хваща приключилите `ADD_TO_CART`. Всеки нов бутон в бъдеще е
 * покрит, без да се сеща някой да добави ред.
 *
 * ⚠️ Тук НЕ се прехвърля количката към платформата. Пробвано беше на всяко
 * добавяне и изпразваше количката: отговорът на adopt носи своя сесийна
 * бисквитка, а през прокситo тя се пренаписва към нашия домейн и застъпва
 * нашата - заедно с ключа на количката. Резултатът беше празна количка и
 * изчезнал брояч след всяко „Купи" (клиент, 2026-08-11).
 *
 * Прехвърлянето стана еднократно, при излизане към платформата - виж иконката
 * на количката в `Header`.
 *
 * Пази последно обработената заявка, за да не се обади два пъти при
 * пререндериране.
 */
export function CartSync() {
  const fetchers = useFetchers();
  const handled = useRef<string | null>(null);

  const done = fetchers.find(
    (f) =>
      f.formAction === CART_ACTION &&
      f.state === 'idle' &&
      f.formData?.get('action') === 'ADD_TO_CART' &&
      (f.data as any)?.cart,
  );
  const cart = (done?.data as any)?.cart;
  // Количката мени id-то си рядко, но броят се мени при всяко добавяне - двете
  // заедно стигат, за да различим ново добавяне от пререндериране.
  const stamp = cart ? `${cart.id}:${cart.totalQuantity}` : null;

  useEffect(() => {
    if (!stamp || handled.current === stamp) return;
    handled.current = stamp;
    announceCartAdd();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stamp]);

  return null;
}
