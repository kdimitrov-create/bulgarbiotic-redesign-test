import {useState} from 'react';
import {Link} from 'react-router';

/**
 * Probiotic finder — interactive 2-3 question quiz that recommends a real
 * Bactology product. The actual quiz UI is in <ProbioticFinderForm /> so it
 * can be reused both:
 *   1. As a section on the homepage (this component)
 *   2. Inside a modal triggered by the floating <ProbioticFinderFAB />
 */
type Who = 'me' | 'partner' | 'kid' | 'baby' | 'pet';
type Goal = 'gut' | 'immunity' | 'stress' | 'beauty' | 'weight' | 'female';

type Q1Option = {value: Who; label: string; icon: JSX.Element};
type Q2Option = {value: Goal; label: string; desc: string};

/** Brand monoline icons (24×24, 1.6px stroke, rounded caps) matching the
 *  TrustStrip / Header / ProductForms visual language. */
const ICON = {
  me: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5.5 19.5c1.4-3.2 3.9-4.8 6.5-4.8s5.1 1.6 6.5 4.8" />
    </svg>
  ),
  partner: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2.8" />
      <circle cx="16" cy="8" r="2.8" />
      <path d="M3 19c.9-2.6 2.6-4 5-4 1.4 0 2.5.5 3.3 1.4" />
      <path d="M12.7 16.4c.8-.9 1.9-1.4 3.3-1.4 2.4 0 4.1 1.4 5 4" />
    </svg>
  ),
  kid: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="7.5" r="2.8" />
      <path d="M7.5 19c1-3 2.5-4.2 4.5-4.2s3.5 1.2 4.5 4.2" />
      <path d="M9.5 22h5" />
      <path d="M9.5 4.2c.7-.6 1.5-.9 2.5-.9s1.8.3 2.5.9" />
    </svg>
  ),
  baby: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="10" r="5" />
      <circle cx="10" cy="10" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="14" cy="10" r="0.6" fill="currentColor" stroke="none" />
      <path d="M10.5 12.5c.5.5 1 .7 1.5.7s1-.2 1.5-.7" />
      <path d="M7 7c.5-1 1.3-1.8 2.3-2.3" />
      <path d="M17 7c-.5-1-1.3-1.8-2.3-2.3" />
    </svg>
  ),
  pet: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="17" rx="4.2" ry="3.1" />
      <ellipse cx="5.6" cy="11" rx="1.5" ry="2.1" />
      <ellipse cx="18.4" cy="11" rx="1.5" ry="2.1" />
      <ellipse cx="9" cy="6.8" rx="1.5" ry="2.1" />
      <ellipse cx="15" cy="6.8" rx="1.5" ry="2.1" />
    </svg>
  ),
};

const WHO_OPTIONS: Q1Option[] = [
  {value: 'me',      label: 'За мен',             icon: ICON.me},
  {value: 'partner', label: 'За партньора ми',    icon: ICON.partner},
  {value: 'kid',     label: 'За дете (3+ г.)',    icon: ICON.kid},
  {value: 'baby',    label: 'За бебе (до 3 г.)',  icon: ICON.baby},
  {value: 'pet',     label: 'За домашен любимец', icon: ICON.pet},
];

const GOAL_OPTIONS: Q2Option[] = [
  {value: 'gut',      label: 'Храносмилане',     desc: 'Газове, подуване, запек'},
  {value: 'immunity', label: 'Имунитет',          desc: 'По-малко настинки, повече енергия'},
  {value: 'stress',   label: 'Стрес и сън',       desc: 'Спокойствие и пълноценна почивка'},
  {value: 'beauty',   label: 'Кожа, коса, нокти', desc: 'Сияйна красота отвътре навън'},
  {value: 'weight',   label: 'За отслабване',      desc: 'Метаболизъм и здравословна форма'},
  {value: 'female',   label: 'Женско здраве',     desc: 'Интимно здраве и хормонален баланс'},
];

type Recommendation = {
  title: string;
  reason: string;
  handle: string;
  badge?: string;
  /** Cover image — Nano Banana enhanced PNG from /public when available,
      otherwise the real CloudCart CDN URL. */
  image: string;
};

