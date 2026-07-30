import {Link} from 'react-router';

// Real CloudCart CDN product images — same as legacy site
const HAIR_NAILS_IMG = 'https://cdncloudcart.com/26377/files/image/product-1-644a552789c0f.png';
const SKIN_IMG = 'https://cdncloudcart.com/26377/files/image/product-2-644a553b4c2fe.jpg';
// UGC lifestyle shots from our own /public folder
const UGC_BATHROOM = '/images/ugc-stills/ugc-1-femin-bathroom.png';
const UGC_SHELF = '/images/ugc-stills/ugc-4-shelf-flat.png';
const UGC_PEARLS_CAFE = '/images/ugc-stills/ugc-6-pearls-cafe.png';

/**
 * /page/kosa-koja-i-nokti — Beauty landing page.
 *
 * Premium editorial-magazine layout (think Glossier / Net-a-Porter / Selfridges).
 * Hero "manifesto" → 3-step beauty ritual → asymmetric product showcase →
 * results timeline → ingredients table → bento UGC grid → final CTA.
 *
 * All real product photos come from the CloudCart CDN — brand recognition
 * preserved between legacy site and redesign.
 */
export function BeautyPageContent() {
  return (
    <>
      {/* ─── EDITORIAL HERO MANIFESTO ─── */}
      <section className="bb-bty-manifesto not-prose">
        <div className="bb-bty-manifesto-inner">
          <span className="bb-bty-eyebrow">Bactology Beauty Series</span>
          <h2 className="bb-bty-manifesto-h">
            Истинската красота<br />
            се случва <em>отвътре.</em>
          </h2>
          <p className="bb-bty-manifesto-p">
            Не на повърхността. Не във флакончето с крем. А в баланса на
            микроелементи, които всеки ден захранват кожата, косата и
            ноктите ти — клетка по клетка.
          </p>
          <div className="bb-bty-manifesto-stats">
            <div>
              <strong>2</strong>
              <span>прицелни формули</span>
            </div>
            <div>
              <strong>11+</strong>
              <span>активни съставки</span>
            </div>
            <div>
              <strong>30 дни</strong>
              <span>за първи видим ефект</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3-STEP BEAUTY RITUAL ─── */}
      <section className="bb-bty-ritual not-prose">
        <div className="bb-bty-section-head">
          <span className="bb-bty-tag">Ритуал</span>
          <h2 className="bb-bty-h2">Твоят 30-секунден beauty ritual</h2>
          <p className="bb-bty-section-sub">
            Сутрин, с първата чаша вода. Не повече усилие от това.
          </p>
        </div>
        <div className="bb-bty-ritual-grid">
          {[
            {n: '01', h: 'Събуди се', p: 'Преди кафето — една капсула с глътка вода активира абсорбцията през деня.'},
            {n: '02', h: 'Хапни нещо', p: 'Малка закуска осигурява buffer-а, който позволява микроелементите да се усвоят оптимално.'},
            {n: '03', h: 'Чакай 30 дни', p: 'Ноктите растат първи. Косата — след 4-6 седмици. Кожата — след 6-8 седмици.'},
          ].map((s) => (
            <div key={s.n} className="bb-bty-ritual-card">
              <span className="bb-bty-ritual-n">{s.n}</span>
              <h3>{s.h}</h3>
              <p>{s.p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── PRODUCT 1: HAIR & NAILS — left image / right content ─── */}
      <article className="bb-bty-product bb-bty-product--reverse not-prose">
        <div className="bb-bty-product-visual">
          <div className="bb-bty-product-stage">
            <span className="bb-bty-product-ribbon">Beauty Series · 01</span>
            <img src={HAIR_NAILS_IMG} alt="Bactology за здрава коса и нокти" loading="lazy" />
          </div>
          <div className="bb-bty-product-stickers">
            <span className="bb-bty-sticker">Биотин</span>
            <span className="bb-bty-sticker">Желязо</span>
            <span className="bb-bty-sticker">Силиций</span>
          </div>
        </div>
        <div className="bb-bty-product-text">
          <span className="bb-bty-product-overline">За косата · ноктите · епидермиса</span>
          <h2 className="bb-bty-product-h">
            Здрава и <em>блестяща</em><br />коса. Силни нокти.
          </h2>
          <p className="bb-bty-product-lead">
            Комплексът от витамини и микроелементи стимулира клетките на
            епидермиса и съдейства за подобряване на външния вид на косата,
            ноктите и кожата.
          </p>

          <div className="bb-bty-ing-section">
            <div className="bb-bty-ing-label">Активни съставки · 5</div>
            <ul className="bb-bty-ing-list">
              <li><span className="bb-bty-ing-dot" /> <strong>Биотин</strong> — стимулира растежа и здравината</li>
              <li><span className="bb-bty-ing-dot" /> <strong>Витамини A, C, E, D3 + B-комплекс</strong></li>
              <li><span className="bb-bty-ing-dot" /> <strong>Желязо</strong> — за здрав корен и пълнота</li>
              <li><span className="bb-bty-ing-dot" /> <strong>Силиций</strong> — против цепещи се нокти</li>
            </ul>
          </div>

          <div className="bb-bty-action-grid">
            <div className="bb-bty-action-tile bb-bty-action-tile--prevent">
              <span className="bb-bty-action-label">Профилактика</span>
              <p>Укрепване и подхранване. Предотвратяване на косопад.</p>
            </div>
            <div className="bb-bty-action-tile bb-bty-action-tile--treat">
              <span className="bb-bty-action-label">Лечение</span>
              <p>Загубена еластичност, чупливи нокти, активен косопад.</p>
            </div>
          </div>

          <Link
            to="/product/aktivna-formula-za-zdrava-i-blestyashta-kosa-i-nokti-bactology"
            className="bb-bty-cta"
            prefetch="intent"
          >
            <span className="bb-bty-cta-text">
              <strong>Купи Hair &amp; Nails</strong>
              <span>1 капсула на ден · 30 дни</span>
            </span>
            <span className="bb-bty-cta-arrow">→</span>
          </Link>
        </div>
      </article>

      {/* ─── EDITORIAL QUOTE DIVIDER ─── */}
      <aside className="bb-bty-quote not-prose">
        <span className="bb-bty-quote-mark">"</span>
        <blockquote>
          Когато коренът е здрав, растежът се случва от само себе си.<br />
          <em>Това важи и за косата. Важи и за кожата.</em>
        </blockquote>
        <span className="bb-bty-quote-attribution">— философията на Bactology Beauty</span>
      </aside>

      {/* ─── PRODUCT 2: SKIN — right image / left content ─── */}
      <article className="bb-bty-product not-prose">
        <div className="bb-bty-product-text">
          <span className="bb-bty-product-overline">За кожата · колаген · еластичност</span>
          <h2 className="bb-bty-product-h">
            Сияйна, еластична,<br /><em>без бръчки.</em>
          </h2>
          <p className="bb-bty-product-lead">
            Bactology съчетава синергичното действие на колаген, хиалуронова
            киселина и коензим Q10 — съставки, които стимулират собственото
            производство на колаген в дермата.
          </p>

          <div className="bb-bty-ing-section">
            <div className="bb-bty-ing-label">Активни съставки · 6</div>
            <ul className="bb-bty-ing-list">
              <li><span className="bb-bty-ing-dot" /> <strong>Колаген</strong> — структурата на кожата</li>
              <li><span className="bb-bty-ing-dot" /> <strong>Хиалуронова киселина</strong> — хидратация отвътре</li>
              <li><span className="bb-bty-ing-dot" /> <strong>Коензим Q10</strong> — против стареене</li>
              <li><span className="bb-bty-ing-dot" /> <strong>Витамини A, C, E, D</strong> + <strong>Биотин</strong></li>
            </ul>
          </div>

          <div className="bb-bty-action-grid">
            <div className="bb-bty-action-tile bb-bty-action-tile--prevent">
              <span className="bb-bty-action-label">Профилактика</span>
              <p>Младежки вид. Поддържане на еластичност. Без целулит и стрии.</p>
            </div>
            <div className="bb-bty-action-tile bb-bty-action-tile--treat">
              <span className="bb-bty-action-label">Лечение</span>
              <p>Раздразнения, кожни проблеми, забавено възстановяване.</p>
            </div>
          </div>

          <Link
            to="/product/aktivna-formula-za-siyayna-i-elastichna-koja-bez-brachki-bactology"
            className="bb-bty-cta"
            prefetch="intent"
          >
            <span className="bb-bty-cta-text">
              <strong>Купи Skin Formula</strong>
              <span>1 капсула на ден · 30 дни</span>
            </span>
            <span className="bb-bty-cta-arrow">→</span>
          </Link>
        </div>
        <div className="bb-bty-product-visual">
          <div className="bb-bty-product-stage">
            <span className="bb-bty-product-ribbon">Beauty Series · 02</span>
            <img src={SKIN_IMG} alt="Bactology за сияйна кожа без бръчки" loading="lazy" />
          </div>
          <div className="bb-bty-product-stickers">
            <span className="bb-bty-sticker">Колаген</span>
            <span className="bb-bty-sticker">Хиалуронова киселина</span>
            <span className="bb-bty-sticker">Q10</span>
          </div>
        </div>
      </article>

      {/* ─── RESULTS TIMELINE ─── */}
      <section className="bb-bty-timeline not-prose">
        <div className="bb-bty-section-head bb-bty-section-head--dark">
          <span className="bb-bty-tag bb-bty-tag--gold">Времева линия</span>
          <h2 className="bb-bty-h2">Кога ще видиш разликата?</h2>
          <p className="bb-bty-section-sub bb-bty-section-sub--light">
            Бавно и устойчиво — никога драматично за един ден.
            Истинската красота е процес.
          </p>
        </div>
        <div className="bb-bty-timeline-rail">
          <div className="bb-bty-timeline-line" aria-hidden="true" />
          {[
            {when: 'Седмица 1-2', what: 'Ноктите спират да се чупят. Усещаш разлика в текстурата.', hl: 'НОКТИ'},
            {when: 'Седмица 3-4', what: 'Косата изглежда по-плътна. По-малко падане при сресване.', hl: 'КОСАТА'},
            {when: 'Месец 2', what: 'Кожата става по-хидратирана. Линиите изглеждат по-меки.', hl: 'КОЖАТА'},
            {when: 'Месец 3', what: 'Пълна трансформация — устойчиви резултати при редовен прием.', hl: 'УСТОЙЧИВО'},
          ].map((t, i) => (
            <div key={i} className="bb-bty-timeline-item">
              <span className="bb-bty-timeline-dot" />
              <span className="bb-bty-timeline-when">{t.when}</span>
              <span className="bb-bty-timeline-hl">{t.hl}</span>
              <p className="bb-bty-timeline-what">{t.what}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── COMPARISON TABLE ─── */}
      <section className="bb-bty-compare not-prose">
        <div className="bb-bty-section-head">
          <span className="bb-bty-tag">Кой за какво</span>
          <h2 className="bb-bty-h2">Не си сигурна коя ти трябва?</h2>
          <p className="bb-bty-section-sub">
            Двете формули са създадени да работят заедно — но всяка решава
            конкретен проблем най-добре.
          </p>
        </div>

        <div className="bb-bty-cmp-grid">
          <div className="bb-bty-cmp-row bb-bty-cmp-row--head">
            <div className="bb-bty-cmp-feat">&nbsp;</div>
            <div className="bb-bty-cmp-prod bb-bty-cmp-prod--pink">
              <span className="bb-bty-cmp-prod-num">01</span>
              <strong>Hair &amp; Nails</strong>
              <span className="bb-bty-cmp-prod-sub">Beauty Series</span>
            </div>
            <div className="bb-bty-cmp-prod bb-bty-cmp-prod--blue">
              <span className="bb-bty-cmp-prod-num">02</span>
              <strong>Skin Formula</strong>
              <span className="bb-bty-cmp-prod-sub">Beauty Series</span>
            </div>
          </div>

          {[
            ['Косопад', '✓', '—'],
            ['Чупливи нокти', '✓', '—'],
            ['Сухота на скалпа', '✓', '—'],
            ['Бръчки и фини линии', '—', '✓'],
            ['Загуба на еластичност', '—', '✓'],
            ['Кожни раздразнения', '—', '✓'],
            ['Биотин', '✓', '✓'],
            ['Колаген + хиалурон', '—', '✓'],
            ['Желязо + силиций', '✓', '—'],
            ['Коензим Q10', '—', '✓'],
            ['1 капсула дневно', '✓', '✓'],
          ].map(([label, a, b], i) => (
            <div key={i} className="bb-bty-cmp-row">
              <div className="bb-bty-cmp-feat">{label}</div>
              <CmpCell value={a} />
              <CmpCell value={b} />
            </div>
          ))}
        </div>

        <p className="bb-bty-cmp-tip">
          💡 <strong>Препоръка:</strong> За най-добри резултати — комбинирай и
          двете. Прием: <em>Hair &amp; Nails сутрин, Skin Formula вечер.</em>
        </p>
      </section>

      {/* ─── BENTO UGC GRID — "Истински жени, истински резултати" ─── */}
      <section className="bb-bty-ugc not-prose">
        <div className="bb-bty-section-head">
          <span className="bb-bty-tag">Истински жени</span>
          <h2 className="bb-bty-h2">Българки, които вече знаят</h2>
          <p className="bb-bty-section-sub">
            Какво казват клиентките ни — със собствените им думи.
          </p>
        </div>

        <div className="bb-bty-bento">
          <figure className="bb-bty-bento-card bb-bty-bento-card--lg" style={{backgroundImage: `url(${UGC_BATHROOM})`}}>
            <figcaption>
              <span className="bb-bty-bento-tag">Hair &amp; Nails</span>
              <blockquote>"Косата ми спря да пада за 3 седмици. Никога преди не съм имала такъв ефект от хранителна добавка."</blockquote>
              <span className="bb-bty-bento-name">— Елена П.</span>
            </figcaption>
          </figure>

          <figure className="bb-bty-bento-card bb-bty-bento-card--md" style={{backgroundImage: `url(${UGC_PEARLS_CAFE})`}}>
            <figcaption>
              <span className="bb-bty-bento-tag">Skin Formula</span>
              <blockquote>"Кожата ми се промени драматично. Линиите под очите се изгладиха."</blockquote>
              <span className="bb-bty-bento-name">— Стоянка К.</span>
            </figcaption>
          </figure>

          <figure className="bb-bty-bento-card bb-bty-bento-card--sm bb-bty-bento-card--stat">
            <figcaption>
              <strong>94%</strong>
              <span>усещат разлика<br />до 30 дни</span>
            </figcaption>
          </figure>

          <figure className="bb-bty-bento-card bb-bty-bento-card--sm" style={{backgroundImage: `url(${UGC_SHELF})`}}>
            <figcaption>
              <span className="bb-bty-bento-name">Yelena S.</span>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ─── FINAL EDITORIAL CTA ─── */}
      <section className="bb-bty-finale not-prose">
        <div className="bb-bty-finale-inner">
          <span className="bb-bty-eyebrow bb-bty-eyebrow--light">Готова да започнеш?</span>
          <h2 className="bb-bty-finale-h">
            Една капсула на ден.<br />
            <em>Тридесет дни до първата разлика.</em>
          </h2>
          <p className="bb-bty-finale-p">
            Високо качествени активни формули за коса, кожа и нокти —
            произведени в България, с фармацевтичен стандарт.
          </p>
          <div className="bb-bty-finale-actions">
            <Link to="/category/all-products?tag=beauty" className="bb-bty-cta bb-bty-cta--gold" prefetch="intent">
              <span className="bb-bty-cta-text">
                <strong>Виж цялата Beauty серия</strong>
              </span>
              <span className="bb-bty-cta-arrow">→</span>
            </Link>
            <Link to="/selection/sale" className="bb-bty-cta bb-bty-cta--ghost" prefetch="intent">
              Активни промоции
            </Link>
          </div>
        </div>
      </section>

      <style>{`
        /* Force the prose wrapper out of the way — every section is "not-prose" */
        .bb-page-content { max-width: 100%; }

        /* ──────────────── EDITORIAL HERO MANIFESTO ──────────────── */
        .bb-bty-manifesto {
          margin: 0 0 80px;
          padding: 80px 24px;
          background: linear-gradient(135deg, var(--color-cream-2) 0%, var(--color-pink-1) 100%);
          border-radius: 28px;
          position: relative;
          overflow: hidden;
        }
        @media (max-width: 720px) { .bb-bty-manifesto { padding: 56px 22px; margin-bottom: 56px; } }
        .bb-bty-manifesto::before {
          content: ""; position: absolute;
          top: -120px; right: -100px;
          width: 380px; height: 380px;
          background: radial-gradient(circle, rgba(227, 22, 108, 0.18), transparent 70%);
          pointer-events: none;
        }
        .bb-bty-manifesto-inner {
          position: relative; z-index: 1;
          max-width: 820px;
          margin: 0 auto;
          text-align: center;
        }
        .bb-bty-eyebrow {
          display: inline-block;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 2.4px;
          text-transform: uppercase;
          color: var(--color-brand-pink);
          margin-bottom: 18px;
        }
        .bb-bty-eyebrow--light { color: #f4d585; }
        .bb-bty-manifesto-h {
          font-family: var(--font-serif);
          font-weight: 400;
          font-size: clamp(36px, 6vw, 64px);
          line-height: 1;
          letter-spacing: -1.8px;
          color: var(--color-ink);
          margin: 0 0 24px;
        }
        .bb-bty-manifesto-h em {
          font-style: italic;
          color: var(--color-brand-pink);
        }
        .bb-bty-manifesto-p {
          font-size: clamp(16px, 1.8vw, 19px);
          line-height: 1.65;
          color: rgba(10, 37, 64, 0.78);
          max-width: 620px;
          margin: 0 auto 36px;
        }
        .bb-bty-manifesto-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          max-width: 620px;
          margin: 0 auto;
          padding-top: 32px;
          border-top: 1px solid rgba(10, 37, 64, 0.12);
        }
        @media (max-width: 540px) { .bb-bty-manifesto-stats { grid-template-columns: 1fr; gap: 8px; } }
        .bb-bty-manifesto-stats > div {
          display: flex; flex-direction: column;
        }
        .bb-bty-manifesto-stats strong {
          font-family: var(--font-serif);
          font-style: italic;
          font-weight: 500;
          font-size: clamp(32px, 4.4vw, 44px);
          letter-spacing: -1.4px;
          line-height: 1;
          color: var(--color-brand-pink);
        }
        .bb-bty-manifesto-stats span {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.4px;
          color: rgba(10, 37, 64, 0.55);
          margin-top: 6px;
        }

        /* ──────────────── COMMON: section heads ──────────────── */
        .bb-bty-section-head {
          text-align: center;
          margin-bottom: 36px;
        }
        .bb-bty-section-head--dark { color: white; }
        .bb-bty-tag {
          display: inline-block;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.4px;
          text-transform: uppercase;
          color: var(--color-brand-pink);
          padding: 5px 12px;
          background: var(--color-pink-1);
          border-radius: 999px;
          margin-bottom: 14px;
        }
        .bb-bty-tag--gold {
          background: rgba(244, 213, 133, 0.16);
          color: #f4d585;
          border: 1px solid rgba(244, 213, 133, 0.3);
        }
        .bb-bty-h2 {
          font-family: var(--font-serif);
          font-weight: 400;
          font-size: clamp(28px, 3.8vw, 42px);
          line-height: 1.05;
          letter-spacing: -1.2px;
          margin: 0 0 12px;
        }
        .bb-bty-h2 em { font-style: italic; color: var(--color-brand-pink); }
        .bb-bty-section-sub {
          font-size: 15px;
          line-height: 1.65;
          color: rgba(10, 37, 64, 0.7);
          max-width: 540px;
          margin: 0 auto;
        }
        .bb-bty-section-sub--light { color: rgba(255, 255, 255, 0.72); }

        /* ──────────────── 3-STEP BEAUTY RITUAL ──────────────── */
        .bb-bty-ritual { margin: 0 0 80px; }
        @media (max-width: 720px) { .bb-bty-ritual { margin-bottom: 60px; } }
        .bb-bty-ritual-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        @media (max-width: 720px) { .bb-bty-ritual-grid { grid-template-columns: 1fr; } }
        .bb-bty-ritual-card {
          padding: 36px 28px;
          background: white;
          border: 1px solid rgba(10, 37, 64, 0.08);
          border-radius: 20px;
          transition: all 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .bb-bty-ritual-card:hover {
          transform: translateY(-4px);
          border-color: var(--color-brand-pink);
          box-shadow: 0 20px 40px -16px rgba(227, 22, 108, 0.2);
        }
        .bb-bty-ritual-n {
          font-family: var(--font-serif);
          font-style: italic;
          font-weight: 500;
          font-size: 56px;
          line-height: 1;
          color: var(--color-pink-2);
          letter-spacing: -2px;
        }
        .bb-bty-ritual-card h3 {
          font-size: 19px;
          font-weight: 800;
          color: var(--color-ink);
          margin: 14px 0 10px;
          letter-spacing: -0.3px;
        }
        .bb-bty-ritual-card p {
          font-size: 13.5px;
          line-height: 1.65;
          color: rgba(10, 37, 64, 0.7);
          margin: 0;
        }

        /* ──────────────── PRODUCT SHOWCASE (asymmetric) ──────────────── */
        .bb-bty-product {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 80px;
          align-items: center;
          margin: 0 0 80px;
        }
        @media (max-width: 880px) {
          .bb-bty-product { grid-template-columns: 1fr; gap: 40px; margin-bottom: 60px; }
          .bb-bty-product--reverse .bb-bty-product-visual { order: 1; }
          .bb-bty-product--reverse .bb-bty-product-text { order: 2; }
        }
        .bb-bty-product-visual {
          position: relative;
          aspect-ratio: 4 / 5;
        }
        .bb-bty-product-stage {
          width: 100%; height: 100%;
          border-radius: 28px;
          overflow: hidden;
          background: linear-gradient(135deg, var(--color-pink-1) 0%, var(--color-cream-2) 100%);
          padding: 32px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 40px 70px -20px rgba(10, 37, 64, 0.25);
          position: relative;
          transform: rotate(-2deg);
          transition: transform 0.5s ease;
        }
        .bb-bty-product--reverse .bb-bty-product-stage { transform: rotate(2deg); }
        .bb-bty-product-stage:hover { transform: rotate(0) scale(1.02); }
        .bb-bty-product-stage img {
          max-width: 100%; max-height: 100%;
          object-fit: contain;
        }
        .bb-bty-product-ribbon {
          position: absolute;
          top: 24px; left: 24px;
          padding: 6px 14px;
          background: white;
          color: var(--color-brand-pink);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          border-radius: 999px;
          box-shadow: 0 8px 18px -4px rgba(10, 37, 64, 0.2);
        }
        .bb-bty-product-stickers {
          position: absolute;
          bottom: -20px; right: -16px;
          display: flex;
          flex-wrap: nowrap;
          gap: 6px;
          white-space: nowrap;
          justify-content: flex-end;
        }
        .bb-bty-product--reverse .bb-bty-product-stickers { right: auto; left: -16px; justify-content: flex-start; }
        /* Very small screens: tighten sticker padding so all 3 still fit on one line */
        @media (max-width: 420px) {
          .bb-bty-sticker { padding: 5px 10px; font-size: 11.5px; }
          .bb-bty-product-stickers { gap: 4px; }
        }
        .bb-bty-sticker {
          padding: 6px 12px;
          background: white;
          border: 1px solid rgba(10, 37, 64, 0.1);
          border-radius: 999px;
          font-family: var(--font-serif);
          font-style: italic;
          font-weight: 500;
          font-size: 13px;
          color: var(--color-ink);
          letter-spacing: -0.1px;
          box-shadow: 0 6px 14px -4px rgba(10, 37, 64, 0.12);
        }

        .bb-bty-product-text { padding: 0 8px; }
        .bb-bty-product-overline {
          display: block;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.8px;
          text-transform: uppercase;
          color: rgba(10, 37, 64, 0.5);
          margin-bottom: 14px;
        }
        .bb-bty-product-h {
          font-family: var(--font-serif);
          font-weight: 400;
          font-size: clamp(34px, 4.6vw, 52px);
          line-height: 1;
          letter-spacing: -1.6px;
          color: var(--color-ink);
          margin: 0 0 18px;
        }
        .bb-bty-product-h em { font-style: italic; color: var(--color-brand-pink); }
        .bb-bty-product-lead {
          font-size: 16px;
          line-height: 1.7;
          color: rgba(10, 37, 64, 0.78);
          max-width: 480px;
          margin: 0 0 28px;
        }

        .bb-bty-ing-section {
          margin-bottom: 24px;
          padding: 18px 20px;
          background: var(--color-cream-2);
          border-radius: 14px;
        }
        .bb-bty-ing-label {
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: 1.4px;
          text-transform: uppercase;
          color: rgba(10, 37, 64, 0.55);
          margin-bottom: 10px;
        }
        .bb-bty-ing-list {
          list-style: none;
          padding: 0; margin: 0;
          display: flex; flex-direction: column;
          gap: 8px;
        }
        .bb-bty-ing-list li {
          display: flex; align-items: baseline; gap: 10px;
          font-size: 13.5px;
          line-height: 1.5;
          color: rgba(10, 37, 64, 0.85);
        }
        .bb-bty-ing-dot {
          flex-shrink: 0;
          width: 6px; height: 6px;
          border-radius: 999px;
          background: var(--color-brand-pink);
          box-shadow: 0 0 0 3px var(--color-pink-1);
          margin-top: 7px;
        }
        .bb-bty-ing-list strong { font-weight: 800; color: var(--color-ink); }

        .bb-bty-action-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 28px;
        }
        @media (max-width: 540px) { .bb-bty-action-grid { grid-template-columns: 1fr; } }
        .bb-bty-action-tile {
          padding: 16px 18px;
          background: white;
          border: 1px solid rgba(10, 37, 64, 0.08);
          border-radius: 12px;
        }
        .bb-bty-action-tile--prevent { border-top: 3px solid #22c55e; }
        .bb-bty-action-tile--treat { border-top: 3px solid var(--color-brand-pink); }
        .bb-bty-action-label {
          display: block;
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          color: var(--color-ink);
          margin-bottom: 6px;
        }
        .bb-bty-action-tile p {
          font-size: 13px;
          line-height: 1.5;
          color: rgba(10, 37, 64, 0.7);
          margin: 0;
        }

        /* ──────────────── PRIMARY CTA ──────────────── */
        .bb-bty-cta {
          display: inline-flex;
          align-items: center;
          gap: 18px;
          padding: 18px 24px 18px 28px;
          background: var(--color-ink);
          color: var(--color-cream-1);
          border-radius: 16px;
          text-decoration: none;
          transition: all 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .bb-bty-cta:hover {
          background: var(--color-brand-pink);
          color: white;
          text-decoration: none;
          transform: translateY(-2px);
          box-shadow: 0 20px 40px -16px rgba(227, 22, 108, 0.4);
        }
        .bb-bty-cta-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .bb-bty-cta-text strong {
          font-size: 14.5px;
          font-weight: 800;
          letter-spacing: 0.2px;
        }
        .bb-bty-cta-text span {
          font-size: 11px;
          opacity: 0.7;
          font-weight: 600;
        }
        .bb-bty-cta-arrow {
          font-size: 22px;
          line-height: 1;
          transition: transform 0.22s;
        }
        .bb-bty-cta:hover .bb-bty-cta-arrow { transform: translateX(4px); }
        .bb-bty-cta--gold {
          background: #f4d585;
          color: #0a2540;
        }
        .bb-bty-cta--gold:hover {
          background: white;
          color: #0a2540;
        }
        .bb-bty-cta--ghost {
          background: transparent;
          color: white;
          border: 1.5px solid rgba(255, 255, 255, 0.3);
          padding: 16px 24px;
        }
        .bb-bty-cta--ghost:hover {
          background: white;
          color: var(--color-ink);
          border-color: white;
          box-shadow: none;
        }

        /* ──────────────── QUOTE DIVIDER ──────────────── */
        .bb-bty-quote {
          margin: 0 0 80px;
          padding: 60px 24px;
          text-align: center;
          position: relative;
        }
        @media (max-width: 720px) { .bb-bty-quote { padding: 40px 18px; margin-bottom: 60px; } }
        .bb-bty-quote-mark {
          display: block;
          font-family: var(--font-serif);
          font-style: italic;
          font-size: 120px;
          line-height: 0.3;
          color: var(--color-brand-pink);
          opacity: 0.32;
          margin-bottom: 12px;
        }
        .bb-bty-quote blockquote {
          font-family: var(--font-serif);
          font-weight: 400;
          font-size: clamp(22px, 3vw, 32px);
          line-height: 1.35;
          letter-spacing: -0.4px;
          color: var(--color-ink);
          max-width: 720px;
          margin: 0 auto 18px;
          padding: 0;
          border: 0;
        }
        .bb-bty-quote em {
          font-style: italic;
          color: var(--color-brand-pink);
        }
        .bb-bty-quote-attribution {
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 1.6px;
          text-transform: uppercase;
          color: rgba(10, 37, 64, 0.5);
        }

        /* ──────────────── RESULTS TIMELINE (dark band) ──────────────── */
        .bb-bty-timeline {
          margin: 0 0 80px;
          padding: 64px 36px;
          background: linear-gradient(135deg, #0a2540 0%, #112c4d 100%);
          color: white;
          border-radius: 28px;
          position: relative;
          overflow: hidden;
        }
        @media (max-width: 720px) { .bb-bty-timeline { padding: 48px 22px; margin-bottom: 60px; } }
        .bb-bty-timeline::before {
          content: ""; position: absolute;
          top: -100px; right: -100px;
          width: 320px; height: 320px;
          background: radial-gradient(circle, rgba(244, 213, 133, 0.18), transparent 70%);
          pointer-events: none;
        }
        .bb-bty-timeline-rail {
          position: relative;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          max-width: 1080px;
          margin: 0 auto;
        }
        @media (max-width: 880px) { .bb-bty-timeline-rail { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 540px) { .bb-bty-timeline-rail { grid-template-columns: 1fr; } }
        .bb-bty-timeline-line {
          position: absolute;
          top: 18px; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(244, 213, 133, 0.4), transparent);
        }
        @media (max-width: 880px) { .bb-bty-timeline-line { display: none; } }
        .bb-bty-timeline-item {
          padding: 28px 18px 0;
          text-align: left;
          position: relative;
        }
        .bb-bty-timeline-dot {
          position: absolute;
          top: 11px; left: 18px;
          width: 14px; height: 14px;
          border-radius: 999px;
          background: #f4d585;
          box-shadow: 0 0 0 5px rgba(244, 213, 133, 0.18);
        }
        .bb-bty-timeline-when {
          display: block;
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: 1.4px;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.55);
          margin-bottom: 6px;
        }
        .bb-bty-timeline-hl {
          display: inline-block;
          font-family: var(--font-serif);
          font-style: italic;
          font-weight: 500;
          font-size: 22px;
          color: #f4d585;
          letter-spacing: -0.4px;
          margin-bottom: 8px;
        }
        .bb-bty-timeline-what {
          font-size: 13.5px;
          line-height: 1.55;
          color: rgba(255, 255, 255, 0.78);
          margin: 0;
        }

        /* ──────────────── COMPARISON TABLE ──────────────── */
        .bb-bty-compare { margin: 0 0 80px; }
        @media (max-width: 720px) { .bb-bty-compare { margin-bottom: 60px; } }
        .bb-bty-cmp-grid {
          display: grid;
          gap: 3px;
          background: var(--color-cream-2);
          padding: 12px;
          border-radius: 20px;
          max-width: 980px;
          margin: 0 auto;
        }
        .bb-bty-cmp-row {
          display: grid;
          grid-template-columns: 1.6fr 1fr 1fr;
          gap: 12px;
          padding: 14px 18px;
          background: white;
          border-radius: 10px;
          align-items: center;
          font-size: 13.5px;
          color: rgba(10, 37, 64, 0.85);
        }
        @media (max-width: 720px) { .bb-bty-cmp-row { padding: 12px 14px; font-size: 12.5px; } }
        .bb-bty-cmp-row--head {
          background: transparent;
          padding: 0 18px 6px;
        }
        .bb-bty-cmp-feat { font-weight: 700; color: var(--color-ink); }
        .bb-bty-cmp-prod {
          text-align: center;
          padding: 16px 8px;
          border-radius: 12px;
          position: relative;
        }
        .bb-bty-cmp-prod--pink { background: var(--color-pink-1); }
        .bb-bty-cmp-prod--blue { background: rgba(2, 103, 160, 0.08); }
        .bb-bty-cmp-prod-num {
          display: block;
          font-family: var(--font-serif);
          font-style: italic;
          font-weight: 500;
          font-size: 18px;
          line-height: 1;
          color: rgba(10, 37, 64, 0.45);
          margin-bottom: 4px;
        }
        .bb-bty-cmp-prod strong {
          display: block;
          font-size: 14px;
          font-weight: 800;
          color: var(--color-ink);
          letter-spacing: -0.1px;
        }
        .bb-bty-cmp-prod-sub {
          display: block;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          color: var(--color-brand-pink);
          margin-top: 2px;
        }
        .bb-bty-cmp-cell {
          text-align: center;
          font-weight: 700;
        }
        .bb-bty-cmp-cell--yes {
          color: var(--color-brand-pink);
          font-size: 16px;
        }
        .bb-bty-cmp-cell--no { color: rgba(10, 37, 64, 0.3); }
        .bb-bty-cmp-tip {
          margin: 22px auto 0;
          max-width: 620px;
          text-align: center;
          font-size: 14px;
          color: rgba(10, 37, 64, 0.7);
          line-height: 1.6;
        }
        .bb-bty-cmp-tip strong { color: var(--color-ink); font-weight: 800; }
        .bb-bty-cmp-tip em { font-style: italic; color: var(--color-brand-pink); }

        /* ──────────────── BENTO UGC ──────────────── */
        .bb-bty-ugc { margin: 0 0 80px; }
        @media (max-width: 720px) { .bb-bty-ugc { margin-bottom: 60px; } }
        .bb-bty-bento {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          grid-template-rows: 1fr 1fr;
          gap: 14px;
          max-width: 1080px;
          margin: 0 auto;
          aspect-ratio: 16 / 8;
        }
        @media (max-width: 880px) {
          .bb-bty-bento {
            grid-template-columns: 1fr 1fr;
            grid-template-rows: auto;
            aspect-ratio: auto;
          }
        }
        @media (max-width: 540px) {
          .bb-bty-bento { grid-template-columns: 1fr; }
        }
        .bb-bty-bento-card {
          border-radius: 20px;
          overflow: hidden;
          background-size: cover;
          background-position: center;
          position: relative;
          aspect-ratio: 1 / 1;
        }
        @media (min-width: 881px) {
          .bb-bty-bento-card { aspect-ratio: auto; }
        }
        .bb-bty-bento-card--lg { grid-row: span 2; }
        @media (max-width: 880px) {
          .bb-bty-bento-card--lg { grid-column: span 2; aspect-ratio: 4/3; }
          .bb-bty-bento-card--md { grid-column: span 2; aspect-ratio: 16/9; }
        }
        @media (max-width: 540px) {
          .bb-bty-bento-card--lg,
          .bb-bty-bento-card--md { grid-column: auto; }
        }
        .bb-bty-bento-card::after {
          content: "";
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(10, 37, 64, 0.78) 0%, transparent 60%);
        }
        .bb-bty-bento-card figcaption {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          padding: 22px 20px;
          color: white;
          z-index: 1;
        }
        .bb-bty-bento-tag {
          display: inline-block;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.4px;
          text-transform: uppercase;
          color: white;
          background: rgba(227, 22, 108, 0.9);
          padding: 4px 10px;
          border-radius: 999px;
          margin-bottom: 10px;
        }
        .bb-bty-bento-card blockquote {
          font-family: var(--font-serif);
          font-style: italic;
          font-weight: 400;
          font-size: clamp(14px, 1.6vw, 18px);
          line-height: 1.35;
          letter-spacing: -0.3px;
          margin: 0 0 8px;
          padding: 0;
          border: 0;
          color: white;
        }
        .bb-bty-bento-name {
          display: block;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.6px;
          color: rgba(255, 255, 255, 0.78);
        }
        .bb-bty-bento-card--stat {
          background: linear-gradient(135deg, var(--color-pink-1) 0%, var(--color-brand-pink) 100%);
        }
        .bb-bty-bento-card--stat::after { display: none; }
        .bb-bty-bento-card--stat figcaption {
          position: static;
          padding: 28px 22px;
          height: 100%;
          display: flex; flex-direction: column;
          align-items: flex-start; justify-content: center;
          color: white;
        }
        .bb-bty-bento-card--stat strong {
          font-family: var(--font-serif);
          font-style: italic;
          font-weight: 500;
          font-size: clamp(46px, 6vw, 64px);
          letter-spacing: -2px;
          line-height: 1;
          color: white;
        }
        .bb-bty-bento-card--stat span {
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.4px;
          line-height: 1.4;
          margin-top: 8px;
        }

        /* ──────────────── FINAL EDITORIAL CTA ──────────────── */
        .bb-bty-finale {
          padding: 80px 36px;
          background: linear-gradient(135deg, #0a2540 0%, #1a3656 100%);
          color: white;
          border-radius: 28px;
          position: relative;
          overflow: hidden;
        }
        @media (max-width: 720px) { .bb-bty-finale { padding: 56px 24px; } }
        .bb-bty-finale::before {
          content: ""; position: absolute;
          top: -150px; left: -150px;
          width: 420px; height: 420px;
          background: radial-gradient(circle, rgba(227, 22, 108, 0.25), transparent 70%);
          pointer-events: none;
        }
        .bb-bty-finale::after {
          content: ""; position: absolute;
          bottom: -120px; right: -120px;
          width: 380px; height: 380px;
          background: radial-gradient(circle, rgba(244, 213, 133, 0.2), transparent 70%);
          pointer-events: none;
        }
        .bb-bty-finale-inner {
          position: relative; z-index: 1;
          max-width: 760px;
          margin: 0 auto;
          text-align: center;
        }
        .bb-bty-finale-h {
          font-family: var(--font-serif);
          font-weight: 400;
          font-size: clamp(32px, 5vw, 56px);
          line-height: 1.05;
          letter-spacing: -1.6px;
          color: white;
          margin: 0 0 22px;
        }
        .bb-bty-finale-h em { font-style: italic; color: #f4d585; }
        .bb-bty-finale-p {
          font-size: 16px;
          line-height: 1.65;
          color: rgba(255, 255, 255, 0.8);
          max-width: 560px;
          margin: 0 auto 36px;
        }
        .bb-bty-finale-actions {
          display: flex; gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }
      `}</style>
    </>
  );
}

function CmpCell({value}: {value: string}) {
  const isYes = value === '✓';
  const isNo = value === '—';
  return (
    <div className={`bb-bty-cmp-cell ${isYes ? 'bb-bty-cmp-cell--yes' : ''} ${isNo ? 'bb-bty-cmp-cell--no' : ''}`}>
      {value}
    </div>
  );
}
