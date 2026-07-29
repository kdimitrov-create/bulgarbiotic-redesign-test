interface Props {
  /** Extracted benefit lines from the CMS description (no emoji prefix). */
  benefits: string[];
}

/**
 * "Ключови ползи" callout — extracted from emoji-bulleted lines that CMS
 * authors write inside the product description (🟢 / ✓ / ●).
 *
 * Replaces ugly inline emoji-text-runs with a polished pink checklist card
 * featuring real branded SVG checkmarks. Renders at the top of the
 * Description tab when at least 3 benefits are detected.
 *
 * Position: first thing inside the Description tab, before the rest of the
 * RichText description.
 */
export function ProductBenefits({benefits}: Props) {
  if (!benefits || benefits.length < 3) return null;

  return (
    <section className="bb-benefits" aria-label="Ключови ползи">
      <header className="bb-benefits-head">
        <span className="bb-benefits-tag">Какво прави продуктът</span>
        <h3>Ключови ползи</h3>
      </header>
      <ul className="bb-benefits-list">
        {benefits.map((b, i) => (
          <li key={i} className="bb-benefits-item">
            <span className="bb-benefits-check" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span className="bb-benefits-text">{b}</span>
          </li>
        ))}
      </ul>

      <style>{`
        .bb-benefits {
          margin: 0 0 32px;
          padding: 26px 28px 24px;
          background: linear-gradient(135deg, var(--color-cream-2) 0%, var(--color-pink-1) 100%);
          border-radius: 18px;
          border: 1px solid rgba(227, 22, 108, 0.1);
        }
        @media (max-width: 540px) {
          .bb-benefits { padding: 22px 20px; border-radius: 14px; margin-bottom: 28px; }
        }
        .bb-benefits-head {
          margin-bottom: 18px;
          padding-bottom: 14px;
          border-bottom: 1px solid rgba(227, 22, 108, 0.14);
        }
        .bb-benefits-tag {
          display: inline-block;
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: 1.4px;
          text-transform: uppercase;
          color: var(--color-brand-pink);
          margin-bottom: 6px;
        }
        .bb-benefits-head h3 {
          font-family: var(--font-serif);
          font-style: italic;
          font-weight: 500;
          font-size: 22px;
          letter-spacing: -0.4px;
          color: var(--color-ink);
          margin: 0;
          line-height: 1.15;
        }

        .bb-benefits-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          grid-template-columns: 1fr 1fr;
          column-gap: 22px;
          row-gap: 12px;
        }
        @media (max-width: 720px) {
          .bb-benefits-list { grid-template-columns: 1fr; row-gap: 10px; }
        }

        .bb-benefits-item {
          display: grid;
          grid-template-columns: 26px 1fr;
          gap: 12px;
          align-items: start;
          padding: 4px 0;
        }

        .bb-benefits-check {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 24px; height: 24px;
          border-radius: 999px;
          background: var(--color-brand-pink);
          color: white;
          flex-shrink: 0;
          margin-top: 2px;
          box-shadow: 0 4px 10px -2px rgba(227, 22, 108, 0.4);
        }
        .bb-benefits-check svg { width: 13px; height: 13px; }

        .bb-benefits-text {
          font-size: 14px;
          line-height: 1.55;
          color: var(--color-ink);
          font-weight: 500;
          letter-spacing: -0.1px;
        }
      `}</style>
    </section>
  );
}
