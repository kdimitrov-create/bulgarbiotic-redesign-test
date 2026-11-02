import type {CartSummary, CartSummaryLine, CartTotalLine} from './cart-totals.server';

/**
 * Едно и също правило, отчетено на две места - и как се показва еднакво.
 *
 * Платформата прилага правилата за количката по два начина, според условието им
 * (мерено на живо 17.08.2026 с двете правила за Pets, и двете „−50%"):
 *
 *   • условие по БРОЙ НА ПРОДУКТА (правило 12, „Поръчай 2, плати 1"):
 *     редът остава на пълната си сума, а отстъпката е отделен ред в сбора.
 *     → картата показваше 42,94, а сборът долу 21,47.
 *
 *   • условие по БРОЙ В КОЛИЧКАТА (правило 14, „Поръчай 4, плати 2"):
 *     отстъпката е върху самия ред (`discountAllocations`, source CART_RULE),
 *     тоест сумата на реда е вече намалена, а в сбора няма какво да се покаже.
 *     → цените бяха верни, но името на правилото никъде не се виждаше.
 *
 * Тук двата случая се привеждат към един вид:
 *   1. редът показва сумата, която клиентът наистина плаща за него;
 *   2. името на правилото се вижда долу и в двата случая;
 *   3. отстъпка, която вече е влязла в реда, се показва долу БЕЗ сума -
 *      иначе едно и също число се вади два пъти пред очите на клиента.
 */

export const CART_RULE_SOURCE = 'CART_RULE';

/** Ключът на ред в сбора изглежда като `cart-rule-percent-12.` */
export function isCartRuleTotal(line: CartTotalLine | null | undefined): boolean {
  return /^cart-rule/i.test(String(line?.key ?? ''));
}

function num(money: {amount: string} | null | undefined): number | null {
  const n = parseFloat(String(money?.amount ?? ''));
  return Number.isFinite(n) ? n : null;
}

/** Сумата, която правилата за количката са свалили ОТ САМИЯ ред. */
function ruleAllocatedOnLine(line: CartSummaryLine | undefined): number {
  if (!line) return 0;
  return line.allocations
    .filter((a) => String(a.source ?? '').toUpperCase() === CART_RULE_SOURCE)
    .reduce((sum, a) => sum + (num(a.discountedAmount) ?? 0), 0);
}

export interface RuleView {
  /** Ред от сбора → сумата вече е показана на реда с продукта. */
  foldedTotalKeys: Set<string>;
  /** Правила, които платформата е приложила на реда и ги няма в сбора. */
  extraRuleTitles: string[];
  /** Колко сваля всяко от тези правила - сборувано по заглавие, през редовете.
   *  Числото идва от самата платформа (`discountedAmount` на разпределението),
   *  не се пресмята „на око". Положително число = свалени пари. */
  extraRuleAmounts: Map<string, number>;
  /** По ред: колко да се извади от сумата му, за да излезе платеното. */
  lineDeduction: Map<string, number>;
  /** По ред: заглавията на правилата, които го засягат. */
  lineRuleTitles: Map<string, string[]>;
  /** По заглавие: с колко процента правилото е намалило сумата, върху която
   *  е приложено. Само когато числата на платформата дават чист процент. */
  rulePercent: Map<string, number>;
}

/**
 * Сглобява изгледа от обобщението. Работи само с числа, които платформата вече
 * е върнала - нищо не се пресмята „на око".
 *
 * Ред от сбора се приписва към продуктов ред само когато е еднозначно: точно
 * един ред в количката, чиято сума след продуктовите отстъпки съвпада с
 * отстъпката на правилото (до стотинка) или е точно два пъти нея (класическото
 * „втори брой без пари"). При съмнение не се приписва нищо и всичко си остава
 * както го дава платформата - по-добре непроменено, отколкото сгрешено.
 */
