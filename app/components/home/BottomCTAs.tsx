import {Link} from 'react-router';

export function BottomCTAs() {
  return (
    <section className="bb-ctas">
      <div className="bb-container bb-ctas-row reveal">
        <Link to="/page/naukata-zad-bulgar-biotic" className="bb-cta-block bb-cta-labs">
          <img src="/images/generated-v2/cta-labs.png" alt="Bactology Лаборатория" />
          <div className="bb-cta-content">
            <span className="bb-cta-tag">BACTOLOGY · Лаборатория</span>
            <h3>Науката зад<br /><span className="accent">Bactology.</span></h3>
            <p>Български щамове, тествани в нашата лаборатория с проверена преживяемост в стомашна среда.</p>
            <span className="bb-cta-btn">Прочети повече <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg></span>
          </div>
        </Link>
        <Link to="/#bb-finder" className="bb-cta-block bb-cta-quiz">
          <img src="/images/generated-v2/cta-quiz.png" alt="Quiz" />
          <div className="bb-cta-content">
            <span className="bb-cta-tag">3 МИНУТИ · ПЕРСОНАЛИЗАЦИЯ</span>
            <h3>Започни с правилния<br /><span className="accent">пробиотик за теб.</span></h3>
            <p>Кратко quiz: 3 въпроса → препоръка от каталога → персонализиран месечен план.</p>
            <span className="bb-cta-btn">Започни quiz <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg></span>
          </div>
        </Link>
      </div>

      <style>{`
        .bb-ctas { background: var(--color-cream-1); padding: 30px 0 120px; }
        .bb-ctas-row {
          display: grid; grid-template-columns: 1fr 1fr; gap: 18px;
          padding: 0 36px;
        }
        @media (max-width: 880px) { .bb-ctas-row { grid-template-columns: 1fr; padding: 0 16px; gap: 14px; } }
        .bb-cta-block {
          border-radius: 26px; overflow: hidden;
          position: relative; aspect-ratio: 16/10;
          cursor: pointer; transition: transform 0.4s ease;
          color: white; display: block;
        }
        .bb-cta-block:hover { transform: translateY(-6px); }
        .bb-cta-block img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: transform 0.7s ease; }
        .bb-cta-block:hover img { transform: scale(1.05); }
        .bb-cta-content {
          position: absolute; inset: 0; padding: 50px;
          display: flex; flex-direction: column; justify-content: flex-end;
          color: white;
          background: linear-gradient(180deg, transparent 30%, rgba(10, 37, 64, 0.85) 100%);
        }
        .bb-cta-tag {
          display: inline-block;
          background: rgba(255, 255, 255, 0.18); backdrop-filter: blur(8px);
          padding: 5px 12px; border-radius: 999px;
          font-size: 11px; letter-spacing: 1.6px; font-weight: 800;
          margin-bottom: 16px; width: max-content;
        }
        .bb-cta-content h3 {
          font-size: 32px; font-weight: 800; line-height: 1.04;
          letter-spacing: -1px; margin-bottom: 16px;
        }
        .bb-cta-content h3 .accent { font-family: var(--font-serif); font-style: italic; font-weight: 400; color: var(--color-pink-3); }
        .bb-cta-content p { font-size: 13px; opacity: 0.85; margin-bottom: 22px; max-width: 380px; line-height: 1.6; }
        .bb-cta-btn {
          background: var(--color-cream-1); color: var(--color-ink);
          padding: 13px 24px; border-radius: 999px;
          font-size: 13px; font-weight: 800;
          display: inline-flex; align-items: center; gap: 8px;
          width: max-content; transition: all 0.2s;
        }
        .bb-cta-btn:hover { background: var(--color-brand-pink); color: white; }
        .bb-cta-btn svg { width: 13px; height: 13px; transition: transform 0.3s; }
        .bb-cta-btn:hover svg { transform: translateX(3px); }

        /* Mobile rebuild: the 16:10 card was too short to fit headline + lede
         * + CTA without the text crushing against the top edge of the image.
         * On phones we make each card a portrait 4:5 frame, give a much
         * stronger full-frame gradient so every word reads, and shrink the
         * text scale to match the narrower column. */
        @media (max-width: 720px) {
          .bb-cta-block { aspect-ratio: 4/5; border-radius: 20px; }
          .bb-cta-content {
            padding: 22px 22px 24px;
            background: linear-gradient(180deg,
              rgba(10, 37, 64, 0.35) 0%,
              rgba(10, 37, 64, 0.05) 35%,
              rgba(10, 37, 64, 0.45) 60%,
              rgba(10, 37, 64, 0.92) 100%);
            justify-content: space-between;
          }
          .bb-cta-tag { font-size: 10px; padding: 4px 10px; margin-bottom: 0; align-self: flex-start; letter-spacing: 1.2px; }
          .bb-cta-content > h3 { margin-top: auto; }
          .bb-cta-content h3 { font-size: 26px; letter-spacing: -0.6px; margin-bottom: 10px; }
          .bb-cta-content p { font-size: 13px; opacity: 1; color: rgba(255,255,255,0.92); margin-bottom: 16px; line-height: 1.5; max-width: none; }
          .bb-cta-btn { padding: 11px 20px; font-size: 12.5px; }
        }
      `}</style>
    </section>
  );
}
