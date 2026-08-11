/**
 * Trust signals row — 3 pills with monoline icons rendered directly under
 * the PDP add-to-cart button to address last-minute hesitation:
 *   • Free shipping over 50 BGN
 *   • 24-48h delivery in Bulgaria
 *   • 30-day money-back guarantee
 *
 * Pure presentational — no props, single source of truth lives here so we
 * can iterate copy without touching the PDP route file.
 */
export function ProductTrustRow() {
  return (
    <div className="bb-pdp-trust" aria-label="Гаранции и условия">
      <div className="bb-pdp-trust-pill">
        <span className="bb-pdp-trust-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="6" width="14" height="12" rx="2" />
            <path d="M17 10h3l1.5 3v5h-4.5" />
            <circle cx="7" cy="20" r="2" />
            <circle cx="17.5" cy="20" r="2" />
          </svg>
        </span>
        <span>
          <span className="bb-pdp-trust-strong">Безплатна доставка</span>
          <span className="bb-pdp-trust-sub">При поръчка над 50 €</span>
        </span>
      </div>

      <div className="bb-pdp-trust-pill">
        <span className="bb-pdp-trust-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3.5 2" />
          </svg>
        </span>
        <span>
          <span className="bb-pdp-trust-strong">24-48 часа</span>
          <span className="bb-pdp-trust-sub">Доставка в цяла България</span>
        </span>
      </div>

      <div className="bb-pdp-trust-pill">
        <span className="bb-pdp-trust-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l8 4v5c0 5-3.5 8.5-8 9.5C7.5 20.5 4 17 4 12V7l8-4z" />
            <path d="M9 12.5l2 2 4.5-4.5" />
          </svg>
        </span>
        <span>
          <span className="bb-pdp-trust-strong">30-дневна гаранция</span>
          <span className="bb-pdp-trust-sub">Без въпроси, връщаме парите</span>
        </span>
      </div>
    </div>
  );
}
