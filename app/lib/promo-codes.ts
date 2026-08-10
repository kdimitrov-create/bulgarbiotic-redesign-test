import type {PromoCodes, PromoCondition} from './promo-codes.server';

/**
 * Колко пари сваля приложеният промо код от количката.
 *
 * Сметката е НАША, защото Storefront API-то не я прави: то приема кода, но
 * връща същата сума. Реалната се смята на checkout-а от CloudCart, затова тук
 * се повтаря същата логика по условията, прочетени от админа.
 *
 * Клиентската половина: чисти функции, никакви заявки. Стойностите пристигат
 * през root loader-а от `promo-codes.server.ts`.
 */

let current: PromoCodes = {};

/** Слага стойностите, дошли от сървъра. Празен товар не променя нищо. */
export function setPromoCodes(next: PromoCodes | null | undefined) {
  if (next && Object.keys(next).length) current = next;
}

export function promoCodes(): PromoCodes {
  return current;
}

export type PromoLine = {
  /**
   * handle-ът на продукта от реда.
   *
   * Нарочно НЕ id: `CartLine.merchandise.product` не носи `id`, а само
   * `title`, `handle` и снимка. Съпоставянето по id мълчеше и точно затова
   * 100%-те кодове за подаръците не се прилагаха.
   */
  handle: string;
  /** сумата на реда в евро, СЛЕД продуктовите отстъпки */
  lineEur: number;
};

function conditionDiscount(
  c: PromoCondition,
  subtotalEur: number,
  lines: PromoLine[],
): number {
  // Доставката се смята на следващата стъпка - тук няма какво да отстъпим.
  if (c.type === 'shipping') return 0;

  const targeted =
    c.setting === 'product' && c.productHandles.length
      ? lines.filter((l) => l.handle && c.productHandles.includes(l.handle))
      : null;

  // Кодът е за конкретни продукти, но никой от тях не е в количката.
  if (targeted && !targeted.length) return 0;

  const base = targeted ? targeted.reduce((s, l) => s + l.lineEur, 0) : subtotalEur;
  if (base <= 0) return 0;

  // Минималната сума се мери по цялата количка, не по обхванатите редове.
  if (c.orderOver != null && c.orderOver > 0 && subtotalEur < c.orderOver) return 0;

  if (c.type === 'percent') {
    const pct = Math.max(0, Math.min(100, c.value));
    return (base * pct) / 100;
  }

  if (c.type === 'flat') {
    // Не може да свали повече от самата основа.
    return Math.min(base, Math.max(0, c.value));
  }

  // Непознат тип: по-добре нула, отколкото измислено число пред клиента.
  return 0;
}

/**
 * Общата отстъпка от всички приложени кодове.
 *
 * `subtotalEur` е сумата СЛЕД продуктовите отстъпки - точно върху нея работи и
 * checkout-ът, затова двете сметки не се разминават.
 */
export function promoDiscountEur(
  appliedCodes: Array<{code: string}> | undefined,
  subtotalEur: number,
  lines: PromoLine[] = [],
): number {
  if (!appliedCodes?.length || subtotalEur <= 0) return 0;
  let total = 0;
  for (const applied of appliedCodes) {
    const known = current[String(applied.code ?? '').toUpperCase()];
    // Непознат код: нищо не се приспада. Показването на 0 е по-честно от
    // гадаене - кодът пак ще си свърши работата на плащане.
    if (!known || !known.active) continue;
    for (const c of known.conditions) {
      total += conditionDiscount(c, subtotalEur, lines);
    }
  }
  return Math.min(subtotalEur, total);
}

/** Знаем ли изобщо какво прави този код. Ползва се, за да не лъжем сумата. */
export function isKnownPromoCode(code: string): boolean {
  return !!current[String(code ?? '').toUpperCase()];
}
