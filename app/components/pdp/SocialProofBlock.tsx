/**
 * "Над 260 000 поръчки" big-number social proof block.
 *
 * Direct adaptation of NL Beauty's "Над 2,000,000 продадени бройки" pattern.
 * Uses REAL Bactology data:
 *   • 260 054 поръчки           (analytics box: total-orders)
 *   • 110 404 уникални клиента  (sum of new customers 2021-2026)
 *   • 117 943 newsletter абонати (subscribers count)
 *   • 3 303 ревюта · 4.9★       (productReviews + computed weighted avg)
 *   • от 2019 г.                 (founding date per CLAUDE.md)
 *
 * Designed to sit late in the PDP scroll — final "yeah, lots of others trust
 * this, so I can too" push before the customer reviews section.
 */
export function SocialProofBlock() {
  return (
    <section className="bb-proof" aria-labelledby="bb-proof-title">
      <div className="bb-proof-inner">
        <div className="bb-proof-tag">Доверието на България</div>
        <h2 id="bb-proof-title" className="bb-proof-title">
          Над <span className="bb-proof-big">260 000</span>
          <br />поръчки от <em>110 000+ семейства</em>
        </h2>
        <p className="bb-proof-sub">
          От 2019 г. насам Bactology е ежедневен избор за хиляди български домове -
          и доверието продължава да расте.
        </p>

        <div className="bb-proof-stats">
          <div className="bb-proof-stat">
            <div className="bb-proof-stat-num">110K+</div>
            <div className="bb-proof-stat-label">Уникални клиенти</div>
          </div>
          <div className="bb-proof-stat">
            <div className="bb-proof-stat-num">117K+</div>
            <div className="bb-proof-stat-label">Записани в общността</div>
          </div>
          <div className="bb-proof-stat">
            <div className="bb-proof-stat-num">3 303</div>
            <div className="bb-proof-stat-label">Проверени отзива · 4.9★</div>
          </div>
          <div className="bb-proof-stat">
            <div className="bb-proof-stat-num">7+ г.</div>
            <div className="bb-proof-stat-label">На пазара от 2019</div>
          </div>
        </div>
      </div>

      <style>{`
        .bb-proof {
          margin: 56px 0;
          padding: 64px 40px;
          background: linear-gradient(135deg, #0a2540 0%, #112c4d 100%);
          color: white;
          border-radius: 28px;
          position: relative;
          overflow: hidden;
        }
        @media (max-width: 720px) {
          .bb-proof { padding: 44px 26px; border-radius: 20px; margin: 40px 0; }
        }
        .bb-proof::before {
          content: ""; position: absolute;
          top: -120px; right: -100px;
          width: 360px; height: 360px;
          background: radial-gradient(circle, rgba(227, 22, 108, 0.22), transparent 70%);
          pointer-events: none;
        }
        .bb-proof::after {
          content: ""; position: absolute;
          bottom: -100px; left: -100px;
          width: 320px; height: 320px;
          background: radial-gradient(circle, rgba(244, 213, 133, 0.16), transparent 70%);
          pointer-events: none;
        }
        .bb-proof-inner {
          position: relative;
          z-index: 1;
          max-width: 860px;
          margin: 0 auto;
          text-align: center;
        }
        .bb-proof-tag {
          display: inline-block;
          font-size: 11px; font-weight: 800;
          letter-spacing: 1.4px;
          text-transform: uppercase;
          color: #f4d585;
          padding: 5px 12px;
          background: rgba(244, 213, 133, 0.14);
          border: 1px solid rgba(244, 213, 133, 0.32);
          border-radius: 999px;
          margin-bottom: 16px;
        }
        .bb-proof-title {
          font-size: clamp(28px, 4.4vw, 44px);
          font-weight: 800;
          letter-spacing: -1.2px;
          line-height: 1.1;
          margin: 0 0 18px;
          color: white;
        }
        .bb-proof-big {
          font-family: var(--font-serif);
          font-style: italic;
          font-weight: 500;
          color: #f4d585;
          letter-spacing: -2px;
          font-size: 1.2em;
        }
        .bb-proof-title em {
          font-family: var(--font-serif);
          font-style: italic;
          font-weight: 400;
          color: #f4d585;
        }
        .bb-proof-sub {
          font-size: 15px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.78);
          max-width: 580px;
          margin: 0 auto 36px;
        }

        .bb-proof-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }
        @media (max-width: 720px) {
          .bb-proof-stats { grid-template-columns: 1fr 1fr; gap: 10px; }
        }
        .bb-proof-stat {
          padding: 18px 14px;
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 14px;
          transition: all 0.22s;
        }
        .bb-proof-stat:hover {
          background: rgba(255, 255, 255, 0.14);
          border-color: rgba(244, 213, 133, 0.4);
          transform: translateY(-2px);
        }
        .bb-proof-stat-num {
          font-family: var(--font-serif);
          font-style: italic;
          font-weight: 500;
          font-size: clamp(24px, 3.4vw, 32px);
          color: #f4d585;
          letter-spacing: -1px;
          line-height: 1;
          margin-bottom: 6px;
        }
        .bb-proof-stat-label {
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.3px;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.35;
        }
      `}</style>
    </section>
  );
}
