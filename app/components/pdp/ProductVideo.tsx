interface Props {
  /** Optional real MP4 / WebM source. When omitted, renders an animated SVG
   *  infographic (4 horizontal stations). */
  videoSrc?: string;
  poster?: string;
  title?: string;
  subtitle?: string;
}

/**
 * "Виж как работи" section — replaces the previous body-silhouette SVG with a
 * clinical 4-station horizontal infographic that's appropriate for any
 * audience and reads at a glance.
 *
 * Stages: Глътка → Защитена в стомаха → DR-Caps™ се разтваря → Бактериите цъфтят
 *
 * Capsule travels along the connector line; final station has a "bloom" of
 * pink dots representing bacteria multiplying in the colon.
 */
export function ProductVideo({
  videoSrc,
  poster,
  title = 'Как работи пробиотикът',
  subtitle = 'От поглъщането до колонизирането на червата — четири стъпки, обяснени за 9 секунди.',
}: Props = {}) {
  return (
    <section className="bb-pvideo" aria-labelledby="bb-pvideo-title">
      <div className="bb-pvideo-head">
        <span className="bb-pvideo-tag">Виж в действие</span>
        <h2 id="bb-pvideo-title" className="bb-pvideo-title">{title}</h2>
        <p className="bb-pvideo-sub">{subtitle}</p>
      </div>

      <div className="bb-pvideo-frame">
        {videoSrc ? (
          <video controls poster={poster} className="bb-pvideo-el">
            <source src={videoSrc} type="video/mp4" />
            Браузърът ти не поддържа видео.
          </video>
        ) : (
          <>
            {/* Desktop: horizontal SVG animation (capsule travels stations).
             * Mobile: vertical timeline so each station is fully readable. */}
            <div className="bb-pvideo-desktop-only">
              <CapsuleJourneyAnimation />
            </div>
            <div className="bb-pvideo-mobile-only">
              <CapsuleJourneyVertical />
            </div>
          </>
        )}
      </div>

      <style>{`
        /* Desktop shows horizontal SVG (capsule traveling stations).
         * Mobile shows a vertical timeline of the same 4 stations — better
         * for narrow screens where the SVG would crunch icons + labels into
         * unreadable pinpoints. We swap via display:none in CSS rather than
         * conditional render so SSR doesn't flicker. */
        .bb-pvideo-mobile-only { display: none; }
        @media (max-width: 720px) {
          .bb-pvideo-desktop-only { display: none; }
          .bb-pvideo-mobile-only { display: block; }
        }
        .bb-pvideo { margin: 56px 0; }
        .bb-pvideo-head { text-align: center; margin-bottom: 28px; }
        .bb-pvideo-tag {
          display: inline-block;
          font-size: 11px; font-weight: 800;
          letter-spacing: 1.4px; text-transform: uppercase;
          color: var(--color-brand-pink);
          padding: 5px 12px;
          background: var(--color-pink-1);
          border-radius: 999px;
          margin-bottom: 12px;
        }
        .bb-pvideo-title {
          font-size: clamp(26px, 3.6vw, 36px);
          font-weight: 800;
          letter-spacing: -0.8px;
          line-height: 1.1;
          color: var(--color-ink);
          margin: 0 0 12px;
        }
        .bb-pvideo-sub {
          font-size: 14.5px;
          color: rgba(10, 37, 64, 0.7);
          line-height: 1.55;
          max-width: 540px;
          margin: 0 auto;
        }
        .bb-pvideo-frame {
          border-radius: 24px;
          overflow: hidden;
          background: linear-gradient(135deg, var(--color-cream-2) 0%, var(--color-pink-1) 100%);
          box-shadow: 0 30px 60px -20px rgba(10, 37, 64, 0.2);
          position: relative;
          padding: 48px 32px;
        }
        @media (max-width: 720px) {
          .bb-pvideo-frame { padding: 32px 18px; border-radius: 18px; }
        }
        .bb-pvideo-el {
          width: 100%; aspect-ratio: 16 / 9;
          object-fit: cover;
          display: block;
          border-radius: 16px;
        }
      `}</style>
    </section>
  );
}

/**
 * Horizontal 4-station infographic — no body silhouette, no phallic shapes.
 * Each station is a circular icon with a label; a thin connector line carries
 * the moving capsule; pink dots "bloom" at the end station.
 */
