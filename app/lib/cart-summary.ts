import type {CartSummary, CartTotalLine} from './cart-totals.server';

/**
 * Четенето на обобщението, споделено от чекмеджето и страницата на количката.
 *
 * Правилото е едно: **числата се четат, не се смятат.** `Cart.totals` идва от
 * търговеца - всеки ред с неговия етикет, в неговия ред. Сборът на редовете е
 * само резерва за мига, в който обобщението още не е пристигнало.
 *
 * Историята зад това: сметката тук минаваше през процент от админско правило,
 * после през `merchandise.price`, после през сбор на редовете. И трите пропускат
 * по нещо - последната пропуска правилата за количката, заради което количка от
 * 147,34 се показваше така, а касата събираше 73,67.
 */

export type {CartSummary, CartTotalLine};

/** Редът, който носи крайната сума. */
export function totalLine(summary: CartSummary | null | undefined): CartTotalLine | null {
  return summary?.totals?.find((t) => t.key === 'total') ?? null;
}

/** Редът с междинната сума. */
export function subtotalLine(summary: CartSummary | null | undefined): CartTotalLine | null {
  return summary?.totals?.find((t) => t.key === 'subtotal') ?? null;
}

/**
 * Редовете между междинната и крайната сума: отстъпки, правила за количката,
 * доставка. Точно те са това, което сами никога няма да познаем.
 */
export function adjustmentLines(summary: CartSummary | null | undefined): CartTotalLine[] {
  return (summary?.totals ?? []).filter((t) => t.key !== 'subtotal' && t.key !== 'total');
}

export function money(line: CartTotalLine | null | undefined): number | null {
  const raw = line?.amount?.amount;
  if (raw == null) return null;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

/** Една отстъпка от промо код, събрана по всички редове на количката. */
export interface CodeDiscount {
  /** Самият код, както платформата го връща. */
  code: string;
  /** Етикетът на кампанията, например „Wheel promo codes". */
  title: string | null;
  /** Колко сваля, положително число в евро. */
  amountEur: number;
}

/**
 * Отстъпките от промо кодове, извадени от разпределенията по редовете.
 *
 * ЗАЩО СЕ СМЯТА ОТ РЕДОВЕТЕ: платформата НЕ дава ред за промо кода в
 * `Cart.totals`. Тя направо сваля кода от `subtotal` - проверено на живо на
 * 19.08 срещу bulgarbiotic.bg: количка от 19,68 с код -15% връща `subtotal`
 * 16,73 и нито един допълнителен ред. Затова междинната сума показваше вече
 * намалената сметка и спечеленото от колелото не се виждаше никъде (искане на
 * клиента, т.5).
 *
 * Единственото място, където кодът се вижда, е `discountAllocations` по
 * редовете: `source: "CODE"` носи заглавието, кода и свалената сума. Оттам се
 * връща обратно в междинната сума и се показва на свой ред.
 *
 * Отстъпките на самите продукти (`source: "PRODUCT"`) и правилата за количката
 * НЕ се пипат: те вече са отразени другаде и биха се преброили два пъти.
 */
export function codeDiscounts(summary: CartSummary | null | undefined): CodeDiscount[] {
  const byCode = new Map<string, CodeDiscount>();
  for (const line of summary?.lines ?? []) {
    for (const a of line.allocations ?? []) {
      if (a.source !== 'CODE') continue;
      const amount = parseFloat(a.discountedAmount?.amount ?? '');
      if (!Number.isFinite(amount) || amount <= 0.005) continue;
      // Кодът е ключът, защото един код сваля от няколко реда наведнъж и
      // трябва да излезе като ЕДИН ред в сметката, а не като по един на продукт.
      const key = a.code || a.title || 'code';
      const seen = byCode.get(key);
      if (seen) seen.amountEur += amount;
      else byCode.set(key, {code: a.code || '', title: a.title, amountEur: amount});
    }
  }
  return [...byCode.values()];
}

/** Сборът на всички отстъпки от промо кодове, в евро. */
export function codeDiscountTotal(summary: CartSummary | null | undefined): number {
  return codeDiscounts(summary).reduce((sum, d) => sum + d.amountEur, 0);
}
