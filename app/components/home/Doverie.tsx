export function Doverie() {
  return (
    <section className="bb-doverie reveal">
      <div className="bb-container bb-doverie-inner">
        <div className="bb-doverie-stat">110K<span className="bb-small">+</span></div>
        <div className="bb-doverie-text">
          <h3>Доверието на 110 000+ български семейства от 2019 г.</h3>
          <p>От Bactology Femin до Babies &amp; Kids — нашите продукти са в ежедневието на хиляди домове, защото работят. Не обещания. Резултати.</p>
          <div className="bb-doverie-pills">
            <span className="bb-doverie-pill"><span className="bb-doverie-dot"></span>117 000+ читатели на бюлетина</span>
            <span className="bb-doverie-pill"><span className="bb-doverie-dot"></span>4.9★ от 3 303 ревюта</span>
          </div>
        </div>
      </div>

      <style>{`
        .bb-doverie {
          background: linear-gradient(135deg, var(--color-pink-1), var(--color-blue-1));
          padding: 90px 0;
        }
        .bb-doverie-inner { display: grid; grid-template-columns: auto 1fr; gap: 50px; align-items: center; padding: 0 36px; }
        @media (max-width: 880px) { .bb-doverie-inner { grid-template-columns: 1fr; gap: 24px; padding: 0 20px; } }
        .bb-doverie-stat {
          font-size: clamp(70px, 12vw, 160px);
          font-weight: 500;
          font-style: italic;
          line-height: 0.9;
          letter-spacing: -4px;
          color: var(--color-brand-pink);
          font-family: var(--font-serif);
        }
        .bb-doverie-stat .bb-small { font-size: 0.4em; vertical-align: super; opacity: 0.7; }
        .bb-doverie-text h3 {
          font-size: clamp(22px, 3vw, 32px);
          font-weight: 700; line-height: 1.2;
          color: var(--color-ink);
          margin-bottom: 14px;
          letter-spacing: -0.6px;
        }
        .bb-doverie-text p {
          font-size: 15px; color: rgba(10, 37, 64, 0.78);
          line-height: 1.7; max-width: 520px;
          margin-bottom: 18px;
        }
        .bb-doverie-pills { display: flex; gap: 8px; flex-wrap: wrap; }
        .bb-doverie-pill {
          background: white; padding: 7px 14px;
          border-radius: 999px; font-size: 12px; font-weight: 700;
          color: var(--color-ink);
        }
        .bb-doverie-dot { display: inline-block; width: 6px; height: 6px; background: var(--color-brand-pink); border-radius: 50%; margin-right: 6px; vertical-align: middle; }
      `}</style>
    </section>
  );
}
