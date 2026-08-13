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