function CapsuleJourneyAnimation() {
  // Station positions (x coords in 800-wide viewbox)
  const STATIONS = [
    {x: 100, label: '1. Глътка',           sub: 'С вода, сутрин'},
    {x: 300, label: '2. Защитена в стомаха', sub: 'DR-Caps™ устойчиви'},
    {x: 500, label: '3. Разтваряне',         sub: 'В тънкото черво'},
    {x: 700, label: '4. Цъфтеж',             sub: '50 млрд CFU в колона'},
  ];

  return (
    <div className="bb-pj">
      <svg viewBox="0 0 800 320" preserveAspectRatio="xMidYMid meet" aria-label="Пътят на пробиотика през храносмилателната система">
        <defs>
          <linearGradient id="bb-pj-cap-l" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0267a0" />
            <stop offset="100%" stopColor="#0489d3" />
          </linearGradient>
          <linearGradient id="bb-pj-cap-r" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#e3166c" />
            <stop offset="100%" stopColor="#ff4d99" />
          </linearGradient>
          <radialGradient id="bb-pj-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#e3166c" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#e3166c" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="bb-pj-stop" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#fdeef3" />
            <stop offset="100%" stopColor="#fbd6e3" />
          </radialGradient>
          <radialGradient id="bb-pj-stop-bloom" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fdeef3" />
            <stop offset="60%" stopColor="#fbd6e3" />
            <stop offset="100%" stopColor="#f5a4c4" />
          </radialGradient>
        </defs>

        {/* Connector line between stations */}
        <line
          x1={STATIONS[0].x}
          y1="140"
          x2={STATIONS[STATIONS.length - 1].x}
          y2="140"
          stroke="#0a2540"
          strokeWidth="1.2"
          strokeDasharray="5 6"
          opacity="0.18"
        />

        {/* Station circles + icons */}
        {STATIONS.map((s, i) => {
          const isLast = i === STATIONS.length - 1;
          return (
            <g key={i} transform={`translate(${s.x} 140)`}>
              {/* Station circle */}
              <circle
                cx="0" cy="0" r="38"
                fill={isLast ? 'url(#bb-pj-stop-bloom)' : 'url(#bb-pj-stop)'}
                stroke="#e3166c"
                strokeWidth="1.5"
                strokeOpacity={isLast ? '0.85' : '0.35'}
              />

              {/* Station icon */}
              {i === 0 && (
                // Drop (water/swallow)
                <path
                  d="M0 -14 C0 -14 8 -6 8 4 A8 8 0 1 1 -8 4 C-8 -6 0 -14 0 -14 Z"
                  fill="none"
                  stroke="#0a2540"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {i === 1 && (
                // Shield (protected)
                <g fill="none" stroke="#0a2540" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M0 -14 L11 -9 L11 1 C11 8 6 13 0 15 C-6 13 -11 8 -11 1 L-11 -9 Z" />
                  <path d="M-4 1 L-1 4 L5 -3" />
                </g>
              )}
              {i === 2 && (
                // Opening capsule (release)
                <g>
                  <ellipse cx="-6" cy="0" rx="9" ry="6" fill="#0489d3" />
                  <ellipse cx="6" cy="0" rx="9" ry="6" fill="#ff4d99" opacity="0.85" />
                  {/* Bacteria dots escaping */}
                  <circle cx="-3" cy="-10" r="1.6" fill="#e3166c" />
                  <circle cx="3" cy="-12" r="1.4" fill="#e3166c" />
                  <circle cx="8" cy="-9" r="1.2" fill="#e3166c" />
                </g>
              )}
              {i === 3 && (
                // Circle of dots (bloom / colonization)
                <g>
                  {Array.from({length: 7}).map((_, j) => {
                    const a = (j * Math.PI * 2) / 7 - Math.PI / 2;
                    const cx = Math.cos(a) * 10;
                    const cy = Math.sin(a) * 10;
                    return <circle key={j} cx={cx} cy={cy} r="2.4" fill="#e3166c" />;
                  })}
                  <circle cx="0" cy="0" r="3" fill="#e3166c" opacity="0.8" />
                </g>
              )}

              {/* Station number badge */}
              <circle
                cx="-28" cy="-28" r="11"
                fill="#0a2540"
              />
              <text
                x="-28" y="-25"
                textAnchor="middle"
                fontSize="11"
                fontWeight="800"
                fill="#fdeef3"
                fontFamily="Manrope, sans-serif"
              >{i + 1}</text>

              {/* Label below */}
              <text
                x="0" y="64"
                textAnchor="middle"
                fontSize="12"
                fontWeight="800"
                fill="#0a2540"
                fontFamily="Manrope, sans-serif"
              >{s.label.replace(/^\d+\.\s*/, '')}</text>
              <text
                x="0" y="80"
                textAnchor="middle"
                fontSize="10"
                fontWeight="600"
                fill="#0a2540"
                fillOpacity="0.55"
                fontFamily="Manrope, sans-serif"
              >{s.sub}</text>

              {/* Pulsing glow on the final colonization station */}
              {isLast && (
                <circle cx="0" cy="0" r="38" fill="url(#bb-pj-glow)">
                  <animate attributeName="r" values="38;52;38" dur="2.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.45;0.95;0.45" dur="2.4s" repeatCount="indefinite" />
                </circle>
              )}
            </g>
          );
        })}

        {/* Animated capsule traveling along the connector line */}
        <g>
          <animateMotion
            dur="9s"
            repeatCount="indefinite"
            keyTimes="0; 0.22; 0.5; 0.78; 1"
            path={`M ${STATIONS[0].x} 140 L ${STATIONS[1].x} 140 L ${STATIONS[2].x} 140 L ${STATIONS[3].x} 140 L ${STATIONS[3].x} 140`}
          />
          <g>
            <rect x="-22" y="-7" width="22" height="14" rx="7" fill="url(#bb-pj-cap-l)" />
            <rect x="0"   y="-7" width="22" height="14" rx="7" fill="url(#bb-pj-cap-r)" />
            <line x1="-18" y1="-2.5" x2="-8" y2="-2.5" stroke="white" strokeWidth="1.4" opacity="0.55" strokeLinecap="round" />
          </g>
          {/* Tiny glow trailing the capsule */}
          <circle r="18" fill="url(#bb-pj-glow)" opacity="0.55">
            <animate attributeName="r" values="14;22;14" dur="1.5s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* Caption strip at the bottom */}
        <g transform="translate(400 295)">
          <text
            textAnchor="middle"
            fontSize="10.5"
            fontWeight="800"
            fill="#0a2540"
            fillOpacity="0.55"
            letterSpacing="0.8"
            fontFamily="Manrope, sans-serif"
          >9-СЕКУНДНА ВИЗУАЛИЗАЦИЯ · ПЪТЯТ НА BACTOLOGY ПРОБИОТИКА</text>
        </g>
      </svg>

      <style>{`
        .bb-pj { width: 100%; }
        .bb-pj svg { width: 100%; height: auto; display: block; }
        @media (max-width: 720px) {
          .bb-pj svg { min-height: 320px; }
        }
      `}</style>
    </div>
  );
}

/**
 * Mobile timeline — same 4 stations as the desktop SVG, rendered as a
 * vertical sequence with big icons + readable labels. The connecting line
 * runs down the left side; each station has number, icon, title, and a
 * short subline. Final station pulses pink ("colonization bloom").
 */
function CapsuleJourneyVertical() {
  const STATIONS = [
    {n: 1, title: 'Глътка',                sub: 'С вода, сутрин на гладно',                  icon: 'drop'},
    {n: 2, title: 'Защитена в стомаха',    sub: 'DR-Caps™ устойчиви на pH 1.5',              icon: 'shield'},
    {n: 3, title: 'Разтваряне',            sub: 'В средата на тънкото черво',                icon: 'capsule'},
    {n: 4, title: 'Цъфтеж',                sub: '50 млрд CFU колонизират дебелото черво',    icon: 'bloom'},
  ];
  return (
    <ol className="bb-pjv" aria-label="Пътят на пробиотика — 4 стъпки">
      {STATIONS.map((s, i) => {
        const isLast = i === STATIONS.length - 1;
        return (
          <li key={s.n} className={`bb-pjv-step${isLast ? ' is-final' : ''}`}>
            <div className="bb-pjv-num" aria-hidden="true">{s.n}</div>
            <div className="bb-pjv-icon" aria-hidden="true">
              {s.icon === 'drop' && (
                <svg viewBox="-12 -16 24 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M0 -14 C0 -14 8 -6 8 4 A8 8 0 1 1 -8 4 C-8 -6 0 -14 0 -14 Z" />
                </svg>
              )}
              {s.icon === 'shield' && (
                <svg viewBox="-13 -16 26 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M0 -14 L11 -9 L11 1 C11 8 6 13 0 15 C-6 13 -11 8 -11 1 L-11 -9 Z" />
                  <path d="M-4 1 L-1 4 L5 -3" />
                </svg>
              )}
              {s.icon === 'capsule' && (
                <svg viewBox="-16 -14 32 28">
                  <ellipse cx="-6" cy="0" rx="9" ry="6" fill="#0489d3" />
                  <ellipse cx="6" cy="0" rx="9" ry="6" fill="#ff4d99" opacity="0.85" />
                  <circle cx="-3" cy="-10" r="1.6" fill="#e3166c" />
                  <circle cx="3" cy="-12" r="1.4" fill="#e3166c" />
                  <circle cx="8" cy="-9" r="1.2" fill="#e3166c" />
                </svg>
              )}
              {s.icon === 'bloom' && (
                <svg viewBox="-16 -16 32 32">
                  {Array.from({length: 7}).map((_, j) => {
                    const a = (j * Math.PI * 2) / 7 - Math.PI / 2;
                    const cx = Math.cos(a) * 10;
                    const cy = Math.sin(a) * 10;
                    return <circle key={j} cx={cx} cy={cy} r="2.4" fill="#e3166c" />;
                  })}
                  <circle cx="0" cy="0" r="3" fill="#e3166c" opacity="0.8" />
                </svg>
              )}
            </div>
            <div className="bb-pjv-body">
              <div className="bb-pjv-title">{s.title}</div>
              <div className="bb-pjv-sub">{s.sub}</div>
            </div>
          </li>
        );
      })}
      <style>{`
        .bb-pjv {
          list-style: none;
          padding: 0;
          margin: 0;
          position: relative;
          counter-reset: bb-pjv-step;
        }
        .bb-pjv-step {
          display: grid;
          grid-template-columns: 36px 56px 1fr;
          align-items: center;
          gap: 14px;
          padding: 14px 4px;
          position: relative;
        }
        /* Connector line through all steps */
        .bb-pjv-step::before {
          content: "";
          position: absolute;
          left: 17px;
          top: 50%; bottom: -50%;
          width: 2px;
          background: linear-gradient(180deg, rgba(227,22,108,0.35) 0%, rgba(227,22,108,0.15) 100%);
          z-index: 0;
        }
        .bb-pjv-step:last-child::before { display: none; }
        .bb-pjv-num {
          width: 36px; height: 36px;
          border-radius: 999px;
          background: var(--color-ink);
          color: var(--color-cream-1);
          font-size: 14px;
          font-weight: 800;
          display: inline-flex;
          align-items: center; justify-content: center;
          position: relative;
          z-index: 1;
        }
        .bb-pjv-icon {
          width: 56px; height: 56px;
          border-radius: 999px;
          background: white;
          border: 1.5px solid rgba(227, 22, 108, 0.3);
          color: var(--color-ink);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .bb-pjv-icon svg { width: 28px; height: 28px; }
        .bb-pjv-step.is-final .bb-pjv-icon {
          background: linear-gradient(135deg, #fdeef3, #fbd6e3);
          border-color: rgba(227, 22, 108, 0.7);
          animation: bb-pjv-pulse 2.4s ease-in-out infinite;
        }
        @keyframes bb-pjv-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(227, 22, 108, 0.35); }
          50%      { box-shadow: 0 0 0 10px rgba(227, 22, 108, 0); }
        }
        .bb-pjv-title {
          font-size: 16px;
          font-weight: 800;
          color: var(--color-ink);
          letter-spacing: -0.3px;
          line-height: 1.2;
        }
        .bb-pjv-sub {
          font-size: 13px;
          color: rgba(10, 37, 64, 0.65);
          margin-top: 3px;
          line-height: 1.4;
        }
      `}</style>
    </ol>
  );
}
