import {Link} from 'react-router';

/**
 * Product forms educator — mirrors the "В какви форми се предлагат
 * пробиотиците Bactology?" section from the real bulgarbiotic.bg homepage.
 *
 * Bactology has innovated beyond standard freeze-dried capsules — they offer
 * pearls (sucking tablets with chocolate), chewable tablets, and traditional
 * DR-Caps™. This section explains which form fits which use-case, with quick
 * jump links to the relevant collection / sample SKU.
 *
 * Designed to sit between BundleFeature and CapsuleScience — bridges from
 * the "what's in the box" → "how to take it" educational arc.
 */
type Form = {
  key: string;
  title: string;
  tagline: string;
  desc: string;
  who: string;
  link: string;
  icon: JSX.Element;
  accent: 'pink' | 'blue' | 'cream' | 'gold';
};

const FORMS: Form[] = [
  {
    key: 'drcaps',
    title: 'DR-Caps™ капсули',
    tagline: 'Класиката',
    desc: 'DR-Caps™ обвивка с отложено освобождаване - бактериите достигат живи до червата ти.',
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
    title: 'Пробиотични перли',
    tagline: 'С естествен шоколад',
    desc: 'Дъвчащи перли с млечен и натурален шоколад без захар - пробиотик като приятно лакомство.',
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
    title: 'Дъвчащи таблетки',
    tagline: 'За орална хигиена',
    desc: 'Вкусни ванилови таблетки за смучене - за орална хигиена и подкрепа на децата.',
    who: 'Деца от 3+ години',
    // Client 2026-08-05: this card pointed at the Babies & Kids sachets — the
    // same product as the card next to it. Chewable tablets are Bactology Tablets.
    link: '/product/probiotic-tablets-in-precisely-balanced-combination-copy',
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
    title: 'Сашета за бебета и деца до 14 год.',
    tagline: 'Чувствителна формула',
    desc: 'Лесни за прием сашета - особено подходящи при колики и нередовен стомах.',
    who: 'Бебета и деца до 14 г.',
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

export function ProductForms() {
  return (
    <section className="bb-forms reveal" aria-labelledby="bb-forms-title">
      <div className="bb-container">
        <div className="bb-forms-head">
          <span className="section-tag" style={{justifyContent: 'center'}}>Образование</span>
          <h2 id="bb-forms-title" className="section-h2" style={{textAlign: 'center'}}>
            В какви форми се предлагат<br /><span className="accent">пробиотиците.</span>
          </h2>
          <p className="bb-forms-sub">
            Не всеки пробиотик е капсула. Bactology беше първият български бранд, който предложи
            алтернативни форми - за деца, бебета и хора, които не обичат да приемат хапчета.
          </p>
        </div>

        <div className="bb-forms-grid bb-mobile-slider">
          {FORMS.map((f) => (
            <Link
              key={f.key}
              to={f.link}
              className={`bb-form-card bb-form-card--${f.accent}`}
              prefetch="intent"
            >
              <div className="bb-form-icon" aria-hidden="true">{f.icon}</div>
              <h3 className="bb-form-title">{f.title}</h3>
              <p className="bb-form-desc">{f.desc}</p>
              <div className="bb-form-meta">
                <span className="bb-form-who">{f.who}</span>
                <svg className="bb-form-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <style>{`
        .bb-forms {
          background: var(--color-cream-1);
          padding: 90px 0 100px;
        }
        @media (max-width: 880px) { .bb-forms { padding: 64px 0 72px; } }

        .bb-forms-head {
          text-align: center;
          margin-bottom: 48px;
          padding: 0 36px;
        }
        .bb-forms-sub {
          max-width: 560px;
          margin: 16px auto 0;
          font-size: 15px;
          line-height: 1.65;
          color: rgba(10, 37, 64, 0.7);
        }

        .bb-forms-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
          padding: 0 36px;
        }
        @media (max-width: 980px) {
          .bb-forms-grid { grid-template-columns: 1fr 1fr; gap: 14px; padding: 0 22px; }
        }
        @media (max-width: 540px) {
          .bb-forms-grid { grid-template-columns: 1fr; }
        }

        .bb-form-card {
          display: flex;
          flex-direction: column;
          padding: 28px 24px 26px;
          border-radius: 20px;
          background: white;
          border: 1px solid rgba(10, 37, 64, 0.06);
          color: var(--color-ink);
          transition: transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.22s, border-color 0.22s;
          position: relative;
          overflow: hidden;
        }
        .bb-form-card:hover {
          text-decoration: none;
          transform: translateY(-4px);
          box-shadow: 0 18px 36px -14px rgba(10, 37, 64, 0.18);
        }
        .bb-form-card::before {
          content: "";
          position: absolute;
          inset: 0 0 auto 0;
          height: 88px;
          opacity: 0.55;
          z-index: 0;
          transition: opacity 0.25s;
        }
        .bb-form-card:hover::before { opacity: 0.85; }
        .bb-form-card--pink::before  { background: linear-gradient(180deg, var(--color-pink-1),  transparent); }
        .bb-form-card--blue::before  { background: linear-gradient(180deg, var(--color-blue-1),  transparent); }
        .bb-form-card--cream::before { background: linear-gradient(180deg, var(--color-cream-2), transparent); }
        .bb-form-card--gold::before  { background: linear-gradient(180deg, rgba(244, 213, 133, 0.45), transparent); }

        .bb-form-icon {
          position: relative;
          z-index: 1;
          width: 44px; height: 44px;
          margin-bottom: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .bb-form-card--pink  .bb-form-icon { color: var(--color-brand-pink); }
        .bb-form-card--blue  .bb-form-icon { color: var(--color-brand-blue, #0267A0); }
        .bb-form-card--cream .bb-form-icon { color: #b58a4f; }
        .bb-form-card--gold  .bb-form-icon { color: #c4974f; }
        .bb-form-icon svg { width: 44px; height: 44px; }

        .bb-form-tag {
          position: relative;
          z-index: 1;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 1.4px;
          text-transform: uppercase;
          color: rgba(10, 37, 64, 0.55);
          margin-bottom: 6px;
        }
        .bb-form-title {
          position: relative;
          z-index: 1;
          font-size: 18px;
          font-weight: 700;
          line-height: 1.25;
          letter-spacing: -0.3px;
          margin-bottom: 10px;
          color: var(--color-ink);
        }
        .bb-form-desc {
          position: relative;
          z-index: 1;
          font-size: 13px;
          line-height: 1.55;
          color: rgba(10, 37, 64, 0.7);
          margin-bottom: 18px;
          flex: 1;
        }
        .bb-form-meta {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-top: 1px solid rgba(10, 37, 64, 0.08);
          padding-top: 14px;
        }
        .bb-form-who {
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.3px;
          color: var(--color-ink);
        }
        .bb-form-arrow {
          width: 14px; height: 14px;
          color: var(--color-brand-pink);
          transition: transform 0.18s;
        }
        .bb-form-card:hover .bb-form-arrow { transform: translateX(4px); }
      `}</style>
    </section>
  );
}
