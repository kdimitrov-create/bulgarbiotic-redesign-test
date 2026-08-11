import {Link} from 'react-router';
import {useEffect, useState} from 'react';

/**
 * The awards band — one slide per distinction, rotating in place.
 *
 * Client 2026-08-05: the field that held the BGolden banner becomes a slider,
 * so a second (and later a third) award can share it without another section.
 *
 * The awards are real:
 *   • BGolden Awards 2025 — "Най-добър български бранд за пробиотици",
 *     9 December 2025, Sofia; a joint platform of EVA and GRAZIA.
 *     Source: /article/bulgar-biotik-e-nay-dobriyat-balgarski-brand-za-probiotici-za-2025-g
 *   • Forbes Business Awards — finalist, "Семейна компания на годината".
 *
 * ⚠️ The Forbes slide has no article on our site yet, so its button points at
 * the media page. Swap `href` below once the client supplies the real target.
 *
 * Rendered between <Reviews /> and <PressStrip /> as a strong second-layer
 * trust signal. Dark surface gives visual breathing room against the cream
 * sections around it.
 */

type Slide = {
  key: string;
  tag: string;
  titleTop: string;
  titleAccent: string;
  body: React.ReactNode;
  issuer: React.ReactNode;
  meta: string;
  href: string;
  /** Either the drawn BGolden medallion or a supplied badge image. */
  medal: 'bgolden' | {src: string; alt: string};
};

/**
 * Значката на Forbes.
 *
 * Досега идваше от CDN-а на магазина като продуктов банер - 100x100 пиксела,
 * което на екрана се размазваше (клиент, 2026-08-10). Сега е локален файл
 * 600x600, изрязан от оригинала, който клиентът прати.
 */
const FORBES_BADGE = '/images/awards/forbes-2026.png';

const SLIDES: Slide[] = [
  {
    key: 'bgolden',
    tag: 'Награда · Декември 2025',
    titleTop: 'Най-добър български бранд',
    titleAccent: 'за пробиотици.',
    body: (
      <>
        Получихме престижното отличие на церемонията <strong>BGolden Awards 2025</strong> — съвместна
        платформа на списанията <em>EVA</em> и <em>GRAZIA</em>, която отличава най-изявените български
        брандове в красотата, уелнеса и съвременния начин на живот.
      </>
    ),
    issuer: (
      <>
        <span className="bb-award-issuer-name">EVA</span>
        <span className="bb-award-issuer-x">×</span>
        <span className="bb-award-issuer-name">GRAZIA</span>
      </>
    ),
    meta: '9 декември 2025 · София',
    href: '/article/bulgar-biotik-e-nay-dobriyat-balgarski-brand-za-probiotici-za-2025-g',
    medal: 'bgolden',
  },
  {
    key: 'forbes',
    tag: 'Отличие · Forbes Business Awards',
    titleTop: 'Семейна компания',
    titleAccent: 'на годината.',
    body: (
      <>
        Bulgar Biotic беше отличена като <strong>финалист</strong> в престижните{' '}
        <em>Forbes Business Awards</em> в категория „Семейна компания на годината" — признание за
        устойчивото развитие на семейния бизнес, иновациите и последователния ни стремеж да
        създаваме висококачествени пробиотични продукти с български произход.
      </>
    ),
    issuer: <span className="bb-award-issuer-name">FORBES</span>,
    meta: 'Business Awards · 2026',
    href: '/page/mediite-za-nas',
    medal: {src: FORBES_BADGE, alt: 'Forbes Business Awards'},
  },
];

const AUTOPLAY_MS = 7000;

