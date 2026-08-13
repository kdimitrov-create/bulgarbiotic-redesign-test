import {useEffect, useRef, useState} from 'react';

type Tile =
  | {kind: 'video'; shape: 'circle' | 'vertical' | 'square' | 'horizontal'; img: string; handle: string; meta?: string; reelId?: string | null}
  | {kind: 'quote'; text: string; source: string};

const TILES: Tile[] = [
  {kind: 'video', shape: 'circle', img: '/images/ugc-stills/ugc-1-femin-bathroom.png', handle: '@elena_p', reelId: null},
  {kind: 'video', shape: 'vertical', img: '/images/ugc-stills/ugc-2-colongic-palm.png', handle: '@marina_a', meta: '2 мес', reelId: null},
  {kind: 'video', shape: 'square', img: '/images/ugc-stills/ugc-3-anti-stress-talking.png', handle: '@yana.k', meta: 'опит', reelId: null},
  {kind: 'video', shape: 'horizontal', img: '/images/ugc-stills/ugc-4-shelf-flat.png', handle: '@dom_in_pastel', reelId: null},
  {kind: 'quote', text: 'Bактology прилага към пробиотиците стандарти, познати само от лекарствената индустрия - и това им печели лоялност от 110 000+ клиенти.', source: 'Forbes Bulgaria'},
  {kind: 'video', shape: 'vertical', img: '/images/ugc-stills/ugc-5-babies-mom.png', handle: '@nia.mama', reelId: null},
  {kind: 'video', shape: 'vertical', img: '/images/ugc-stills/ugc-6-pearls-cafe.png', handle: '@active_kris', reelId: null},
  {kind: 'video', shape: 'horizontal', img: '/images/ugc-stills/ugc-7-family-kitchen.png', handle: '@petrov_family', reelId: null},
  {kind: 'video', shape: 'vertical', img: '/images/ugc-stills/ugc-8-pets-dog.png', handle: '@buddy.golden', reelId: null},
  {kind: 'video', shape: 'square', img: '/images/ugc-stills/ugc-9-kids-play.png', handle: '@sofia.mom', reelId: null},
];

const IGIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.9" fill="currentColor" />
  </svg>
);

const PlayIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
);

const PlayBigIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 21 12 6 21 6 3" /></svg>
);

