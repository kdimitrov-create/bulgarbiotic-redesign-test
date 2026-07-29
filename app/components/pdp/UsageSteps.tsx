interface Step {
  num: string;
  title: string;
  description: string;
  /** Monoline brand SVG icon (24×24, 1.6 stroke). */
  icon: JSX.Element;
}

interface Props {
  title?: string;
  subtitle?: string;
  steps?: Step[];
}

const DEFAULT_STEPS: Step[] = [
  {
    num: '01',
    title: 'Сутрин с първото хранене',
    description:
      'Приеми 1 капсула с първото си хранене. Храната буферира стомашната киселина и помага щамовете да достигнат живи до червата.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3v9l5 3" />
      </svg>
    ),
  },
  {
    num: '02',
    title: 'Чаша вода',
    description:
      'Поглъщай с минимум 200 мл вода (с/без газ — без значение). Водата помага равномерното разтваряне в червата.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3c0 0 6 7 6 12a6 6 0 11-12 0c0-5 6-12 6-12z" />
        <path d="M9 14a3 3 0 003 3" opacity="0.6" />
      </svg>
    ),
  },
  {
    num: '03',
    title: 'Минимум 4 седмици',
    description:
      'Първи видим ефект за 7-10 дни. За устойчив резултат — поне 4 седмици редовно. Безопасен за дълъг прием 2-3 месеца.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <line x1="8" y1="3" x2="8" y2="7" />
        <line x1="16" y1="3" x2="16" y2="7" />
        <path d="M9 14l2 2 4-4" />
      </svg>
    ),
  },
];

/**
 * Three-step visual usage guide — mirrors the "Как да постигнеш най-добри
 * резултати" pattern from NL Beauty's PDP, adapted for daily probiotic
 * intake. Big number badge + monoline brand icon + 1-line title + concise
 * description.
 *
 * Steps are extensible via props for product-specific guidance (e.g. kids
 * formula would say "разтвори в малко вода или прясно мляко").
 */
export function UsageSteps({
  title = 'Как се ползва',
  subtitle = 'Три прости стъпки за максимална ефективност на пробиотика.',
  steps = DEFAULT_STEPS,
}: Props = {}) {
  return (
    <section className="bb-usage" aria-labelledby="bb-usage-title">
      <div className="bb-usage-head">
        <span className="bb-usage-tag">Употреба</span>
        <h2 id="bb-usage-title" className="bb-usage-title">{title}</h2>
        <p className="bb-usage-sub">{subtitle}</p>
      </div>

      <ol className="bb-usage-grid">
        {steps.map((s, i) => (
          <li key={i} className="bb-usage-step">
            <div className="bb-usage-num">{s.num}</div>
            <div className="bb-usage-icon" aria-hidden="true">{s.icon}</div>
            <h3 className="bb-usage-step-title">{s.title}</h3>
            <p className="bb-usage-step-desc">{s.description}</p>
            {i < steps.length - 1 && (
              <div className="bb-usage-connector" aria-hidden="true">
                <svg viewBox="0 0 80 12" preserveAspectRatio="none">
                  <path d="M0 6 L80 6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
                </svg>
              </div>
            )}
          </li>
        ))}
      </ol>

      <style>{`
        .bb-usage {
          margin: 56px 0;
        }
        .bb-usage-head {
          text-align: center;
          margin-bottom: 36px;
        }
        .bb-usage-tag {
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
        .bb-usage-title {
          font-size: clamp(26px, 3.6vw, 36px);
          font-weight: 800;
          letter-spacing: -0.8px;
          line-height: 1.1;
          margin: 0 0 12px;
          color: var(--color-ink);
        }
        .bb-usage-sub {
          font-size: 14.5px;
          color: rgba(10, 37, 64, 0.7);
          line-height: 1.55;
          max-width: 520px;
          margin: 0 auto;
        }

        .bb-usage-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          list-style: none;
          padding: 0;
          margin: 0;
          position: relative;
        }
        @media (max-width: 720px) {
          .bb-usage-grid { grid-template-columns: 1fr; gap: 16px; }
        }

        .bb-usage-step {
          position: relative;
          padding: 32px 26px;
          background: white;
          border: 1px solid rgba(10, 37, 64, 0.08);
          border-radius: 20px;
          text-align: center;
          transition: all 0.22s;
        }
        .bb-usage-step:hover {
          border-color: var(--color-brand-pink);
          transform: translateY(-4px);
          box-shadow: 0 18px 36px -14px rgba(227, 22, 108, 0.2);
        }
        .bb-usage-num {
          font-family: var(--font-serif);
          font-style: italic;
          font-weight: 500;
          font-size: 56px;
          line-height: 1;
          color: var(--color-pink-1);
          margin-bottom: 4px;
          letter-spacing: -2px;
          transition: color 0.22s;
        }
        .bb-usage-step:hover .bb-usage-num { color: var(--color-brand-pink); }
        .bb-usage-icon {
          width: 48px; height: 48px;
          margin: 0 auto 12px;
          border-radius: 14px;
          background: var(--color-pink-1);
          color: var(--color-brand-pink);
          display: flex; align-items: center; justify-content: center;
          transition: all 0.22s;
        }
        .bb-usage-step:hover .bb-usage-icon {
          background: var(--color-brand-pink);
          color: white;
        }
        .bb-usage-icon svg { width: 24px; height: 24px; }

        .bb-usage-step-title {
          font-size: 17px;
          font-weight: 800;
          color: var(--color-ink);
          margin: 0 0 8px;
          letter-spacing: -0.3px;
        }
        .bb-usage-step-desc {
          font-size: 13px;
          color: rgba(10, 37, 64, 0.7);
          line-height: 1.55;
          margin: 0;
        }

        /* Dashed connector line between steps (desktop only) */
        .bb-usage-connector {
          position: absolute;
          top: 50%;
          left: calc(100% - 6px);
          width: calc(100% - 12px);
          height: 12px;
          color: var(--color-pink-2);
          pointer-events: none;
          z-index: -1;
        }
        @media (max-width: 720px) {
          .bb-usage-connector { display: none; }
        }
        .bb-usage-connector svg { width: 100%; height: 100%; }
      `}</style>
    </section>
  );
}