export function Award() {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = SLIDES.length;

  // Autoplay, unless there is nothing to rotate, the visitor is interacting
  // with the band, or they asked the system for less motion.
  useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = setInterval(() => setIdx((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [count, paused]);

  const go = (next: number) => setIdx((next + count) % count);
  const slide = SLIDES[idx];

  return (
    <section
      className="bb-award reveal"
      aria-labelledby="bb-award-title"
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* `key` restarts the fade so a slide change reads as a change. */}
      <div className="bb-container bb-award-grid" key={slide.key}>
        {/* Trophy badge */}
        <div className="bb-award-medal" aria-hidden="true">
        {slide.medal === 'bgolden' ? (
          <svg viewBox="0 0 200 200" fill="none">
            {/* Outer ribbon */}
            <path d="M65 160 L40 195 L70 188 L78 170 Z" fill="#c4974f" />
            <path d="M135 160 L160 195 L130 188 L122 170 Z" fill="#c4974f" />
            {/* Outer medallion ring */}
            <circle cx="100" cy="95" r="78" fill="url(#bb-gold-grad)" stroke="#a07c3a" strokeWidth="2" />
            {/* Inner disc */}
            <circle cx="100" cy="95" r="62" fill="#1a1a1a" stroke="#d4af6a" strokeWidth="1.5" />
            {/* Star burst */}
            <g stroke="#d4af6a" strokeWidth="0.6" fill="none" opacity="0.35">
              {Array.from({length: 16}).map((_, i) => {
                const a = (i * Math.PI * 2) / 16;
                const x1 = 100 + Math.cos(a) * 64;
                const y1 = 95 + Math.sin(a) * 64;
                const x2 = 100 + Math.cos(a) * 76;
                const y2 = 95 + Math.sin(a) * 76;
                return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
              })}
            </g>
            {/* "2025" badge text */}
            <text x="100" y="78" textAnchor="middle" fill="#d4af6a" fontSize="11" fontWeight="700" letterSpacing="2.4" fontFamily="Manrope, sans-serif">BGOLDEN</text>
            <text x="100" y="106" textAnchor="middle" fill="#f4d585" fontSize="34" fontWeight="800" fontFamily="Fraunces, serif" fontStyle="italic">2025</text>
            <text x="100" y="125" textAnchor="middle" fill="#d4af6a" fontSize="8" fontWeight="600" letterSpacing="1.8" fontFamily="Manrope, sans-serif">AWARDS</text>
            <defs>
              <radialGradient id="bb-gold-grad" cx="40%" cy="35%" r="75%">
                <stop offset="0%" stopColor="#f4d585" />
                <stop offset="55%" stopColor="#d4af6a" />
                <stop offset="100%" stopColor="#a07c3a" />
              </radialGradient>
            </defs>
          </svg>
        ) : (
          <img
            className="bb-award-badge-img"
            src={`${slide.medal.src}?width=440&height=440`}
            alt=""
            loading="lazy"
            onError={(e) => {
              // Arbitrary sizes can 404 on the CloudCart CDN — fall back to the
              // untouched file rather than showing a broken image.
              const el = e.currentTarget;
              if (el.dataset.fellBack) return;
              el.dataset.fellBack = '1';
              el.src = (slide.medal as {src: string}).src;
            }}
          />
        )}
        </div>

        <div className="bb-award-copy">
          <span className="bb-award-tag">{slide.tag}</span>
          <h2 id="bb-award-title" className="bb-award-h2">
            {slide.titleTop}<br />
            <span className="bb-award-accent">{slide.titleAccent}</span>
          </h2>
          <p className="bb-award-p">{slide.body}</p>

          <div className="bb-award-actions">
            <div className="bb-award-meta">
              <span className="bb-award-issuer">{slide.issuer}</span>
              <span className="bb-award-dot" aria-hidden="true" />
              <span>{slide.meta}</span>
            </div>

            <Link to={slide.href} className="bb-award-cta" prefetch="intent">
              Разбери повече
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {count > 1 && (
        <div className="bb-award-nav">
          <button
            type="button"
            className="bb-award-arrow"
            onClick={() => go(idx - 1)}
            aria-label="Предишно отличие"
          >
            ‹
          </button>
          <div className="bb-award-dots" role="tablist" aria-label="Отличия">
            {SLIDES.map((s, i) => (
              <button
                key={s.key}
                type="button"
                role="tab"
                aria-selected={i === idx}
                aria-label={s.titleTop}
                className={`bb-award-dotbtn${i === idx ? ' on' : ''}`}
                onClick={() => go(i)}
              />
            ))}
          </div>
          <button
            type="button"
            className="bb-award-arrow"
            onClick={() => go(idx + 1)}
            aria-label="Следващо отличие"
          >
            ›
          </button>
        </div>
      )}

      <style>{`
        .bb-award {
          background: linear-gradient(135deg, #0a2540 0%, #112c4d 100%);
          color: var(--color-cream-1);
          padding: 90px 0;
          position: relative;
          overflow: hidden;
        }
        .bb-award::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 18% 35%, rgba(212, 175, 106, 0.16) 0%, transparent 38%),
            radial-gradient(circle at 82% 75%, rgba(227, 22, 108, 0.14) 0%, transparent 42%);
          pointer-events: none;
        }
        .bb-award-grid {
          position: relative;
          display: grid;
          grid-template-columns: 240px 1fr;
          gap: 60px;
          align-items: center;
          padding: 0 36px;
          /* Holds the taller of the two slides so switching does not make the
             page jump under the reader. */
          min-height: 260px;
          animation: bb-award-fade .5s ease both;
        }
        @keyframes bb-award-fade {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .bb-award-grid { animation: none; }
        }
        @media (max-width: 880px) {
          .bb-award { padding: 64px 0; }
          .bb-award-grid {
            grid-template-columns: 1fr;
            gap: 28px;
            padding: 0 22px;
            text-align: center;
            justify-items: center;
          }
        }

        .bb-award-medal {
          /* Смалена с 10% и без сияние (клиент, 2026-08-11): златният
             drop-shadow се разстилаше около кръга и върху тъмносиния фон
             четеше като бял ореол, тоест като подложка зад логото. */
          width: 198px; height: 198px;
          animation: bb-medal-float 5s ease-in-out infinite;
        }
        .bb-award-medal svg { width: 100%; height: 100%; }
        @keyframes bb-medal-float {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          50%      { transform: translateY(-8px) rotate(1deg); }
        }
        @media (max-width: 880px) {
          .bb-award-medal { width: 162px; height: 162px; }
        }

        .bb-award-tag {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.6px;
          text-transform: uppercase;
          color: #d4af6a;
          padding: 5px 12px;
          background: rgba(212, 175, 106, 0.12);
          border: 1px solid rgba(212, 175, 106, 0.3);
          border-radius: 999px;
          margin-bottom: 16px;
        }
        .bb-award-h2 {
          font-size: clamp(30px, 4.4vw, 46px);
          font-weight: 700;
          line-height: 1.05;
          letter-spacing: -1.2px;
          margin-bottom: 18px;
        }
        .bb-award-accent {
          font-family: var(--font-serif);
          font-style: italic;
          font-weight: 400;
          color: #f4d585;
        }
        .bb-award-p {
          font-size: 15px;
          line-height: 1.7;
          color: rgba(250, 246, 236, 0.78);
          max-width: 580px;
          margin-bottom: 22px;
        }
        @media (max-width: 880px) {
          .bb-award-p { margin-left: auto; margin-right: auto; }
        }
        .bb-award-p em {
          font-family: var(--font-serif);
          font-style: italic;
          color: #f4d585;
          font-weight: 500;
        }

        /* Meta row + CTA share one horizontal row with a generous gap.
           Wraps cleanly on narrow screens because the parent uses flex-wrap. */
        .bb-award-actions {
          display: flex;
          align-items: center;
          gap: 28px;
          flex-wrap: wrap;
          justify-content: flex-start;
        }
        @media (max-width: 880px) {
          .bb-award-actions { justify-content: center; gap: 18px; }
        }

        .bb-award-meta {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-size: 12px;
          font-weight: 600;
          color: rgba(250, 246, 236, 0.65);
          flex-wrap: wrap;
        }
        .bb-award-issuer {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 5px 12px;
          background: rgba(250, 246, 236, 0.08);
          border-radius: 999px;
        }
        .bb-award-issuer-name {
          font-family: var(--font-serif);
          font-style: italic;
          font-size: 14px;
          letter-spacing: 1.2px;
          color: var(--color-cream-1);
        }
        .bb-award-issuer-x {
          opacity: 0.5;
          font-size: 11px;
        }
        .bb-award-dot {
          width: 3px; height: 3px;
          border-radius: 999px;
          background: rgba(250, 246, 236, 0.4);
        }

        .bb-award-cta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #d4af6a;
          color: #0a2540;
          padding: 13px 24px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.3px;
          transition: background 0.2s, transform 0.2s, box-shadow 0.2s;
        }
        .bb-award-cta:hover {
          background: #f4d585;
          color: #0a2540;
          text-decoration: none;
          transform: translateY(-2px);
          box-shadow: 0 10px 28px -8px rgba(244, 213, 133, 0.5);
        }
        .bb-award-cta svg { width: 14px; height: 14px; }

        /* A supplied badge image stands in for the drawn medallion. */
        .bb-award-badge-img {
          width: 100%; height: 100%;
          object-fit: contain;
          display: block;
        }

        /* Slider controls — quiet gold, centred under the band. */
        .bb-award-nav {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          margin-top: 34px;
        }
        .bb-award-arrow {
          width: 34px; height: 34px;
          display: inline-flex; align-items: center; justify-content: center;
          border-radius: 999px;
          border: 1px solid rgba(212, 175, 106, 0.35);
          background: rgba(212, 175, 106, 0.10);
          color: #f4d585;
          font-size: 20px; line-height: 1;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
        }
        .bb-award-arrow:hover { background: rgba(212, 175, 106, 0.22); border-color: #f4d585; }
        .bb-award-dots { display: inline-flex; align-items: center; gap: 8px; }
        .bb-award-dotbtn {
          width: 8px; height: 8px;
          padding: 0;
          border: 0;
          border-radius: 999px;
          background: rgba(250, 246, 236, 0.28);
          cursor: pointer;
          transition: background 0.2s, width 0.2s;
        }
        .bb-award-dotbtn.on { background: #d4af6a; width: 22px; }
        @media (max-width: 880px) {
          .bb-award-nav { margin-top: 26px; }
        }
      `}</style>
    </section>
  );
}
