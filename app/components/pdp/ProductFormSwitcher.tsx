import {Link} from 'react-router';

/**
 * "В какви форми се предлага този пробиотик" cross-form switcher.
 *
 * Mirrors the <ProductForms /> educator from the homepage but contextualized
 * to the CURRENT product on PDP:
 *   • Highlights which form THIS product is ("Ти си тук")
 *   • Other 3 are clickable cross-sells to a representative product / category
 *
 * Form is inferred from the product handle/title with deterministic rules.
 */

type FormKey = 'capsules' | 'pearls' | 'tablets' | 'sachets';

interface Props {
  productHandle: string;
  productTitle: string;
}

interface FormCard {
  key: FormKey;
  label: string;
  tag: string;
  desc: string;
  who: string;
  link: string;
  icon: JSX.Element;
  accent: 'pink' | 'cream' | 'blue' | 'gold';
}

const FORMS: FormCard[] = [
  {
    key: 'capsules',
    label: 'DR-Caps™ капсули',
    tag: 'Класиката',
    desc: 'Растителна обвивка с отложено освобождаване — бактериите достигат живи до червата.',
    who: 'Възрастни',
    link: '/category/all-products',
    accent: 'pink',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 14a10 10 0 0114-14l20 20a10 10 0 11-14 14L14 14z" transform="rotate(-30 24 24)" />
        <line x1="18" y1="18" x2="30" y2="30" transform="rotate(-30 24 24)" />
      </svg>
    ),
  },
  {
    key: 'pearls',
    label: 'Пробиотични перли',
    tag: 'С натурален шоколад',
    desc: 'Дъвчащи перли с млечен и натурален шоколад без захар — пробиотик като приятно лакомство.',
    who: 'Деца и възрастни',
    link: '/category/perli',
    accent: 'cream',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="16" cy="32" r="7" />
        <circle cx="32" cy="32" r="7" />
        <circle cx="24" cy="18" r="7" />
        <circle cx="16" cy="32" r="2" fill="currentColor" />
        <circle cx="32" cy="32" r="2" fill="currentColor" />
        <circle cx="24" cy="18" r="2" fill="currentColor" />
      </svg>
    ),
  },
  {
    key: 'tablets',
    label: 'Дъвчащи таблетки',
    tag: 'Smart Start серия',
    desc: 'Вкусни ванилови таблетки за смучене — за орална хигиена и подкрепа на децата.',
    who: 'Деца от 3+ години',
    link: '/product/probiotik-za-bebe-deca-i-podrastvashti-babies-and-kids',
    accent: 'blue',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="10" y="14" width="28" height="20" rx="10" />
        <path d="M14 24h20" strokeDasharray="2 3" opacity="0.5" />
      </svg>
    ),
  },
  {
    key: 'sachets',
    label: 'Сашета за бебета',
    tag: 'Чувствителна формула',
    desc: 'Нежни сашета за най-малките — лесно дозиране при бебешка колика и нередовност.',
    who: 'Бебета до 3 г.',
    link: '/product/probiotik-za-bebe-deca-i-podrastvashti-babies-and-kids',
    accent: 'gold',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {/* Sachet body — small pouch with rounded corners */}
        <rect x="12" y="14" width="24" height="26" rx="2.5" />
        {/* Perforated tear-line near top */}
        <line x1="14.5" y1="19" x2="33.5" y2="19" strokeDasharray="2 2" opacity="0.55" />
        {/* Granules inside */}
        <circle cx="20" cy="28" r="1.4" fill="currentColor" opacity="0.7" stroke="none" />
        <circle cx="28" cy="30" r="1.4" fill="currentColor" opacity="0.7" stroke="none" />
        <circle cx="23.5" cy="34" r="1.4" fill="currentColor" opacity="0.7" stroke="none" />
      </svg>
    ),
  },
];

/** Infer which form the current product is, from its handle/title. */
function detectForm(handle: string, title: string): FormKey {
  const h = handle.toLowerCase();
  const t = title.toLowerCase();
  if (h.includes('perli') || h.includes('pearl') || t.includes('перли')) return 'pearls';
  if (h.includes('tablet') || t.includes('таблет')) return 'tablets';
  if (h.includes('babies') || h.includes('bebe') || t.includes('бебе')) {
    // Babies & Kids product is chewable + sachet format
    return 'sachets';
  }
  return 'capsules';
}