export function buildRuleView(summary: CartSummary | null | undefined): RuleView {
  const view: RuleView = {
    foldedTotalKeys: new Set(),
    extraRuleTitles: [],
    extraRuleAmounts: new Map(),
    lineDeduction: new Map(),
    lineRuleTitles: new Map(),
    rulePercent: new Map(),
  };
  if (!summary) return view;

  const lines = summary.lines ?? [];

  // 1. Правила, приложени върху самия ред: сумата е вътре, остава името.
  const titlesInTotals = new Set(
    (summary.totals ?? [])
      .filter(isCartRuleTotal)
      .map((t) => String(t.name ?? '').trim())
      .filter(Boolean),
  );
  for (const line of lines) {
    for (const alloc of line.allocations) {
      if (String(alloc.source ?? '').toUpperCase() !== CART_RULE_SOURCE) continue;
      const title = String(alloc.title ?? '').trim();
      if (!title) continue;
      const forLine = view.lineRuleTitles.get(line.id) ?? [];
      if (!forLine.includes(title)) forLine.push(title);
      view.lineRuleTitles.set(line.id, forLine);
      if (!titlesInTotals.has(title)) {
        if (!view.extraRuleTitles.includes(title)) view.extraRuleTitles.push(title);
        // Едно правило може да е слязло върху няколко реда - сборуват се.
        const off = num(alloc.discountedAmount) ?? 0;
        if (off) {
          view.extraRuleAmounts.set(title, (view.extraRuleAmounts.get(title) ?? 0) + Math.abs(off));
        }
      }
    }
  }

  // 2. Правила на ниво количка: сумата се показва на реда, който я е спечелил.
  const ruleTotals = (summary.totals ?? []).filter(isCartRuleTotal);
  for (const total of ruleTotals) {
    const amount = Math.abs(num(total.amount) ?? 0);
    if (!amount) continue;
    const title = String(total.name ?? '').trim();

    const candidates = lines.filter((line) => {
      const lineTotal = num(line.total);
      if (lineTotal == null) return false;
      // Ред, който вече носи отстъпката си, не я получава втори път.
      if (ruleAllocatedOnLine(line) > 0) return false;
      return (
        Math.abs(lineTotal - amount) < 0.01 || Math.abs(lineTotal / 2 - amount) < 0.01
      );
    });
    if (candidates.length !== 1) continue;

    const line = candidates[0];
    view.lineDeduction.set(line.id, (view.lineDeduction.get(line.id) ?? 0) + amount);
    if (title) {
      const forLine = view.lineRuleTitles.get(line.id) ?? [];
      if (!forLine.includes(title)) forLine.push(title);
      view.lineRuleTitles.set(line.id, forLine);
    }
    if (total.key) view.foldedTotalKeys.add(String(total.key));
  }

  // 3. Процентът на всяко правило - за „Buy More, Save More - 10%".
  fillRulePercents(view, summary);

  return view;
}

/**
 * С колко процента всяко правило е намалило онова, върху което е приложено.
 *
 * Процентът НЕ се преписва от настройката в панела, а се смята от парите, които
 * платформата вече е свалила - тогава надписът не може да се размине със
 * сметката. Затова следва сам всяка промяна в правилото: стъпките по брой,
 * изключенията като Detox Boost (той не се брои, но получава отстъпката),
 * бъдещо „без отстъпка за този продукт".
 *
 *   • слязло върху редовете → свалено ÷ (платено + свалено) по тези редове;
 *   • ред в сбора → свалено ÷ сумата на редовете преди него.
 *
 * Показва се само чист процент (до 0,15 пункта от цяло число - стотинките от
 * закръглянето). Друго значи, че правилото не е процентно или засяга част от
 * количката, която оттук не се вижда, и тогава надпис без процент е по-честен.
 */
function fillRulePercents(view: RuleView, summary: CartSummary): void {
  const lines = summary.lines ?? [];
  const onLines = new Map<string, {off: number; base: number}>();
  for (const line of lines) {
    const paid = num(line.total) ?? 0;
    for (const alloc of line.allocations) {
      if (String(alloc.source ?? '').toUpperCase() !== CART_RULE_SOURCE) continue;
      const title = String(alloc.title ?? '').trim();
      const off = Math.abs(num(alloc.discountedAmount) ?? 0);
      if (!title || !off) continue;
      const acc = onLines.get(title) ?? {off: 0, base: 0};
      acc.off += off;
      acc.base += paid + off;
      onLines.set(title, acc);
    }
  }
  for (const [title, {off, base}] of onLines) setPercent(view, title, off, base);

  const beforeRules = lines.reduce((sum, l) => sum + (num(l.total) ?? 0) + ruleAllocatedOnLine(l), 0);
  for (const total of (summary.totals ?? []).filter(isCartRuleTotal)) {
    const title = String(total.name ?? '').trim();
    if (!title || view.rulePercent.has(title)) continue;
    setPercent(view, title, Math.abs(num(total.amount) ?? 0), beforeRules);
  }
}

function setPercent(view: RuleView, title: string, off: number, base: number): void {
  if (!(off > 0) || !(base > 0)) return;
  const pct = (off / base) * 100;
  const whole = Math.round(pct);
  if (whole > 0 && whole < 100 && Math.abs(pct - whole) < 0.15) view.rulePercent.set(title, whole);
}

/** „Buy More, Save More" → „Buy More, Save More - 10%", когато процентът е известен. */
export function ruleLabel(view: RuleView, title: string): string {
  const pct = view.rulePercent.get(title.trim());
  return pct ? `${title} - ${pct}%` : title;
}

/** Сумата, която клиентът плаща за този ред, след правилата за количката. */
export function paidForLine(
  view: RuleView,
  lineId: string,
  lineTotal: number | null,
): number | null {
  if (lineTotal == null) return null;
  const off = view.lineDeduction.get(lineId) ?? 0;
  const paid = lineTotal - off;
  return paid < 0 ? 0 : paid;
}
