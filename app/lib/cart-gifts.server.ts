import {cartOffers} from './cart-offers';

/**
 * Слага и маха подаръка от кръстосаните оферти според сумата в количката.
 *
 * Класическата тема прави това в браузъра: при добавяне в количката нейният
 * скрипт вижда правилото „подарък над X" и слага продукта. Nitrogen рисува свой
 * DOM, значи никой не го прави.
 *
 * Проверено на живо 2026-08-09: количка, построена през Storefront API-то и
 * подадена на касата, НЕ получава подаръка от платформата. Тоест или го слага
 * магазинът, или клиентът не го получава.
 *
 * ⚠️ Това слага РЕДА, не цената. Дали подаръкът е безплатен зависи от цената на
 * самия продукт в панела. Ако той има цена, клиентът я плаща — виж
 * `CUTOVER-PLAN.md`, раздела за колелото и подаръците.
 */

/** Сумата, която клиентът вижда: цените по редовете, не `cost` на API-то. */
export function cartSubtotal(cart: any): number {
  const lines = cart?.lines?.nodes ?? [];
  return lines.reduce((sum: number, line: any) => {
    const unit = parseFloat(line?.merchandise?.price?.amount ?? '0');
    const qty = Number(line?.quantity) || 0;
    return sum + (Number.isFinite(unit) ? unit * qty : 0);
  }, 0);
}

function lineFor(cart: any, variantId: string): any | undefined {
  return (cart?.lines?.nodes ?? []).find(
    (line: any) => line?.merchandise?.id === variantId,
  );
}

/**
 * Изравнява подаръците с текущата сума и връща количката такава, каквато е
 * след това. Тиха е по конструкция: всяка грешка връща количката непроменена,
 * защото един подарък не бива да събори добавянето на истински продукт.
 */
export async function reconcileGifts(cart: any, cartApi: any): Promise<any> {
  const {gifts} = cartOffers();
  if (!gifts.length || !cart) return cart;

  let current = cart;
  for (const gift of gifts) {
    if (!gift.variantId) continue;
    // Сумата се смята без подаръците: иначе подарък от 27 лв. сам изтегля
    // количката над прага и се самоподдържа, дори клиентът да е махнал всичко.
    const withoutGifts = {
      ...current,
      lines: {
        nodes: (current?.lines?.nodes ?? []).filter(
          (line: any) => !gifts.some((g) => g.variantId === line?.merchandise?.id),
        ),
      },
    };
    const earned = cartSubtotal(withoutGifts) >= gift.minTotal;
    const line = lineFor(current, gift.variantId);

    try {
      if (earned && !line) {
        const result = await cartApi.addLines([{merchandiseId: gift.variantId, quantity: 1}]);
        current = result?.cart ?? current;
      } else if (!earned && line) {
        const result = await cartApi.removeLines([line.id]);
        current = result?.cart ?? current;
      }
    } catch (error) {
      console.warn('cart gifts: %s left as it was — %s', gift.productTitle, (error as Error).message);
    }
  }

  return current;
}