export function ProductFormSwitcher({productHandle, productTitle}: Props) {
  const currentForm = detectForm(productHandle, productTitle);

  return (
    <section className="bb-formswitch" aria-labelledby="bb-formswitch-title">
      <header className="bb-formswitch-head">
        <span className="bb-formswitch-tag">Bactology формати</span>
        <h2 id="bb-formswitch-title">
          В какви <em>форми</em> се предлагат пробиотиците
        </h2>
        <p>
          Не всеки пробиотик е капсула. Bactology е създал няколко формата
          според възрастта и предпочитанията.
        </p>
      </header>

      <div className="bb-formswitch-grid bb-mobile-slider">
        {FORMS.map((f) => {
          const isCurrent = f.key === currentForm;
          const inner = (
            <>
              {isCurrent && (
                <span className="bb-formswitch-here">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Този продукт
                </span>
              )}
              <div className="bb-formswitch-icon" aria-hidden="true">{f.icon}</div>
              <div className="bb-formswitch-tag-inner">{f.tag}</div>
              <h3 className="bb-formswitch-title">{f.label}</h3>
              <p className="bb-formswitch-desc">{f.desc}</p>
              <div className="bb-formswitch-meta">
                <span className="bb-formswitch-who">{f.who}</span>
                {!isCurrent && (
                  <svg className="bb-formswitch-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                )}
              </div>
            </>
          );

          const className = `bb-formswitch-card bb-formswitch-card--${f.accent}${isCurrent ? ' bb-formswitch-card--current' : ''}`;
          if (isCurrent) {
            return (
              <div key={f.key} className={className} aria-current="page">
                {inner}
              </div>
            );
          }
          return (
            <Link key={f.key} to={f.link} className={className} prefetch="intent">
              {inner}
            </Link>
          );
        })}
      </div>

      <style>{`
        .bb-formswitch {
          margin: 56px 0;
        }
        @media (max-width: 540px) { .bb-formswitch { margin: 40px 0; } }

        .bb-formswitch-head {
          text-align: center;
          margin-bottom: 32px;
          max-width: 640px;
          margin-left: auto; margin-right: auto;
        }
        .bb-formswitch-tag {
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
        .bb-formswitch-head h2 {
          font-family: var(--font-serif);
          font-weight: 400;
          font-size: clamp(22px, 3vw, 30px);
          line-height: 1.15;
          letter-spacing: -0.6px;
          color: var(--color-ink);
          margin: 0 0 10px;
        }
        .bb-formswitch-head h2 em {
          font-style: italic;
          color: var(--color-brand-pink);
        }
        .bb-formswitch-head p {
          font-size: 14px;
          line-height: 1.55;
          color: rgba(10, 37, 64, 0.7);
          margin: 0;
        }

        .bb-formswitch-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }
        @media (max-width: 980px) { .bb-formswitch-grid { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 540px) { .bb-formswitch-grid { grid-template-columns: 1fr; } }

        .bb-formswitch-card {
          position: relative;
          display: flex;
          flex-direction: column;
          padding: 24px 22px;
          border-radius: 18px;
          background: white;
          border: 1px solid rgba(10, 37, 64, 0.06);
          color: var(--color-ink);
          text-decoration: none;
          transition: all 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
          overflow: hidden;
        }
        .bb-formswitch-card::before {
          content: "";
          position: absolute;
          inset: 0 0 auto 0;
          height: 80px;
          opacity: 0.55;
          z-index: 0;
          pointer-events: none;
          transition: opacity 0.22s;
        }
        .bb-formswitch-card:hover:not(.bb-formswitch-card--current)::before { opacity: 0.85; }
        .bb-formswitch-card--pink::before  { background: linear-gradient(180deg, var(--color-pink-1),  transparent); }
        .bb-formswitch-card--blue::before  { background: linear-gradient(180deg, #e6f0f7, transparent); }
        .bb-formswitch-card--cream::before { background: linear-gradient(180deg, var(--color-cream-2), transparent); }
        .bb-formswitch-card--gold::before  { background: linear-gradient(180deg, rgba(244, 213, 133, 0.45), transparent); }
        a.bb-formswitch-card:hover {
          text-decoration: none;
          transform: translateY(-3px);
          box-shadow: 0 16px 32px -12px rgba(10, 37, 64, 0.18);
        }

        .bb-formswitch-card--current {
          border-color: var(--color-brand-pink);
          box-shadow: 0 0 0 3px rgba(227, 22, 108, 0.16);
          cursor: default;
        }

        .bb-formswitch-here {
          position: absolute;
          top: 12px; right: 12px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 10px 5px 8px;
          background: var(--color-brand-pink);
          color: white;
          border-radius: 999px;
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: 0.3px;
          z-index: 2;
        }
        .bb-formswitch-here svg { width: 12px; height: 12px; }

        .bb-formswitch-icon {
          position: relative; z-index: 1;
          width: 42px; height: 42px;
          margin-bottom: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .bb-formswitch-card--pink  .bb-formswitch-icon { color: var(--color-brand-pink); }
        .bb-formswitch-card--blue  .bb-formswitch-icon { color: var(--color-brand-blue, #0267a0); }
        .bb-formswitch-card--cream .bb-formswitch-icon { color: #b58a4f; }
        .bb-formswitch-card--gold  .bb-formswitch-icon { color: #c4974f; }
        .bb-formswitch-icon svg { width: 42px; height: 42px; }

        .bb-formswitch-tag-inner {
          position: relative; z-index: 1;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          color: rgba(10, 37, 64, 0.55);
          margin-bottom: 5px;
        }
        .bb-formswitch-title {
          position: relative; z-index: 1;
          font-size: 16px;
          font-weight: 800;
          line-height: 1.25;
          letter-spacing: -0.2px;
          color: var(--color-ink);
          margin: 0 0 8px;
        }
        .bb-formswitch-desc {
          position: relative; z-index: 1;
          font-size: 12.5px;
          line-height: 1.5;
          color: rgba(10, 37, 64, 0.7);
          margin: 0 0 16px;
          flex: 1;
        }
        .bb-formswitch-meta {
          position: relative; z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 12px;
          border-top: 1px solid rgba(10, 37, 64, 0.08);
        }
        .bb-formswitch-who {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.3px;
          color: var(--color-ink);
        }
        .bb-formswitch-arrow {
          width: 14px; height: 14px;
          color: var(--color-brand-pink);
          transition: transform 0.18s;
        }
        a.bb-formswitch-card:hover .bb-formswitch-arrow { transform: translateX(3px); }
      `}</style>
    </section>
  );
}
