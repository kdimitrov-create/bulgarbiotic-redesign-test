import type {SellingPlan} from '~/lib/selling-plans.server';
import {EUR_TO_BGN} from '~/lib/currency';

interface Props {
  plans: SellingPlan[];
  /** Цена при еднократна покупка, в евро - за сравнение с плана. */
  oneTimePriceEur: number;
  /** '' = еднократна покупка, иначе id на избрания план. */
  value: string;
  onChange: (planId: string) => void;
}

const fmtEur = (n: number) =>
  new Intl.NumberFormat('bg-BG', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(n) + ' €';

function toEur(money: {amount: string; currencyCode?: string} | null | undefined): number | null {
  if (!money) return null;
  const amount = parseFloat(money.amount);
  if (!Number.isFinite(amount)) return null;
  return money.currencyCode === 'BGN' ? amount / EUR_TO_BGN : amount;
}

/** Отстъпката на плана в проценти, ако може да се покаже честно. */
function discountPct(plan: SellingPlan, oneTimePriceEur: number, planPriceEur: number | null): number | null {
  const adj = plan.priceAdjustment;
  // Отстъпка, която започва чак от N-тата доставка, не е отстъпка за първата
  // поръчка - не я обещаваме на бутона.
  if (adj && adj.afterCycle && adj.afterCycle > 0) return null;
  if (adj?.type === 'PERCENTAGE') {
    const v = parseFloat(adj.value);
    return v > 0 ? Math.round(v) : null;
  }
  if (planPriceEur != null && oneTimePriceEur > 0 && planPriceEur < oneTimePriceEur) {
    return Math.round((1 - planPriceEur / oneTimePriceEur) * 100);
  }
  return null;
}

/**
 * Избор „Еднократно / Абонамент" над бутона „Купи".
 *
 * Показва се само когато CloudCart върне абонаментни планове за избрания
 * вариант - тоест само за продуктите, на които абонаментът е настроен в
 * админа. Цените и отстъпките идват от плана, нищо не е твърдо зададено.
 * Избраният план отива в количката като `sellingPlanId`.
 */
export function ProductSubscription({plans, oneTimePriceEur, value, onChange}: Props) {
  if (!plans.length) return null;

  const selected = plans.find((p) => p.id === value);

  return (
    <div className="bb-pdp-sub" role="radiogroup" aria-label="Начин на покупка">
      <div className="bb-pdp-sub-head">
        <span className="bb-pdp-sub-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 11-3.4-7" />
            <path d="M21 4v5h-5" />
          </svg>
        </span>
        <span>
          <span className="bb-pdp-sub-title">Купи с абонамент</span>
        </span>
      </div>

      <div className="bb-pdp-sub-row">
        <label className="bb-pdp-sub-radio">
          <input
            type="radio"
            name="sub-mode"
            value=""
            checked={!selected}
            onChange={() => onChange('')}
          />
          Еднократно ({fmtEur(oneTimePriceEur)})
        </label>
        {plans.map((plan) => {
          const planPriceEur = toEur(plan.price);
          const pct = discountPct(plan, oneTimePriceEur, planPriceEur);
          return (
            <label key={plan.id} className="bb-pdp-sub-radio">
              <input
                type="radio"
                name="sub-mode"
                value={plan.id}
                checked={selected?.id === plan.id}
                onChange={() => onChange(plan.id)}
              />
              {plan.label || plan.name}
              {planPriceEur != null && ` (${fmtEur(planPriceEur)})`}
              {pct != null && <span className="bb-pdp-sub-pct">−{pct}%</span>}
            </label>
          );
        })}
      </div>

      {selected && (
        <div className="bb-pdp-sub-desc">
          {selected.label && selected.name !== selected.label && <>{selected.name}<br /></>}
          {selected.minCycles != null && selected.minCycles > 1 && (
            <>Минимум {selected.minCycles} доставки.<br /></>
          )}
          {selected.prepaid && selected.prepaidNote}
        </div>
      )}
    </div>
  );
}
