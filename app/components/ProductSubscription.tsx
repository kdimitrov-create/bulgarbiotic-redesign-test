import {useState} from 'react';

interface Props {
  /** Show price for monthly subscription (10% off the one-time price). */
  basePriceEur: number;
}

const fmtEur = (n: number) =>
  new Intl.NumberFormat('bg-BG', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(n) + ' €';

/**
 * Subscription savings widget — appears under the add-to-cart on PDP.
 *
 * Visual reminder that the product is available on a monthly subscription
 * with a 10% discount. Currently UI-only (purchase still happens via the
 * one-time CTA) — wire the recurring backend at a later phase. Listed as
 * a pending feature in CLAUDE.md.
 *
 * Client (2026-07): HIDE this block until the recurring-subscription backend
 * is live. Flip SUBSCRIPTION_ENABLED back to `true` to restore it — the whole
 * UI below is kept intact.
 */
const SUBSCRIPTION_ENABLED = false;

export function ProductSubscription({basePriceEur}: Props) {
  const [mode, setMode] = useState<'once' | 'monthly'>('once');
  const monthlyPrice = basePriceEur * 0.9;

  if (!SUBSCRIPTION_ENABLED) return null;

  return (
    <div className="bb-pdp-sub" aria-label="Опции за абонамент">
      <div className="bb-pdp-sub-head">
        <span className="bb-pdp-sub-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 11-3.4-7" />
            <path d="M21 4v5h-5" />
          </svg>
        </span>
        <span>
          <span className="bb-pdp-sub-title">Спести с месечен абонамент</span>
          <span className="bb-pdp-sub-pct">−10%</span>
        </span>
      </div>

      <div className="bb-pdp-sub-row">
        <label className="bb-pdp-sub-radio">
          <input
            type="radio"
            name="sub-mode"
            value="once"
            checked={mode === 'once'}
            onChange={() => setMode('once')}
          />
          Еднократно
        </label>
        <label className="bb-pdp-sub-radio">
          <input
            type="radio"
            name="sub-mode"
            value="monthly"
            checked={mode === 'monthly'}
            onChange={() => setMode('monthly')}
          />
          Всеки месец ({fmtEur(monthlyPrice)})
        </label>
      </div>

      {mode === 'monthly' && (
        <div className="bb-pdp-sub-desc">
          ✓ Доставка всеки месец без да мислиш · ✓ Спести 10% от всяка поръчка ·
          ✓ Откажи или пропусни месец по всяко време от профила си.
        </div>
      )}
    </div>
  );
}