export function Stories() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const scroll = (delta: number) => {
    scrollRef.current?.scrollBy({left: delta, behavior: 'smooth'});
  };

  // Lock body scroll when modal is open + ESC closes
  useEffect(() => {
    if (activeIdx === null) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveIdx(null);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [activeIdx]);

  const activeTile = activeIdx !== null ? TILES[activeIdx] : null;
  const activeVideo =
    activeTile && activeTile.kind === 'video' ? activeTile : null;

  return (
    <section className="bb-stories">
      <div className="bb-container">
        <div className="bb-stories-head reveal">
          <div>
            <div className="section-tag">@bulgarbiotic · Instagram</div>
            <h2 className="bb-stories-h2">Истории от хора,<br />които ни се <span className="accent">доверяват.</span></h2>
            <p className="bb-stories-lead">Реални reels на @bulgarbiotic - публикуваме нови всяка седмица.</p>
          </div>

          <div className="bb-now-playing">
            <button className="bb-np-icon" aria-label="Audio">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
              </svg>
            </button>
            <div className="bb-np-divider"></div>
            <div className="bb-np-play">
              <span className="bb-play-circle">{PlayIcon}</span>
              @marina_a
            </div>
            <div className="bb-np-divider"></div>
            <div className="bb-np-avatar"></div>
          </div>
        </div>
      </div>

      <div className="bb-stories-wrap">
        <div ref={scrollRef} className="bb-stories-scroll scrollbar-pink">
          <div className="bb-stories-track">
            {TILES.map((t, i) => {
              if (t.kind === 'quote') {
                return (
                  <div key={i} className="bb-st-quote">
                    <div className="bb-qmark">"</div>
                    <div className="bb-st-quote-text">{t.text}</div>
                    <div className="bb-st-quote-source">{t.source}</div>
                  </div>
                );
              }
              return (
                <button
                  key={i}
                  type="button"
                  className={`bb-story-tile bb-st-${t.shape}`}
                  onClick={() => setActiveIdx(i)}
                  aria-label={`Гледай reel · ${t.handle}`}
                >
                  <img src={t.img} alt={t.handle} loading="lazy" />
                  <div className="bb-ig-badge">
                    {IGIcon}
                    REEL
                  </div>
                  <div className="bb-play-overlay">{PlayIcon}</div>
                  <div className="bb-story-center-play">{PlayBigIcon}</div>
                  <div className="bb-story-meta"><div className="bb-st-av"></div>{t.handle}{t.meta ? ` · ${t.meta}` : ''}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bb-container">
        <div className="bb-stories-controls">
          <button className="bb-sc-arrow" onClick={() => scroll(-400)} aria-label="Назад">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <span className="bb-sc-count">10 истории · <span className="accent">@bulgarbiotic</span> на Instagram</span>
          <button className="bb-sc-arrow" onClick={() => scroll(400)} aria-label="Напред">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>
      </div>

      {/* Reel modal */}
      <div
        className={`bb-reel-overlay${activeIdx !== null ? ' open' : ''}`}
        onClick={() => setActiveIdx(null)}
        aria-hidden="true"
      />
      {activeIdx !== null && (
        <>
          <div className="bb-reel-meta">
            <div className="bb-reel-meta-av"></div>
            <span>{activeVideo?.handle ?? '@bulgarbiotic'}</span>
          </div>
          <button
            type="button"
            className="bb-reel-close"
            onClick={() => setActiveIdx(null)}
            aria-label="Затвори"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </>
      )}
      <div className={`bb-reel-modal${activeIdx !== null ? ' open' : ''}`} role="dialog" aria-label="Instagram reel">
        {activeVideo && activeVideo.reelId ? (
          <iframe
            src={`https://www.instagram.com/reel/${activeVideo.reelId}/embed/`}
            allow="autoplay; encrypted-media"
            allowFullScreen
            title={`Reel · ${activeVideo.handle}`}
          />
        ) : activeVideo ? (
          <div className="bb-reel-fallback">
            <img src={activeVideo.img} alt="Reel poster" />
            <div className="bb-reel-scrim"></div>
            <div className="bb-reel-play-big">{PlayBigIcon}</div>
            <div className="bb-reel-text">
              <div className="bb-reel-h">Зареждане на Instagram reel…</div>
              <div className="bb-reel-p">
                Видеото се пуска от @bulgarbiotic директно в Instagram.<br />
                <a href="https://www.instagram.com/bulgarbiotic/" target="_blank" rel="noopener">
                  Гледай в Instagram →
                </a>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <style>{`
        .bb-stories { background: var(--color-cream-1); padding: 110px 0 130px; overflow: hidden; }
        .bb-stories-head {
          display: grid; grid-template-columns: 1fr auto;
          gap: 30px; align-items: end;
          margin-bottom: 50px; padding: 0 36px;
        }
        @media (max-width: 880px) { .bb-stories-head { grid-template-columns: 1fr; gap: 24px; padding: 0 20px; } }

        .bb-stories-h2 {
          font-size: clamp(36px, 5vw, 64px);
          font-weight: 800; line-height: 1.0; letter-spacing: -1.8px;
          color: var(--color-ink); max-width: 660px;
        }
        .bb-stories-h2 .accent { font-family: var(--font-serif); font-style: italic; font-weight: 400; color: var(--color-brand-pink); }
        .bb-stories-lead { font-size: 13px; color: rgba(10,37,64,0.55); margin-top: 12px; max-width: 480px; }

        .bb-now-playing {
          display: inline-flex; align-items: center; gap: 8px;
          background: white;
          border: 1px solid rgba(10, 37, 64, 0.1);
          border-radius: 999px;
          padding: 6px 14px 6px 6px;
          box-shadow: 0 6px 18px -6px rgba(10, 37, 64, 0.15);
        }
        .bb-np-icon {
          width: 32px; height: 32px;
          border-radius: 999px;
          background: var(--color-pink-1);
          color: var(--color-brand-pink);
          display: flex; align-items: center; justify-content: center;
          border: none; cursor: pointer;
          transition: all 0.2s;
        }
        .bb-np-icon:hover { background: var(--color-brand-pink); color: white; }
        .bb-np-icon svg { width: 14px; height: 14px; }
        .bb-np-divider { width: 1px; height: 22px; background: rgba(10, 37, 64, 0.1); }
        .bb-np-play {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 12px; font-weight: 800; color: var(--color-ink);
        }
        .bb-play-circle {
          width: 22px; height: 22px;
          background: var(--color-brand-pink);
          color: white;
          border-radius: 999px;
          display: flex; align-items: center; justify-content: center;
          animation: pulse-glow 2.4s ease infinite;
        }
        .bb-play-circle svg { width: 10px; height: 10px; margin-left: 2px; }
        .bb-np-avatar {
          width: 32px; height: 32px;
          border-radius: 999px;
          background: linear-gradient(135deg, var(--color-pink-2), var(--color-blue-2));
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
        }

        .bb-stories-wrap { position: relative; }
        .bb-stories-wrap::before, .bb-stories-wrap::after {
          content: ""; position: absolute;
          top: 8px; bottom: 32px;
          width: 80px;
          pointer-events: none; z-index: 5;
        }
        .bb-stories-wrap::before { left: 0; background: linear-gradient(90deg, var(--color-cream-1), transparent); }
        .bb-stories-wrap::after { right: 0; background: linear-gradient(-90deg, var(--color-cream-1), transparent); }

        .bb-stories-scroll {
          padding: 8px 0 32px;
          overflow-x: auto; overflow-y: hidden;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
        }
        .bb-stories-track {
          display: flex; gap: 18px;
          padding: 0 calc(50vw - 690px);
          align-items: stretch;
          min-height: 480px;
        }
        @media (max-width: 1450px) { .bb-stories-track { padding: 0 36px; } }
        @media (max-width: 720px) { .bb-stories-track { padding: 0 20px; gap: 14px; min-height: 400px; } }

        .bb-story-tile {
          flex-shrink: 0;
          border-radius: 22px;
          overflow: hidden;
          position: relative;
          cursor: pointer;
          scroll-snap-align: start;
          transition: transform 0.4s ease, box-shadow 0.4s ease;
          background: var(--color-cream-3);
          align-self: center;
          border: none; padding: 0;
          font: inherit; color: inherit;
        }
        .bb-story-tile:hover { transform: translateY(-6px); box-shadow: 0 28px 56px -16px rgba(10, 37, 64, 0.22); }
        .bb-story-tile img { width: 100%; height: 100%; object-fit: cover; transition: transform 6s ease-out; }
        @keyframes ken-burns { 0% { transform: scale(1); } 100% { transform: scale(1.08) translate(-1%, -1%); } }
        .bb-story-tile:hover img { animation: ken-burns 6s ease-out forwards; }

        .bb-st-circle { width: 380px; height: 380px; border-radius: 50%; }
        .bb-st-vertical { width: 270px; height: 460px; }
        .bb-st-square { width: 360px; height: 360px; }
        .bb-st-horizontal { width: 540px; height: 320px; }
        @media (max-width: 720px) {
          .bb-st-circle { width: 300px; height: 300px; }
          .bb-st-vertical { width: 230px; height: 400px; }
          .bb-st-square { width: 280px; height: 280px; }
          .bb-st-horizontal { width: 360px; height: 220px; }
        }

        /* Instagram badge top-left */
        .bb-ig-badge {
          position: absolute;
          top: 14px; left: 14px;
          background: rgba(10, 37, 64, 0.55);
          backdrop-filter: blur(8px);
          color: white;
          padding: 5px 9px 5px 5px;
          border-radius: 999px;
          font-size: 10px; font-weight: 700; letter-spacing: 0.3px;
          display: inline-flex; align-items: center; gap: 5px;
          z-index: 3;
        }
        .bb-ig-badge svg { width: 14px; height: 14px; }

        .bb-play-overlay {
          position: absolute;
          top: 14px; right: 14px;
          width: 38px; height: 38px;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(6px);
          color: var(--color-ink);
          border-radius: 999px;
          display: flex; align-items: center; justify-content: center;
          z-index: 3;
          box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.2);
          transition: transform 0.2s, background 0.2s;
        }
        .bb-story-tile:hover .bb-play-overlay { background: var(--color-brand-pink); color: white; transform: scale(1.12); }
        .bb-play-overlay svg { width: 14px; height: 14px; margin-left: 2px; }

        .bb-story-center-play {
          position: absolute;
          top: 50%; left: 50%;
          width: 64px; height: 64px;
          transform: translate(-50%, -50%) scale(0.8);
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 999px;
          display: flex; align-items: center; justify-content: center;
          color: var(--color-ink);
          opacity: 0;
          transition: opacity 0.3s, transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1.2);
          z-index: 4; pointer-events: none;
          box-shadow: 0 12px 30px -6px rgba(0, 0, 0, 0.3);
        }
        .bb-story-tile:hover .bb-story-center-play { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        .bb-story-center-play svg { width: 22px; height: 22px; margin-left: 3px; }

        .bb-story-meta {
          position: absolute;
          bottom: 16px; left: 16px;
          z-index: 3;
          display: flex; align-items: center; gap: 8px;
          background: rgba(10, 37, 64, 0.55);
          backdrop-filter: blur(8px);
          color: white;
          padding: 5px 12px 5px 5px;
          border-radius: 999px;
          font-size: 11px; font-weight: 700;
        }
        .bb-st-av {
          width: 22px; height: 22px;
          border-radius: 999px;
          background: linear-gradient(135deg, var(--color-pink-2), var(--color-blue-2));
          flex-shrink: 0;
        }

        .bb-st-quote {
          width: 360px; height: 360px;
          background: white;
          border: 1px solid rgba(10, 37, 64, 0.1);
          border-radius: 22px;
          padding: 36px;
          display: flex; flex-direction: column; justify-content: space-between;
          align-self: center; flex-shrink: 0;
          transition: all 0.4s ease;
        }
        .bb-st-quote:hover { transform: translateY(-6px); box-shadow: 0 28px 56px -16px rgba(10, 37, 64, 0.18); border-color: var(--color-pink-2); }
        .bb-qmark { font-family: var(--font-serif); font-size: 80px; line-height: 0.5; color: var(--color-brand-pink); height: 40px; }
        .bb-st-quote-text { font-size: 17px; line-height: 1.45; color: var(--color-ink); font-weight: 600; letter-spacing: -0.3px; flex: 1; display: flex; align-items: center; }
        .bb-st-quote-source { display: flex; align-items: center; gap: 10px; font-size: 12px; font-weight: 800; letter-spacing: 1.6px; text-transform: uppercase; color: var(--color-brand-pink); }
        .bb-st-quote-source::before { content: ""; width: 18px; height: 1.5px; background: var(--color-brand-pink); }

        .bb-stories-controls {
          margin-top: -8px;
          display: flex; align-items: center; justify-content: center;
          gap: 18px; padding: 0 36px;
        }
        .bb-sc-arrow {
          width: 40px; height: 40px;
          border-radius: 999px;
          background: white;
          border: 1px solid rgba(10, 37, 64, 0.1);
          color: var(--color-ink);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .bb-sc-arrow:hover { background: var(--color-ink); color: var(--color-cream-1); }
        .bb-sc-arrow svg { width: 14px; height: 14px; }
        .bb-sc-count { font-size: 13px; font-weight: 700; color: var(--color-ink); letter-spacing: 0.4px; }
        .bb-sc-count .accent { color: var(--color-brand-pink); font-family: var(--font-serif); font-style: italic; }

        /* Reel modal */
        .bb-reel-overlay {
          position: fixed; inset: 0;
          background: rgba(10, 37, 64, 0.9);
          backdrop-filter: blur(12px);
          z-index: 200;
          opacity: 0; visibility: hidden;
          transition: opacity 0.4s, visibility 0.4s;
        }
        .bb-reel-overlay.open { opacity: 1; visibility: visible; }
        .bb-reel-modal {
          position: fixed;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%) scale(0.92);
          z-index: 201;
          width: min(420px, 92vw);
          aspect-ratio: 9/16;
          max-height: 92vh;
          background: black;
          border-radius: 18px;
          overflow: hidden;
          opacity: 0; visibility: hidden;
          transition: opacity 0.4s, visibility 0.4s, transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1.1);
          box-shadow: 0 40px 80px -10px rgba(0, 0, 0, 0.6);
        }
        .bb-reel-modal.open { opacity: 1; visibility: visible; transform: translate(-50%, -50%) scale(1); }
        .bb-reel-modal iframe { width: 100%; height: 100%; border: 0; display: block; }
        .bb-reel-close {
          position: fixed;
          top: 24px; right: 24px;
          width: 44px; height: 44px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
          color: white;
          display: flex; align-items: center; justify-content: center;
          z-index: 202; cursor: pointer;
          transition: all 0.2s;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .bb-reel-close:hover { background: var(--color-brand-pink); border-color: var(--color-brand-pink); }
        .bb-reel-close svg { width: 18px; height: 18px; }
        .bb-reel-meta {
          position: fixed;
          top: 24px; left: 24px;
          z-index: 202;
          display: flex; align-items: center; gap: 10px;
          padding: 8px 16px 8px 8px;
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white;
          border-radius: 999px;
          font-size: 12px; font-weight: 700;
        }
        .bb-reel-meta-av {
          width: 28px; height: 28px;
          border-radius: 999px;
          background: linear-gradient(135deg, var(--color-pink-2), var(--color-blue-2));
        }
        .bb-reel-fallback {
          position: absolute; inset: 0;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          color: white; text-align: center;
        }
        .bb-reel-fallback img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
        .bb-reel-scrim {
          position: absolute; inset: 0;
          background: linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.85));
        }
        .bb-reel-play-big {
          position: relative; z-index: 2;
          width: 80px; height: 80px;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 999px;
          display: flex; align-items: center; justify-content: center;
          color: var(--color-ink);
          margin-bottom: 16px;
          animation: pulse-glow 2.4s ease infinite;
        }
        .bb-reel-play-big svg { width: 28px; height: 28px; margin-left: 4px; }
        .bb-reel-text {
          position: absolute; bottom: 30px; left: 24px; right: 24px;
          color: white; z-index: 2;
        }
        .bb-reel-h { font-size: 16px; font-weight: 800; margin-bottom: 6px; }
        .bb-reel-p { font-size: 12px; opacity: 0.85; line-height: 1.5; }
        .bb-reel-p a { color: var(--color-pink-3); text-decoration: underline; font-weight: 700; margin-top: 8px; display: inline-block; }
      `}</style>
    </section>
  );
}