function recommend(who: Who, goal: Goal): Recommendation {
  if (who === 'baby') {
    return {
      title: 'Bactology Babies & Kids',
      reason: 'Безопасна формула за бебета и малки деца — нежна към чувствителния микробиом.',
      handle: 'probiotik-za-bebe-deca-i-podrastvashti-babies-and-kids',
      badge: 'Идеално за първите 3 г.',
      image: '/images/generated-v2/p-babies.png',
    };
  }
  if (who === 'kid') {
    return {
      title: 'Smart Start пакет за деца',
      reason: 'Пробиотични перли с шоколад + имуностимулатор — за силен имунитет и щастливо коремче.',
      handle: 'smart-start-paket-za-silen-imunitet',
      badge: 'Любим вкус на децата',
      image: '/images/generated-v2/p-smart-start.png',
    };
  }
  if (who === 'pet') {
    return {
      title: 'Bactology Pets',
      reason: 'За кучета и котки — поддържа здрав микробиом, козина и имунитет.',
      handle: 'bactology-pets',
      badge: 'Ветеринарно одобрен',
      image: '/images/generated-v2/p-pets.png',
    };
  }
  switch (goal) {
    case 'gut':
      return {
        title: 'Bactology Gastro Balance',
        reason: 'Целево решение за газове, подуване и нередовно храносмилане — 50 млрд активни бактерии.',
        handle: 'bactology-probiotik-za-podut-korem-i-gazove-gastro-balance',
        badge: 'Бестселър №1',
        image: '/images/generated-v2/p-gastro.png',
      };
    case 'immunity':
      return {
        title: 'Bactology Colongic',
        reason: 'Пробиотик за дебелото черво — над 70% от имунната система живее там.',
        handle: 'bactology-colongic-probiotik-za-debeloto-chervo',
        badge: 'За цяла година защита',
        image: '/images/generated-v2/p-colongic.png',
      };
    case 'stress':
      return {
        title: 'Bactology Anti Stress',
        reason: 'Подкрепя оста черва-мозък — за по-добър сън и по-малко тревожност.',
        handle: 'bactology-anti-stress',
        badge: 'Калмиращ ефект',
        image: '/images/generated-v2/p-anti-stress.png',
      };
    case 'beauty':
      return {
        title: 'Пакет Beauty',
        reason: 'Активни формули за коса, кожа и нокти — отвътре, не само в крема.',
        handle: 'paket-beauty',
        badge: 'Сияние отвътре',
        image: 'https://bulgarbiotic.bg/cdn/img/products/59/paket-beauty-64edbfebd7bfc.png?width=600&height=600',
      };
    case 'weight':
      return {
        // Client (2026-07-31): this step must read as "Плоско Коремче", not Femin.
        // The old image URL was missing the CDN filename hash → 404 (the card fell
        // back to showing the alt text, which started with "Femin").
        title: 'Плоско Коремче — Femin + Gastro Balance',
        reason: 'Промоционален пакет: 5 пробиотични щама за метаболизъм + хормонален баланс.',
        handle: 'probiotici-za-plosko-koremche-promociya-femin-gastro-balance',
        badge: 'Спести ~20%',
        image: 'https://bulgarbiotic.bg/cdn/img/products/37/probiotici-za-plosko-koremce-promocia-femin--gastro-balance-6523c1e798a57.png?width=600&height=600',
      };
    case 'female':
      return {
        title: 'Bactology Femin',
        reason: 'Специализирана формула за женско интимно здраве и хормонален баланс.',
        handle: 'bactology-probiotik-za-jeni-femin',
        badge: 'Препоръчван от гинеколози',
        image: '/images/generated-v2/p-femin.png',
      };
  }
}

/**
 * Reusable quiz form. Renders just the panel (no section wrapper, no intro
 * column). Used both inline (section on home) and inside the FAB modal.
 *
 * @param onPick - optional callback fired when result link is clicked,
 *                 useful to close the modal when used in overlay.
 */
