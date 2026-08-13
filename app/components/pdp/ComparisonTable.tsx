interface Row {
  feature: string;
  /** Comparison column value — either boolean (✓/✗) or string label. */
  others: boolean | string;
  bactology: boolean | string;
}

interface Props {
  title?: string;
  subtitle?: string;
  rows?: Row[];
}

const DEFAULT_ROWS: Row[] = [
  {feature: 'Брой активни бактерии (CFU)',         others: '1-10 млрд',  bactology: '50 милиарда'},
  {feature: 'Брой клинично доказани щамове',        others: '1-2',         bactology: '5 на формула'},
  {feature: 'Lactobacillus bulgaricus (БГ щам)',    others: false,         bactology: true},
  {feature: 'DR-Caps™ растителни капсули',          others: false,         bactology: true},
  {feature: 'Издържа на стомашна киселина',         others: 'Понякога',    bactology: true},
  {feature: 'Произведено в България',               others: false,         bactology: true},
  {feature: 'Лабораторно потвърден CFU брой',       others: false,         bactology: true},
  {feature: 'HACCP / GMP / ISO сертификати',        others: 'Различни',    bactology: true},
];

/**
 * "Други vs Bactology" feature comparison table — mirrors NL Beauty's
 * "Защо хората избират X" pattern. Side-by-side ✓/✗ matrix that makes the
 * differentiation tangible.
 *
 * Rows are configurable so each product can have its own comparison.
 * Defaults focus on Bactology's flagship advantages: CFU count, multi-strain,
 * native bulgaricus, DR-Caps™, BG manufacturing, certified labs.
 */
export function ComparisonTable({
  title = 'Защо хората избират Bactology',
  subtitle = 'Сравни предимствата на нашата формула спрямо стандартните пробиотици на пазара.',
  rows = DEFAULT_ROWS,
}: Props = {}) {
  return (
    <section className="bb-cmp" aria-labelledby="bb-cmp-title">
      <div className="bb-cmp-head">
        <span className="bb-cmp-tag">Сравнение</span>
        <h2 id="bb-cmp-title" className="bb-cmp-title">{title}</h2>
        <p className="bb-cmp-sub">{subtitle}</p>
      </div>

      <div className="bb-cmp-table">
        {/* Header row */}
        <div className="bb-cmp-row bb-cmp-row--head">
          <div></div>
          <div className="bb-cmp-col-others">Обикновени пробиотици</div>
          <div className="bb-cmp-col-us">
            <span className="bb-cmp-us-name">Bactology</span>
            <span className="bb-cmp-us-tag">Препоръчано</span>
          </div>
        </div>

        {rows.map((r, i) => (
          <div key={i} className="bb-cmp-row">
            <div className="bb-cmp-feature">{r.feature}</div>
            <CompareCell value={r.others} positive={false} />
            <CompareCell value={r.bactology} positive={true} />
          </div>
        ))}
      </div>

      <style>{`
        .bb-cmp {
          margin: 56px 0;
        }
        .bb-cmp-head {
          text-align: center;
          margin-bottom: 32px;
        }
        .bb-cmp-tag {
          display: inline-block;
          font-size: 11px; font-weight: 800;
          letter-spacing: 1.4px;
          text-transform: uppercase;
          color: var(--color-brand-pink);
          padding: 5px 12px;
          background: var(--color-pink-1);
          border-radius: 999px;
          margin-bottom: 12px;
        }
        .bb-cmp-title {
          font-size: clamp(26px, 3.6vw, 36px);
          font-weight: 800;
          letter-spacing: -0.8px;
          line-height: 1.1;
          margin: 0 0 12px;
          color: var(--color-ink);
        }
        .bb-cmp-sub {
          font-size: 14.5px;
          color: rgba(10, 37, 64, 0.7);
          max-width: 540px;
          margin: 0 auto;
          line-height: 1.55;
        }

        .bb-cmp-table {
          display: grid;
          gap: 4px;
          max-width: 880px;
          margin: 0 auto;
          padding: 8px;
          background: var(--color-cream-2);
          border-radius: 18px;
        }
        .bb-cmp-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 12px;
          align-items: center;
          padding: 14px 20px;
          background: white;
          border-radius: 12px;
          font-size: 13.5px;
        }
        @media (max-width: 720px) {
          .bb-cmp-row {
            grid-template-columns: 1.6fr 1fr 1fr;
            gap: 8px;
            padding: 12px 14px;
            font-size: 12.5px;
          }
        }
        .bb-cmp-row--head {
          background: transparent;
          padding: 0 20px 4px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          color: rgba(10, 37, 64, 0.55);
        }
        @media (max-width: 720px) {
          .bb-cmp-row--head { padding: 0 14px 4px; }
        }
        .bb-cmp-feature {
          font-weight: 700;
          color: var(--color-ink);
        }
        .bb-cmp-col-others {
          text-align: center;
        }
        .bb-cmp-col-us {
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .bb-cmp-us-name {
          font-family: var(--font-serif);
          font-style: italic;
          font-weight: 500;
          font-size: 14px;
          letter-spacing: -0.2px;
          color: var(--color-brand-pink);
          text-transform: none;
        }
        .bb-cmp-us-tag {
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: 1.2px;
          color: rgba(227, 22, 108, 0.7);
        }

        /* Comparison cells */
        .bb-cmp-cell {
          text-align: center;
          font-weight: 600;
          color: rgba(10, 37, 64, 0.78);
        }
        .bb-cmp-cell--positive {
          color: var(--color-brand-pink);
          font-weight: 800;
        }
        .bb-cmp-cell--bool {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 26px; height: 26px;
          border-radius: 999px;
          font-size: 14px;
          font-weight: 900;
        }
        .bb-cmp-cell--yes {
          background: var(--color-pink-1);
          color: var(--color-brand-pink);
        }
        .bb-cmp-cell--no {
          background: rgba(10, 37, 64, 0.06);
          color: rgba(10, 37, 64, 0.35);
        }
      `}</style>
    </section>
  );
}

function CompareCell({value, positive}: {value: boolean | string; positive: boolean}) {
  if (typeof value === 'boolean') {
    return (
      <div className="bb-cmp-cell">
        <span className={`bb-cmp-cell--bool ${value ? 'bb-cmp-cell--yes' : 'bb-cmp-cell--no'}`}>
          {value ? '✓' : '—'}
        </span>
      </div>
    );
  }
  return (
    <div className={`bb-cmp-cell ${positive ? 'bb-cmp-cell--positive' : ''}`}>{value}</div>
  );
}
