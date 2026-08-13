import {useEffect, useRef, useState} from 'react';

const COPY = [
  {h: 'Доставени<br/>точно където <em>работят.</em>', l: 'Стомашната киселина унищожава 90% от пробиотиците преди да достигнат целта. Нашата киселинно-устойчива капсула отваря дозата в дебелото черво.'},
  {h: 'В контакт с<br/>стомашна <em>киселина.</em>', l: 'Обикновените капсули се разтварят за минути в стомаха. Нашата DR-Caps™ обвивка устоява на pH 1.5 за над 2 часа.'},
  {h: 'Отваряне на<br/><em>точното място.</em>', l: 'Само в средата на тънкото черво - където pH-ът е оптимален - капсулата започва да отдава съдържанието си.'},
  {h: '50 милиарда<br/>живи <em>бактерии.</em>', l: 'Пет щама плюс автентичен Lactobacillus bulgaricus - освободени активни и готови да се прикрепят към чревната стена.'},
  {h: 'Колонизация.<br/>Резултати <em>седмици.</em>', l: 'Проучванията показват измерима промяна в микробиома след 14 дни. Усещане за разлика - между 2 и 6 седмици.'},
];

const FRAMES = [
  '/images/capsule/cap-frame-0.png',
  '/images/capsule/cap-frame-1.png',
  '/images/capsule/cap-frame-2.png',
  '/images/capsule/cap-frame-3.png',
  '/images/capsule/cap-frame-4.png',
];