export function ProbioticFinderForm({onPick}: {onPick?: () => void} = {}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [who, setWho] = useState<Who | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);

  const skipsGoal = who === 'baby' || who === 'kid' || who === 'pet';

  function pickWho(w: Who) {
    setWho(w);
    if (w === 'baby' || w === 'kid' || w === 'pet') setStep(3);
    else setStep(2);
  }
  function pickGoal(g: Goal) {
    setGoal(g);
    setStep(3);
  }
  function restart() {
    setWho(null);
    setGoal(null);
    setStep(1);
  }

  const result = step === 3 && who ? recommend(who, goal ?? 'gut') : null;
  const stepCount = skipsGoal ? 2 : 3;
  const stepNum = step === 1 ? 1 : step === 2 ? 2 : stepCount;

  return (
    <div className="bb-finder-panel" role="region" aria-live="polite">
      {step < 3 && (
        <div className="bb-finder-progress" aria-hidden="true">
          <div className="bb-finder-progress-track">
            <div className="bb-finder-progress-bar" style={{width: `${(stepNum / stepCount) * 100}%`}} />
          </div>
          <span className="bb-finder-step-label">Стъпка {stepNum} от {stepCount}</span>
        </div>
      )}

      {step === 1 && (
        <>
          <h3 className="bb-finder-q">За кого търсиш пробиотик?</h3>
          <div className="bb-finder-grid-opts bb-finder-grid-opts--who">
            {WHO_OPTIONS.map((opt) => (
              <button key={opt.value} type="button" className="bb-finder-opt" onClick={() => pickWho(opt.value)}>
                <span className="bb-finder-opt-icon" aria-hidden="true">{opt.icon}</span>
                <span className="bb-finder-opt-label">{opt.label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <h3 className="bb-finder-q">Какво искаш да подкрепиш?</h3>
          <div className="bb-finder-grid-opts">
            {GOAL_OPTIONS.map((opt) => (
              <button key={opt.value} type="button" className="bb-finder-opt bb-finder-opt--goal" onClick={() => pickGoal(opt.value)}>
                <span className="bb-finder-opt-label">{opt.label}</span>
                <span className="bb-finder-opt-desc">{opt.desc}</span>
              </button>
            ))}
          </div>
          <button type="button" className="bb-finder-back" onClick={() => setStep(1)}>
            ← Назад
          </button>
        </>
      )}

      {step === 3 && result && (
        <div className="bb-finder-result">
          <div className="bb-finder-result-tag">Твоята препоръка</div>

          {/* Hero row — product cover on the left, headline + badge on the right */}
          <div className="bb-finder-result-hero">
            <Link
              to={`/product/${result.handle}`}
              className="bb-finder-result-img"
              prefetch="intent"
              onClick={onPick}
              aria-label={`Виж ${result.title}`}
            >
              <img src={result.image} alt={result.title} loading="lazy" />
            </Link>
            <div className="bb-finder-result-headline">
              {result.badge && (
                <span className="bb-finder-result-badge">{result.badge}</span>
              )}
              <h3 className="bb-finder-result-title">{result.title}</h3>
            </div>
          </div>

          <p className="bb-finder-result-reason">{result.reason}</p>
          <div className="bb-finder-result-actions">
            <Link to={`/product/${result.handle}`} className="bb-finder-cta" prefetch="intent" onClick={onPick}>
              Виж продукта
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
            <button type="button" className="bb-finder-restart" onClick={restart}>
              Започни отначало
            </button>
          </div>
        </div>
      )}

      {/* Panel-internal styles live alongside the form so both the homepage
          section and the FAB modal pick them up automatically. */}
      <style>{`
        .bb-finder-panel {
          background: white;
          border-radius: 22px;
          padding: 32px;
          box-shadow: 0 28px 60px -20px rgba(10, 37, 64, 0.22), 0 6px 16px -6px rgba(10, 37, 64, 0.08);
          min-height: 320px;
          display: flex;
          flex-direction: column;
        }
        @media (max-width: 880px) {
          .bb-finder-panel { padding: 24px; min-height: 0; }
        }

        .bb-finder-progress { margin-bottom: 22px; }
        .bb-finder-progress-track {
          height: 4px; background: rgba(10, 37, 64, 0.08);
          border-radius: 999px; overflow: hidden;
        }
        .bb-finder-progress-bar {
          height: 100%; background: var(--color-brand-pink);
          border-radius: 999px;
          transition: width 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .bb-finder-step-label {
          display: inline-block; margin-top: 8px;
          font-size: 11px; font-weight: 700; letter-spacing: 1px;
          text-transform: uppercase; color: rgba(10, 37, 64, 0.5);
        }

        .bb-finder-q {
          font-size: 20px; font-weight: 700; line-height: 1.3;
          margin-bottom: 18px; color: var(--color-ink);
        }

        .bb-finder-grid-opts {
          display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;
        }
        @media (max-width: 480px) {
          .bb-finder-grid-opts { grid-template-columns: 1fr; }
        }
        .bb-finder-opt {
          background: var(--color-cream-1);
          border: 1.5px solid transparent;
          border-radius: 14px;
          padding: 14px 16px;
          text-align: left;
          font-family: inherit;
          font-size: 14px; font-weight: 600;
          color: var(--color-ink);
          cursor: pointer;
          display: flex; align-items: center; gap: 12px;
          transition: all 0.18s;
        }
        .bb-finder-opt:hover {
          background: white;
          border-color: var(--color-brand-pink);
          transform: translateY(-1px);
          box-shadow: 0 6px 14px -4px rgba(227, 22, 108, 0.2);
        }
        .bb-finder-opt-icon {
          width: 36px; height: 36px;
          border-radius: 10px;
          background: var(--color-pink-1);
          color: var(--color-brand-pink);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          transition: all 0.18s;
        }
        .bb-finder-opt:hover .bb-finder-opt-icon {
          background: var(--color-brand-pink);
          color: white;
        }
        .bb-finder-opt-icon svg { width: 22px; height: 22px; }
        .bb-finder-opt-label { display: block; }
        .bb-finder-opt--goal {
          flex-direction: column;
          align-items: flex-start;
          gap: 4px;
          padding: 14px 16px;
        }
        .bb-finder-opt-desc {
          font-size: 11.5px; font-weight: 500;
          color: rgba(10, 37, 64, 0.55); line-height: 1.3;
        }

        .bb-finder-back {
          background: transparent; border: 0;
          padding: 14px 0 0;
          font-family: inherit; font-size: 12px; font-weight: 700;
          letter-spacing: 0.2px; color: rgba(10, 37, 64, 0.55);
          cursor: pointer; align-self: flex-start;
          transition: color 0.18s;
        }
        .bb-finder-back:hover { color: var(--color-brand-pink); }

        .bb-finder-result { display: flex; flex-direction: column; gap: 0; }
        .bb-finder-result-tag {
          font-size: 11px; font-weight: 700;
          letter-spacing: 1.4px; text-transform: uppercase;
          color: var(--color-brand-pink);
          margin-bottom: 12px;
        }
        .bb-finder-result-hero {
          display: grid;
          grid-template-columns: 96px 1fr;
          gap: 16px;
          align-items: center;
          margin-bottom: 14px;
        }
        @media (max-width: 480px) {
          .bb-finder-result-hero {
            grid-template-columns: 80px 1fr;
            gap: 12px;
          }
        }
        .bb-finder-result-img {
          display: block;
          width: 96px;
          height: 96px;
          border-radius: 14px;
          overflow: hidden;
          background: linear-gradient(135deg, var(--color-pink-1), var(--color-cream-2));
          flex-shrink: 0;
          transition: transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.22s;
        }
        .bb-finder-result-img:hover {
          transform: translateY(-2px) rotate(-1deg);
          box-shadow: 0 12px 24px -8px rgba(227, 22, 108, 0.3);
        }
        .bb-finder-result-img img {
          width: 100%; height: 100%;
          object-fit: cover;
          display: block;
        }
        @media (max-width: 480px) {
          .bb-finder-result-img { width: 80px; height: 80px; border-radius: 12px; }
        }
        .bb-finder-result-headline {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
        }
        .bb-finder-result-badge {
          display: inline-block; align-self: flex-start;
          font-size: 11px; font-weight: 700;
          padding: 4px 10px;
          background: var(--color-pink-1); color: var(--color-brand-pink);
          border-radius: 999px;
        }
        .bb-finder-result-title {
          font-size: 22px; font-weight: 800; line-height: 1.2;
          letter-spacing: -0.5px; color: var(--color-ink);
          margin: 0;
        }
        @media (max-width: 480px) {
          .bb-finder-result-title { font-size: 19px; }
        }
        .bb-finder-result-reason {
          font-size: 14px; line-height: 1.6;
          color: rgba(10, 37, 64, 0.72);
          margin-bottom: 22px;
        }
        .bb-finder-result-actions {
          display: flex; gap: 14px; flex-wrap: wrap; align-items: center;
        }
        .bb-finder-cta {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 13px 22px;
          background: var(--color-ink); color: var(--color-cream-1);
          border-radius: 999px;
          font-size: 13px; font-weight: 800; letter-spacing: 0.3px;
          transition: background 0.18s, transform 0.18s;
        }
        .bb-finder-cta:hover {
          background: var(--color-brand-pink); color: white;
          text-decoration: none; transform: translateY(-1px);
        }
        .bb-finder-cta svg { width: 14px; height: 14px; }
        .bb-finder-restart {
          background: transparent; border: 0; padding: 0;
          font-family: inherit; font-size: 12.5px; font-weight: 700;
          letter-spacing: 0.2px;
          color: rgba(10, 37, 64, 0.55);
          cursor: pointer; transition: color 0.18s;
          text-decoration: underline;
        }
        .bb-finder-restart:hover { color: var(--color-brand-pink); }
      `}</style>
    </div>
  );
}

export function ProbioticFinder() {
  return (
    <section id="bb-finder" className="bb-finder reveal" aria-labelledby="bb-finder-title">
      <div className="bb-container bb-finder-grid">
        <div className="bb-finder-intro">
          <span className="section-tag">Намери своя пробиотик за 30 секунди.</span>
          <h2 id="bb-finder-title" className="section-h2">
            Ако се чудиш кой продукт да избереш,<br />направи <span className="accent">бързия ни тест.</span>
          </h2>
          <div className="bb-finder-trust">
            <span className="bb-finder-dot" />
            Препоръката води към реален продукт от каталога ни
          </div>
        </div>

        <ProbioticFinderForm />
      </div>

      <style>{`
        .bb-finder {
          background: linear-gradient(135deg, var(--color-cream-2) 0%, var(--color-pink-1) 100%);
          padding: 90px 0 100px;
          position: relative;
          overflow: hidden;
        }
        .bb-finder::before {
          content: "";
          position: absolute;
          top: -120px; right: -120px;
          width: 360px; height: 360px;
          background: radial-gradient(circle, rgba(227, 22, 108, 0.16), transparent 70%);
          pointer-events: none;
          filter: blur(20px);
        }
        .bb-finder-grid {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 56px;
          align-items: center;
          padding: 0 36px;
          position: relative;
        }
        @media (max-width: 880px) {
          .bb-finder { padding: 64px 0 72px; }
          .bb-finder-grid { grid-template-columns: 1fr; gap: 32px; padding: 0 22px; }
        }

        .bb-finder-intro .section-tag { margin-bottom: 14px; }
        .bb-finder-sub {
          margin-top: 16px;
          font-size: 15px;
          line-height: 1.65;
          color: rgba(10, 37, 64, 0.72);
          max-width: 440px;
        }
        .bb-finder-trust {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 18px;
          font-size: 12px;
          font-weight: 600;
          color: rgba(10, 37, 64, 0.55);
        }
        .bb-finder-dot { width: 6px; height: 6px; border-radius: 999px; background: var(--color-brand-pink); }
      `}</style>
    </section>
  );
}
