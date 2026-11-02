import {useEffect, useRef} from 'react';
import {pushEcommerce, idForHandle, money2} from '~/lib/analytics';
import {CROSS_SELL_EVENT, type CrossSellTrigger} from '~/lib/cross-sell';
import {announceCartAdd} from '~/lib/cart-sync';

/**
 * Праща `add_to_cart` към dataLayer-а, щом добавянето приключи - веднъж и само
 * при успех.
 *
 * Сметката живееше вътре в `AddToCartButton` и заедно с нея - в самия бутон на
 * продуктовата страница. Бутонът „Купи" в картите обаче не минава оттам: той
 * има собствен fetcher, защото трябва първо да разпита `/api/variant` за
 * варианта, който листинговата заявка не носи. Заради това всяко добавяне от
 * витрина, категория или каруселa влизаше в количката, без да се брои никъде
 * (клиент, 01.09.2026: „бутонът Купи под всеки продукт не се отчита в
 * Аналитикс"). Тук е изнесено, за да го ползват и двата бутона и следващата
 * поправка по сметката да не мине само през единия.
 *
 * `merchandiseId` е вариантът, който Е БИЛ подаден на количката, не този, който
 * компонентът има под ръка: в картата той се разбира чак при натискането.
 *
 * `handle` е резервата за бутоните вътре в количката: те подават на действието
 * и handle, за да намери то първия вариант на сървъра, когато вариантът им
 * липсва. Тогава редът се разпознава по продукта, а не по варианта.
 */
export function useTrackAddToCart(
  fetcher: {state: string; data: unknown},
  merchandiseId: string | undefined,
  quantity = 1,
  handle?: string,
  /** `false` само за бутоните в прозореца на кръстосаната оферта - той не
   *  бива да се самозапали. */
  triggersCrossSell = true,
): void {
  const handled = useRef<unknown>(null);

  useEffect(() => {
    /* ⚠️ Чака се ОТГОВОРЪТ, не състоянието `idle`.
     *
     * След подаването fetcher-ът минава през `submitting`, после `loading`
     * (докато маршрутът се опреснява) и чак накрая `idle`. Отговорът е налице
     * още на `loading`.
     *
     * Хванато с браузър на 01.09.2026: cross sell картата в чекмеджето изчезва
     * от екрана точно докато трае `loading` - продуктът вече е в количката и
     * предложението отпада от списъка. Компонентът се маха преди `idle`, значи
     * условие за `idle` НИКОГА не се изпълнява и добавянето от чекмеджето не
     * се броеше. Другите бутони не изчезват и там разликата не се вижда.
     *
     * Двойно пращане няма: пази се самият обект с отговора, а той е един и същ
     * през `loading` и `idle`. */
    if (!fetcher.data) return;
    if (handled.current === fetcher.data) return;
    handled.current = fetcher.data;

    // Неуспешното добавяне не праща събитие - иначе отчетите броят продажби,
    // които изобщо не са влезли в количката.
    const errors = ((fetcher.data as any)?.errors ?? []) as unknown[];
    if (errors.length) return;
    if (!merchandiseId && !handle) return;

    // Данните се четат от ВЪРНАТАТА количка, за да не се налага всяко място,
    // което ползва бутона, да ги подава отделно.
    const cartLines = ((fetcher.data as any)?.cart?.lines?.nodes ?? []) as any[];
    const line = merchandiseId
      ? cartLines.find((l: any) => l?.merchandise?.id === merchandiseId)
      : cartLines.find((l: any) => l?.merchandise?.product?.handle === handle);
    if (!line) return;

    /* Зелената лента „Продуктът е добавен в количката" и кръстосаната оферта
     * „при добавяне в количката" тръгват оттук.
     *
     * Лентата се палеше от `CartSync`, който гледаше `useFetchers()` - но в
     * React Router 7 той вижда само fetcher-и в движение, а приключилото
     * добавяне изчезва от списъка, преди някой да го хване. Тоест лентата не
     * беше излизала нито веднъж (мерено с браузър 07.10.2026) и `CartSync` е
     * махнат. Тук отговорът е сигурен, а всеки бутон за пазаруване вече минава
     * оттук заради Analytics. */
    announceCartAdd();
    if (triggersCrossSell) {
      const productHandle = String(line.merchandise?.product?.handle ?? '');
      if (productHandle) {
        const trigger: CrossSellTrigger = {
          handle: productHandle,
          cartHandles: [
            ...new Set(cartLines.map((l: any) => String(l?.merchandise?.product?.handle ?? '')).filter(Boolean)),
          ],
          subtotal: parseFloat((fetcher.data as any)?.cart?.cost?.subtotalAmount?.amount ?? '0') || 0,
        };
        window.dispatchEvent(new CustomEvent(CROSS_SELL_EVENT, {detail: trigger}));
      }
    }

    /* ⭐ Сумата идва от РЕДА, а единичната цена се ДЕЛИ от нея.
     *
     * Количествените пакети сменят цената за брой, но `amountPerQuantity`
     * не ги отразява: при „4-месечен пакет" на Femin то връща 25,25, докато
     * редът струва 98,72, тоест 24,68 на брой. Вземем ли `amountPerQuantity`,
     * цена × брой дава 101 - точно числото, което маркетолозите ни
     * съобщиха на 18.08.2026 - и не се връзва със сумата на събитието.
     * Затова платеното за брой се смята от реда и трите числа излизат:
     * (price − discount) × quantity = value. */
    const lineTotal = parseFloat(line.cost?.totalAmount?.amount ?? '0');
    const perQty = parseFloat(
      line.cost?.amountPerQuantity?.amount ?? line.merchandise?.price?.amount ?? '0',
    );
    const qty = quantity || 1;
    /* ⚠️ Делим на количеството НА РЕДА, не на добавеното.
     *
     * Хванато на живо: количката вече държеше 4 бр. Femin, добавихме още 4,
     * редът стана 8 за 197,44 - а събитието делеше 197,44 на 4 и обявяваше
     * 49,36 за брой и 197,44 стойност. GA4 иска колко е ДОБАВЕНО сега, не
     * колко струва целият ред. */
    const lineQty = Number(line.quantity) || qty;
    const paidPerUnit = lineTotal > 0 && lineQty > 0 ? lineTotal / lineQty : perQty;
    const basePerUnit =
      parseFloat(
        line.cost?.compareAtAmountPerQuantity?.amount ??
          line.merchandise?.compareAtPrice?.amount ??
          '0',
      ) || Math.max(perQty, paidPerUnit);
    const value = paidPerUnit * qty;

    pushEcommerce('add_to_cart', {
      currency:
        line.cost?.amountPerQuantity?.currencyCode ??
        line.merchandise?.price?.currencyCode ??
        'EUR',
      value: money2(value),
      items: [
        {
          item_id: idForHandle(line.merchandise?.product?.handle),
          item_name: line.merchandise?.product?.title ?? '',
          price: money2(basePerUnit),
          discount: money2(Math.max(0, basePerUnit - paidPerUnit)),
          quantity: qty,
        },
      ],
    });
  }, [fetcher.state, fetcher.data, merchandiseId, quantity, handle]);
}