export function CapsuleScience() {
  const sectionRef = useRef<HTMLElement>(null);
  const frameRefs = useRef<(HTMLDivElement | null)[]>([]);
  const callout2Ref = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    // Mobile: skip the scroll-driven scrubbing entirely. The sticky
    // animation requires ~115vh of dead scroll which feels broken on
    // touch devices; on mobile we just pin the final frame + show both
    // callouts always, and the user gets the same information via a
    // single short section instead of a long scroll-jacked one.
    const isMobile = () => window.matchMedia('(max-width: 880px)').matches;
    if (isMobile()) {
      frameRefs.current.forEach((f, i) => {
        if (f) f.style.opacity = i === FRAMES.length - 1 ? '1' : '0';
      });
      callout2Ref.current?.classList.add('visible');
      setActiveIdx(COPY.length - 1);
      // Still listen for resize → re-evaluate if user rotates / DevTools resize
      const onResize = () => {
        if (!isMobile()) {
          // Switched to desktop — start the scroll-driven animation
          window.location.reload();
        }
      };
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }

    const onScroll = () => {
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;
      const sectionH = section.offsetHeight;
      // overall: 0 = section's top at viewport bottom, 1 = section's bottom at viewport top
      const overall = Math.max(0, Math.min(1, (vh - rect.top) / (sectionH + vh)));
      // Animation maps to overall 0.15 → 0.50 (early start, fully open by midpoint)
      const animStart = 0.15;
      const animEnd = 0.50;
      const animProgress = Math.max(0, Math.min(1, (overall - animStart) / (animEnd - animStart)));

      const N = FRAMES.length;
      const idx = animProgress * (N - 1);
      const lo = Math.floor(idx);
      const hi = Math.min(N - 1, lo + 1);
      const frac = idx - lo;
      frameRefs.current.forEach((f, i) => {
        if (!f) return;
        if (i === lo && i !== hi) f.style.opacity = String(1 - frac);
        else if (i === hi && i !== lo) f.style.opacity = String(frac);
        else if (i === lo && i === hi) f.style.opacity = '1';
        else f.style.opacity = '0';
      });
      callout2Ref.current?.classList.toggle('visible', animProgress > 0.55);
      const newIdx = Math.round(idx);
      setActiveIdx((prev) => (prev !== newIdx ? newIdx : prev));
    };

    window.addEventListener('scroll', onScroll, {passive: true});
    window.addEventListener('resize', onScroll);
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <section ref={sectionRef} className="bb-scroll-cap">
      <div className="bb-scroll-cap-bg"></div>

      {/* Floating bacteria particles */}
      <div className="bb-particles">
        <div className="bb-particle" style={{top: '18%', left: '8%', width: 14, height: 14, background: 'var(--color-pink-2)', '--dur': '18s', '--delay': '0s'} as any}></div>
        <div className="bb-particle" style={{top: '32%', left: '14%', width: 8, height: 8, background: 'var(--color-blue-3)', '--dur': '22s', '--delay': '2s'} as any}></div>
        <div className="bb-particle" style={{top: '55%', left: '6%', width: 11, height: 11, background: 'var(--color-cream-3)', '--dur': '20s', '--delay': '4s'} as any}></div>
        <div className="bb-particle" style={{top: '72%', left: '18%', width: 6, height: 6, background: 'var(--color-pink-3)', '--dur': '24s', '--delay': '1s'} as any}></div>
        <div className="bb-particle" style={{top: '25%', right: '10%', width: 10, height: 10, background: 'var(--color-blue-2)', '--dur': '19s', '--delay': '3s'} as any}></div>
        <div className="bb-particle" style={{top: '48%', right: '6%', width: 14, height: 14, background: 'var(--color-pink-2)', '--dur': '23s', '--delay': '5s'} as any}></div>
        <div className="bb-particle" style={{top: '68%', right: '14%', width: 7, height: 7, background: 'var(--color-cream-3)', '--dur': '21s', '--delay': '0.5s'} as any}></div>
        <div className="bb-particle" style={{top: '85%', right: '8%', width: 9, height: 9, background: 'var(--color-pink-3)', '--dur': '17s', '--delay': '2.5s'} as any}></div>
      </div>

      <div className="bb-scroll-cap-sticky">
        <div className="bb-scroll-cap-text">
          <div className="bb-cap-eyebrow"><span className="bb-cap-pulse"></span>DR-CAPS™ ТЕХНОЛОГИЯ</div>
          {/* Client (т.7): ONE fixed text - no per-scroll text swap; only the
              capsule frames animate. (Old cycling heading "Колонизация…" removed.) */}
          {/* „2 седмици" излизаше от рамката на един ред с „още след"
              (клиент, 2026-08-11), затова се пренася само то. */}
          <h2 className="bb-cap-h2">Възстановява баланса на микробиома<br />още след<br /><em>2 седмици.</em></h2>
          <p className="bb-cap-lede">DR-Caps™ киселинно-устойчивата капсула доставя 50 милиарда живи бактерии точно в дебелото черво. Проучванията показват измерима промяна в микробиома вече след 14 дни.</p>
        </div>

        <div className="bb-cap-stage">
          {FRAMES.map((src, i) => (
            <div
              key={i}
              ref={(el) => {
                frameRefs.current[i] = el;
              }}
              className="bb-cap-frame"
              style={{opacity: i === 0 ? 1 : 0}}
            >
              {/* ⚠️ `loading="lazy"` не е дребна добавка.
                *
                * Без него React вдига всеки от петте кадъра с
                * `<link rel="preload" as="image">` в главата на документа.
                * Тази секция стои далеч надолу по страницата, тоест браузърът
                * дърпаше пет второстепенни картинки с най-висок приоритет,
                * докато първата видима снимка чакаше реда си. Анимацията се
                * скролва - кадрите имат предостатъчно време да дойдат. */}
              <img src={src} alt="" aria-hidden="true" loading="lazy" decoding="async" />
            </div>
          ))}
          {/* Callouts — absolutely positioned overlays on desktop, but the
           * mobile-only `.bb-cap-stats` wrapper lets the same elements
           * sit as an inline 2-up row below the stage on small screens
           * (display: contents on desktop = wrapper is invisible to layout). */}
          <div className="bb-cap-stats">
            <div ref={callout2Ref} className="bb-cap-callout bb-cap-callout-2">
              <div className="bb-cap-num">50<span className="bb-cap-u">B</span></div>
              <div className="bb-cap-text"><div className="bb-cap-l">CFU на доза</div>5 живи щама + L. bulgaricus</div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .bb-scroll-cap {
          position: relative; height: 115vh;
          background:
            radial-gradient(circle at 50% 40%, var(--color-pink-1) 0%, transparent 55%),
            radial-gradient(circle at 30% 70%, var(--color-blue-1) 0%, transparent 50%),
            var(--color-cream-2);
          overflow: hidden;
        }
        .bb-scroll-cap-bg {
          position: absolute; inset: 0;
          background-image: url('/images/capsule/capsule-bacteria-bg.png');
          background-size: cover; background-position: center;
          opacity: 0.45; pointer-events: none;
        }
        .bb-scroll-cap-sticky {
          position: sticky; top: 0;
          height: 100vh;
          display: grid; grid-template-columns: 1fr 1.1fr;
          align-items: stretch; gap: 40px;
          max-width: 1380px; margin: 0 auto;
          padding: 0 36px;
        }
        /* Mobile rebuild — the scroll-driven sticky animation simply does not
         * translate to small screens: floating callouts overlap the capsule
         * art, the sticky container traps the user, and "115vh" creates dead
         * scroll. On mobile we drop the gimmick and serve the same content
         * as a clean, single-column story: eyebrow → headline → capsule
         * image (fixed aspect-ratio) → lede → stats row (2-up, not floating).
         * Same information, half the friction. */
        @media (max-width: 880px) {
          .bb-scroll-cap {
            height: auto;
            min-height: 0;
            padding: 36px 0 44px;
          }
          .bb-scroll-cap-sticky {
            position: static;
            height: auto;
            grid-template-columns: 1fr;
            padding: 0 18px;
            gap: 20px;
          }
        }
        @media (max-width: 980px) and (min-width: 881px) {
          .bb-scroll-cap-sticky { grid-template-columns: 1fr; padding: 4vh 20px; gap: 14px; }
        }
        .bb-scroll-cap-text {
          display: flex; flex-direction: column; justify-content: center;
          position: relative; z-index: 4;
        }
        .bb-cap-eyebrow {
          display: inline-flex; align-items: center; gap: 10px;
          font-size: 11px; letter-spacing: 2.4px; text-transform: uppercase; font-weight: 800;
          color: var(--color-brand-pink);
          padding: 7px 16px;
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(12px);
          border-radius: 999px;
          margin-bottom: 28px; width: max-content;
          border: 1px solid rgba(255, 255, 255, 0.8);
        }
        .bb-cap-pulse {
          width: 7px; height: 7px;
          background: var(--color-brand-pink);
          border-radius: 50%;
          animation: pulse-glow 2.4s ease infinite;
        }
        .bb-cap-h2 {
          /* Беше clamp(40px, 5.6vw, 76px) и заглавието излизаше извън рамката
             на средни екрани (клиент, 2026-08-10). */
          font-size: clamp(32px, 4.4vw, 60px);
          font-weight: 800; line-height: 0.96;
          letter-spacing: -2.2px;
          color: var(--color-ink);
        }
        .bb-cap-h2 em { font-family: var(--font-serif); font-style: italic; font-weight: 400; color: var(--color-brand-pink); }
        .bb-cap-lede {
          font-size: 17px; color: rgba(10, 37, 64, 0.78); line-height: 1.7;
          max-width: 460px; margin-top: 26px;
        }

        .bb-cap-stage {
          position: relative;
          height: 100%; width: 100%;
        }
        .bb-cap-frame {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          opacity: 0;
          transition: opacity 0.25s ease;
          will-change: opacity;
        }
        .bb-cap-frame img {
          width: 100%; height: 100%;
          object-fit: cover;
          object-position: center;
          mix-blend-mode: multiply;
          filter: drop-shadow(0 30px 40px rgba(10, 37, 64, 0.22));
          transform: scale(1.35);
        }

        /* Wrapper is invisible to layout on desktop (callouts position absolutely
         * via .bb-cap-callout-1 / -2) — on mobile becomes a 2-col grid below the
         * stage. See mobile media block at bottom. */
        .bb-cap-stats { display: contents; }
        .bb-cap-callout {
          position: absolute;
          z-index: 5;
          background: white;
          border-radius: 18px;
          padding: 14px 22px;
          box-shadow: 0 20px 40px -12px rgba(10, 37, 64, 0.15);
          border: 1px solid rgba(10, 37, 64, 0.1);
          display: flex; align-items: center; gap: 14px;
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }
        .bb-cap-callout.visible { opacity: 1; transform: translateY(0); }
        .bb-cap-callout-1 { top: 12%; right: 4%; }
        .bb-cap-callout-2 { bottom: 14%; left: 4%; }
        .bb-cap-num {
          font-family: var(--font-serif); font-style: italic; font-weight: 500;
          font-size: 36px; line-height: 1; letter-spacing: -1.2px;
          color: var(--color-brand-pink);
        }
        .bb-cap-u { font-size: 18px; }
        .bb-cap-text { font-size: 12px; font-weight: 700; line-height: 1.3; color: var(--color-ink); max-width: 130px; }
        .bb-cap-l { font-size: 9px; opacity: 0.55; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 3px; font-weight: 800; }

        /* Mobile rebuild of stage + callouts (matches the simplified mobile
         * layout above): square stage with the final frame fully visible,
         * two stats stacked side-by-side BELOW the stage (not floating). */
        @media (max-width: 880px) {
          .bb-cap-h2 { font-size: 32px; letter-spacing: -1.2px; line-height: 1.04; }
          /* Replace the hard <br/> in the CMS copy with whitespace on mobile
           * — the heading is short enough to flow naturally and the forced
           * line break would otherwise cause "Колонизация." and "Резултати"
           * to merge with no space when br is hidden. */
          .bb-cap-h2 br { display: inline; }
          .bb-cap-h2 br::before { content: " "; white-space: pre; }
          .bb-cap-lede { font-size: 15px; margin-top: 12px; max-width: none; }
          .bb-cap-eyebrow { margin-bottom: 14px; }

          .bb-cap-stage {
            aspect-ratio: 1 / 1;
            max-height: 360px;
            border-radius: 24px;
            overflow: hidden;
            background: radial-gradient(circle at 50% 40%, rgba(255,255,255,0.5) 0%, transparent 70%);
          }
          .bb-cap-frame img {
            mix-blend-mode: normal;
            transform: scale(1.05);
          }

          /* Frames stay absolutely-positioned inside a fixed-aspect stage,
           * but we make space BELOW the stage for the stats row by giving
           * the stage a definite height and placing the stats wrapper as a
           * sibling underneath (via a wrapping flex/grid on the parent).
           *
           * The parent of .bb-cap-stage on mobile is .bb-scroll-cap-sticky
           * (single-column grid). The .bb-cap-stats is now a child of
           * .bb-cap-stage in the JSX, so we use a flex column on the stage
           * with absolute frames + a relative stats footer that sits at the
           * bottom outside the frame stack. */
          .bb-cap-stage {
            aspect-ratio: auto;
            max-height: none;
            display: flex !important;
            flex-direction: column;
            gap: 12px;
          }
          .bb-cap-frame {
            position: absolute !important;
            inset: 0;
          }
          /* Frame container — a square box at the top of the stage that
           * houses all absolute-positioned frames. */
          .bb-cap-stage::before {
            content: "";
            display: block;
            aspect-ratio: 1 / 1;
            max-height: 320px;
            border-radius: 24px;
            background: radial-gradient(circle at 50% 40%, rgba(255,255,255,0.5) 0%, transparent 70%);
          }
          /* Re-target frames to fill the ::before box via absolute positioning
           * relative to .bb-cap-stage (whose position:relative is preserved
           * from the desktop rules). The ::before reserves the layout space. */
          .bb-cap-frame {
            top: 0;
            left: 0;
            right: 0;
            height: min(320px, 100vw - 36px);
            aspect-ratio: 1 / 1;
            border-radius: 24px;
            overflow: hidden;
          }

          /* Stats wrapper — was display:contents on desktop, becomes a real
           * 2-col grid container below the capsule image. */
          .bb-cap-stats {
            display: grid !important;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            flex-shrink: 0;
          }
          /* Callouts: drop absolute positioning, drop opacity-0 (the scroll
           * reveal never fires on mobile), shrink padding. */
          .bb-cap-callout,
          .bb-cap-callout-1,
          .bb-cap-callout-2 {
            position: static;
            opacity: 1 !important;
            transform: none !important;
            top: auto; right: auto; bottom: auto; left: auto;
            padding: 12px 14px;
            border-radius: 14px;
            gap: 10px;
          }
          .bb-cap-num { font-size: 28px; }
          .bb-cap-u { font-size: 14px; }
          .bb-cap-text { font-size: 11px; max-width: none; min-width: 0; }
          .bb-cap-l { font-size: 8.5px; }
        }

        .bb-particles {
          position: absolute; inset: 0;
          pointer-events: none;
          z-index: 3;
        }
        .bb-particle {
          position: absolute;
          border-radius: 50%;
          opacity: 0.35;
          animation: drift-particle var(--dur, 20s) ease-in-out infinite;
          animation-delay: var(--delay, 0s);
        }
      `}</style>
    </section>
  );
}
