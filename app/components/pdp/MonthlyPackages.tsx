import {monthlyPackages, monthsLabel} from '~/lib/quantity-packages';

const EUR_TO_BGN = 1.95583;

const fmt = (n: number, currency: 'EUR' | 'BGN') =>
  new Intl.NumberFormat('bg-BG', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(n) +
  (currency === 'EUR' ? ' €' : ' лв');

/**
 * Месечни пакети — the merchant's quantity discounts, presented the way the
 * official store presents them: a course of treatment, not "buy 4 pieces".
 *
 * Picking a package sets the quantity in the buy box, so there is one add-to-cart
 * button on the page and no second cart path to keep in sync.
 *
 * Renders nothing when the product has no quantity rule in the admin panel.
 */
export function MonthlyPackages({
  productId,
  singlePriceEur,
  quantity,
  onSelect,
}: {
  productId: string;
  /** The price of one item as the page already shows it, promotions included. */
  singlePriceEur: number;
  quantity: number;
  onSelect: (quantity: number) => void;
}) {
  const packages = monthlyPackages(productId, singlePriceEur);
  // One option is not a choice — that is just the normal price.
  if (packages.length < 2) return null;

  const best = packages.reduce((a, b) => (b.savingPct > a.savingPct ? b : a));

  return (
    <div className="bb-pdp-months" aria-label="Месечни пакети">
      <div className="bb-pdp-months-head">
        <span className="bb-pdp-months-title">Избери твоя курс</span>
        <span className="bb-pdp-months-hint">Пробиотиците действат при редовен прием</span>
      </div>

      <div className="bb-pdp-months-grid" role="radiogroup" aria-label="Продължителност на приема">
        {packages.map((pkg) => {
          const selected = quantity === pkg.months;
          return (
            <button
              key={pkg.months}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`bb-pdp-month${selected ? ' is-selected' : ''}`}
              onClick={() => onSelect(pkg.months)}
            >
              {pkg.savingPct > 0 && pkg.months === best.months && (
                <span className="bb-pdp-month-flag">Най-изгодно</span>
              )}
              <span className="bb-pdp-month-name">{monthsLabel(pkg.months)}</span>
              <span className="bb-pdp-month-total">{fmt(pkg.total, 'EUR')}</span>
              <span className="bb-pdp-month-bgn">{fmt(pkg.total * EUR_TO_BGN, 'BGN')}</span>
              <span className="bb-pdp-month-unit">
                {fmt(pkg.unitPrice, 'EUR')} / месец
              </span>
              {pkg.saving > 0 ? (
                <span className="bb-pdp-month-save">Спестяваш {fmt(pkg.saving, 'EUR')}</span>
              ) : (
                <span className="bb-pdp-month-save bb-pdp-month-save--none">&nbsp;</span>
              )}
            </button>
          );
        })}
      </div>

      <style>{`
        .bb-pdp-months { margin: 18px 0 6px; }
        .bb-pdp-months-head {
          display: flex; align-items: baseline; justify-content: space-between;
          gap: 10px; flex-wrap: wrap; margin-bottom: 10px;
        }
        .bb-pdp-months-title {
          font-size: 13px; font-weight: 800; letter-spacing: 0.04em;
          text-transform: uppercase; color: var(--color-ink);
        }
        .bb-pdp-months-hint { font-size: 12px; color: rgba(10, 37, 64, 0.55); }

        .bb-pdp-months-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
          gap: 8px;
        }

        .bb-pdp-month {
          position: relative;
          display: flex; flex-direction: column; align-items: flex-start; gap: 2px;
          padding: 14px 12px 12px;
          border: 1.5px solid rgba(10, 37, 64, 0.14);
          border-radius: 14px;
          background: #fff;
          cursor: pointer;
          text-align: left;
          transition: border-color 0.15s, box-shadow 0.15s, transform 0.12s;
        }
        .bb-pdp-month:hover { border-color: var(--color-pink-2); transform: translateY(-1px); }
        .bb-pdp-month.is-selected {
          border-color: var(--color-brand-pink);
          box-shadow: 0 0 0 3px rgba(227, 22, 108, 0.12);
          background: #fff8fb;
        }

        /* The ribbon sits half outside the card, so the card needs headroom —
           without it the flag overlaps the month name on the shortest option. */
        .bb-pdp-month-flag {
          position: absolute; top: -9px; left: 10px;
          background: var(--color-brand-pink); color: #fff;
          font-size: 9px; font-weight: 800; letter-spacing: 0.06em;
          text-transform: uppercase; padding: 4px 8px; border-radius: 999px;
          white-space: nowrap;
        }
        .bb-pdp-month:has(.bb-pdp-month-flag) { padding-top: 18px; }

        .bb-pdp-month-name {
          font-size: 12px; font-weight: 800; text-transform: uppercase;
          letter-spacing: 0.05em; color: rgba(10, 37, 64, 0.7);
        }
        .bb-pdp-month-total {
          font-family: var(--font-serif);
          font-size: 19px; font-weight: 600; letter-spacing: -0.4px;
          color: var(--color-ink); line-height: 1.15;
        }
        .bb-pdp-month-bgn { font-size: 11px; color: rgba(10, 37, 64, 0.5); }
        .bb-pdp-month-unit { font-size: 11.5px; color: rgba(10, 37, 64, 0.62); margin-top: 2px; }
        .bb-pdp-month-save {
          margin-top: 6px; font-size: 11px; font-weight: 800;
          color: var(--color-brand-pink);
        }
        .bb-pdp-month-save--none { opacity: 0; }

        @media (max-width: 420px) {
          .bb-pdp-month { padding: 12px 10px 10px; }
          .bb-pdp-month-total { font-size: 17px; }
        }
      `}</style>
    </div>
  );
}
