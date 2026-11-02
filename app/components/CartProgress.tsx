import {productsLabel, tierStatus} from '~/lib/cart-offers';
import {freeShippingOver} from '~/lib/active-discounts';
import {SHOW_BGN, EUR_TO_BGN} from '~/lib/currency';
import type {CartSummary} from '~/lib/cart-summary';

const fmtEur = (amount: number) =>
  new Intl.NumberFormat('bg-BG', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(amount) + ' €';
const fmtBgn = (amount: number) =>
  new Intl.NumberFormat('bg-BG', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(amount) + ' лв';
const fmtPct = (n: number) => `−${Number.isInteger(n) ? n : n.toFixed(1).replace('.', ',')}%`;

/**
 * Редът над лентата в количката - и в чекмеджето, и на `/cart`.
 *
 * Казва само това, което касата наистина ще направи (клиент, 12.10.2026):
 *
 *   1. Действа ли правило „от N продукта −X %" (Buy More, Save More), редът
 *      брои продуктите до следващата стъпка, а лентата - до най-високата.
 *      Стъпките се четат от правилото в панела (`tierStatus`).
 *   2. Иначе - безплатната доставка, но САМО ако в панела има действащо
 *      правило за нея. Дотук редът ползваше резервния праг от 51 € и пишеше
 *      „безплатна доставка е включена", без касата да я дава: правилото е
 *      изключено, а безплатна над 51,13 € дава само Еконт.
 *   3. Няма ли нито едното - ред няма.
 */
export function CartProgress({
  cls,
  quantity,
  productIds,
  thresholdEur,
  shippingTargetEur,
}: {
  /** `bb-cd` в чекмеджето, `bb-cart` на страницата - класовете са техни. */
  cls: 'bb-cd' | 'bb-cart';
  /** Бройките в количката - същото, което брои правилото на платформата. */
  quantity: number;
  /** Номерата на продуктите в количката (от `Cart.totals`); `null`, когато
   *  обобщението не е дошло - тогава редът за стъпките не се показва. */
  productIds: string[] | null;
  /** Сумата, по която се мери прагът за доставка (виж `CartDrawer`). */
  thresholdEur: number;
  shippingTargetEur: number;
}) {
  const tiers = tierStatus(quantity, productIds);

  if (tiers) {
    const {current, next, need, pct, needsEligible} = tiers;
    return (
      <>
        <div className={`${cls}-shipping-text`}>
          {!next && current ? (
            <>
              <span className={`${cls}-shipping-icon`} aria-hidden="true">✓</span>
              Поздравления - получаваш максималната отстъпка <strong>{fmtPct(current.percent)}</strong>!
            </>
          ) : !current && next && needsEligible ? (
            /* В количката има участващ продукт, но не и за тази стъпка (всяка
               стъпка има свой списък с изключения). Количка без нито един
               участващ продукт изобщо не стига дотук - виж `tierStatus`. */
            <>
              Добави още <strong className="accent">{productsLabel(need)}</strong>,{' '}
              {need === 1 ? 'който участва' : 'които участват'} в отстъпката, и вземи{' '}
              <strong>{fmtPct(next.percent)}</strong>.
            </>
          ) : current && next ? (
            <>
              Имаш <strong>{fmtPct(current.percent)}</strong>. Добави още{' '}
              <strong className="accent">{productsLabel(need)}</strong>
              {needsEligible ? (need === 1 ? ', който участва в отстъпката,' : ', които участват в отстъпката,') : ''} за{' '}
              <strong>{fmtPct(next.percent)}</strong>.
            </>
          ) : next ? (
            <>
              Добави още <strong className="accent">{productsLabel(need)}</strong> и вземи{' '}
              <strong>{fmtPct(next.percent)}</strong> отстъпка.
            </>
          ) : null}
        </div>
        <div className={`${cls}-shipping-track`}>
          <div className={`${cls}-shipping-fill`} style={{width: `${pct}%`}} />
        </div>
      </>
    );
  }

  if (freeShippingOver() === null) return null;

  const remainingEur = Math.max(0, shippingTargetEur - thresholdEur);
  const pct = shippingTargetEur > 0 ? Math.min(100, (thresholdEur / shippingTargetEur) * 100) : 100;
  return (
    <>
      <div className={`${cls}-shipping-text`}>
        {remainingEur <= 0.005 ? (
          <>
            <span className={`${cls}-shipping-icon`} aria-hidden="true">✓</span>
            Поздравления - <strong>безплатна доставка</strong> е включена!
          </>
        ) : (
          <>
            Поръчай за още <strong className="accent">{fmtEur(remainingEur)}</strong>
            {SHOW_BGN ? <span className={`${cls}-shipping-bgn`}> ({fmtBgn(remainingEur * EUR_TO_BGN)})</span> : null}{' '}
            и доставката е безплатна
          </>
        )}
      </div>
      <div className={`${cls}-shipping-track`}>
        <div className={`${cls}-shipping-fill`} style={{width: `${pct}%`}} />
      </div>
    </>
  );
}

/** Безплатна ли е доставката според панела - не според резервния праг. */
export function isShippingFree(thresholdEur: number, shippingTargetEur: number): boolean {
  return freeShippingOver() !== null && shippingTargetEur - thresholdEur <= 0.005;
}

/** Номерата на продуктите в количката; `null`, докато обобщението липсва. */
export function cartProductIds(summary: CartSummary | null | undefined): string[] | null {
  if (!summary) return null;
  return summary.lines.map((l) => l.productId).filter((id): id is string => !!id);
}
