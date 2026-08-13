import {Link} from 'react-router';

const MAYER_PHOTO = 'https://cdncloudcart.com/26377/files/image/ea_mayer.jpeg';
const ENDERS_PHOTO = 'https://cdncloudcart.com/26377/files/image/giulia_enders_2015.jpg';
/**
 * Корицата на научния труд до разказа за L. bulgaricus.
 *
 * Дотук сочеше `babies-lactobacillus-bulgaricus.png` - това всъщност НЕ е
 * снимка на щама, а сканирана първа страница на стар обзор („…for the
 * treatment of diarrhea", Frontiers). Клиентът поиска да се смени с актуалния
 * (2026-08-12).
 *
 * Новият е „Probiotic significance of Lactobacillus strains" (Gut Microbes,
 * 2024). Корицата е първата му страница, изрисувана локално - CDN-ът раздава
 * PDF-а, но не и негово изображение.
 */
const STUDY_PDF = 'https://cdncloudcart.com/26377/files/doc/gastro-strains-general.pdf?1768999322';
const STUDY_COVER = '/images/gastro-strains-cover.png';
const BULGARICUS_IMG = 'https://cdncloudcart.com/26377/files/image/babies-lactobacillus-bulgaricus.png';

// 9 strain icons (real CDN — same set used by the legacy site)
const STRAINS = [
  {name: 'Lactobacillus bulgaricus', sub: 'Българското злато',  highlight: true,
   img: 'https://cdncloudcart.com/26377/files/image/babies-lactobacillus-bulgaricus.png'},
  {name: 'Lactobacillus acidophilus', sub: 'Имунитет', img: 'https://cdncloudcart.com/26377/files/image/babies-lactobacillus-acidophilus.png'},
  {name: 'Lactobacillus rhamnosus',  sub: 'Чревна флора', img: 'https://cdncloudcart.com/26377/files/image/babies-lactobacillus-rhamnosus.png'},
  {name: 'Lactobacillus casei',      sub: 'Имунен баланс', img: 'https://cdncloudcart.com/26377/files/image/babies-lactobacillus-casei.png'},
  {name: 'Bifidobacterium infantis', sub: 'Бебешка флора', img: 'https://cdncloudcart.com/26377/files/image/babies-bifidobacterium-infantis.png'},
  {name: 'Bifidobacterium breve',    sub: 'Чревно здраве', img: 'https://cdncloudcart.com/26377/files/image/babies-bifidobacterium-breve.png'},
  {name: 'Streptococcus thermophilus', sub: 'Ферментация', img: 'https://cdncloudcart.com/26377/files/image/babies-streptococcus-thermophilus.png'},
  {name: 'Витамин D3', sub: 'Имунитет и кости', img: 'https://cdncloudcart.com/26377/files/image/babies-vitamin-d.png'},
  {name: 'Стевия',     sub: 'Натурален подсладител', img: 'https://cdncloudcart.com/26377/files/image/babies-stevia.png'},
];

/**
 * /page/naukata-zad-bulgar-biotic — Science behind the brand.
 *
 * Editorial science-magazine layout (think Scientific American × Aēsop).
 * Manifesto hero → 4 pillars → bulgaricus story → process timeline →
 * 9-strain laboratory grid → certificates → expert quotes → final CTA.
 *
 * Real expert portraits & strain icons via CloudCart CDN.
 */
export function SciencePageContent() {
  return (
    <>
      {/* ─── HERO MANIFESTO ─── */}
      <section className="bb-sci-manifesto not-prose">
        <div className="bb-sci-manifesto-grid">
          <div className="bb-sci-manifesto-text">
            <span className="bb-sci-eyebrow">Bulgar Biotic · от 2019</span>
            <h2 className="bb-sci-manifesto-h">
              Защо този<br />бранд? Защо<br /><em>да му вярваш?</em>
            </h2>
            <p className="bb-sci-manifesto-p">
              Вярваме, че качественият пробиотик започва с науката. Зад всяка
              капсула стоят <strong>десетилетия научен опит</strong>,
              фармацевтичен контрол и наследството на д-р Стамен Григоров -
              откривателя на <em>Lactobacillus bulgaricus</em>.
            </p>
            <div className="bb-sci-manifesto-stats">
              <div>
                <strong>120+</strong>
                <span>г. изследвания на L. bulgaricus</span>
              </div>
              <div>
                <strong>50 млрд</strong>
                <span>активни CFU на доза</span>
              </div>
            </div>
          </div>
          <div className="bb-sci-manifesto-vis" aria-hidden="true">
            <div className="bb-sci-manifesto-orb">
              <span className="bb-sci-orb-ring bb-sci-orb-ring--1" />
              <span className="bb-sci-orb-ring bb-sci-orb-ring--2" />
              <span className="bb-sci-orb-ring bb-sci-orb-ring--3" />
              <span className="bb-sci-orb-backdrop" />
              <img src={BULGARICUS_IMG} alt="" loading="lazy" />
            </div>
            {/* Floating data callouts orbiting the central visual */}
            <div className="bb-sci-orb-chip bb-sci-orb-chip--strain">
              <span className="bb-sci-orb-chip-label">FLAGSHIP STRAIN</span>
              <strong>L. bulgaricus</strong>
              <span className="bb-sci-orb-chip-sub">Открит 1905</span>
            </div>
            <div className="bb-sci-orb-chip bb-sci-orb-chip--cfu">
              <span className="bb-sci-orb-chip-label">КОНЦЕНТРАЦИЯ</span>
              <strong>50<em>млрд</em></strong>
              <span className="bb-sci-orb-chip-sub">CFU на доза</span>
            </div>
            <div className="bb-sci-orb-chip bb-sci-orb-chip--cert">
              <span className="bb-sci-orb-chip-label">Сертифицирано</span>
              <strong>HACCP <em>·</em> GMP <em>·</em> ISO</strong>
              <span className="bb-sci-orb-chip-sub">Made in EU</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 4 PILLARS ─── */}
      <section className="bb-sci-pillars not-prose">
        <div className="bb-sci-section-head">
          <span className="bb-sci-tag">Какво ни прави различни</span>
          <h2 className="bb-sci-h2">
            Четири стълба на <em>качеството.</em>
          </h2>
          <p className="bb-sci-section-sub">
            Не правим компромиси с произхода, формулите или производството.
            Това са четирите неща, в които сме безкомпромисни.
          </p>
        </div>
        <div className="bb-sci-pillars-grid">
          {[
            {
              n: '01', h: 'Българско наследство',
              p: 'Lactobacillus bulgaricus е щам, който се среща естествено само в българската планина. Открит от Стамен Григоров - днес най-изследваният пробиотик в света.',
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l9 4v6c0 5.5-3.5 9.5-9 10-5.5-.5-9-4.5-9-10V6l9-4z" />
                  <path d="M9 12.5l2 2 4.5-4.5" />
                </svg>
              ),
            },
            {
              n: '02', h: 'Научен подход',
              p: 'Прецизно подбрани щамове. Научно обосновани формули. Всяка съставка с клинично потвърдено действие.',
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 4h6l-1 4h-4z" />
                  <path d="M14 8c2.5 1.5 4 4 4 7v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4c0-3 1.5-5.5 4-7" />
                  <path d="M10 14h4M10 17h4" />
                </svg>
              ),
            },
            {
              n: '03', h: 'Лабораторни анализи',
              p: '',
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 2v6l-5 8a3 3 0 002.5 4.5h9A3 3 0 0019 16l-5-8V2" />
                  <path d="M9 2h6" />
                </svg>
              ),
            },
            {
              n: '04', h: 'Производствен контрол',
              p: 'Всички процеси, хигиена и материали по европейски стандарти + вътрешни протоколи за безопасност. HACCP, GMP, ISO 9001, Made in EU.',
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <path d="M9 14l2 2 4-4" />
                </svg>
              ),
            },
          ].map((p) => (
            <article key={p.n} className="bb-sci-pillar">
              <div className="bb-sci-pillar-head">
                <span className="bb-sci-pillar-icon">{p.icon}</span>
                <span className="bb-sci-pillar-n">{p.n}</span>
              </div>
              <h3>{p.h}</h3>
              <p>{p.p}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ─── L. BULGARICUS HISTORY HERO ─── */}
      <section className="bb-sci-bulg not-prose">
        <div className="bb-sci-bulg-grid">
          <div className="bb-sci-bulg-content">
            <span className="bb-sci-tag bb-sci-tag--gold">Lactobacillus bulgaricus</span>
            <h2 className="bb-sci-bulg-h">
              В основата на<br /><em>всеки наш продукт.</em>
            </h2>
            <p className="bb-sci-bulg-lead">
              Една от двете основни бактерии за ферментацията на автентичното
              българско кисело мляко. Открита от <em>Стамен Григоров</em> през
              1905 г. Среща се естествено само тук - в българската планина.
            </p>

            <div className="bb-sci-bulg-timeline">
              <div className="bb-sci-bulg-event">
                <span className="bb-sci-bulg-year">1905</span>
                <p>Стамен Григоров открива и описва L. bulgaricus в Женева - на 27 г. възраст.</p>
              </div>
              <div className="bb-sci-bulg-event">
                <span className="bb-sci-bulg-year">1907</span>
                <p>Иля Мечников (Нобелов лауреат) свързва щама с дълголетието на българите.</p>
              </div>
              <div className="bb-sci-bulg-event">
                <span className="bb-sci-bulg-year">2019</span>
                <p>Bulgar Biotic стартира с мисията - да върне този щам в ежедневието на семействата.</p>
              </div>
            </div>
          </div>
          <div className="bb-sci-bulg-visual">
            <div className="bb-sci-bulg-glow" />
            {/* Корицата отваря самия труд в нов таб - дотук беше няма картинка,
                а читателят нямаше как да стигне до източника. */}
            <a href={STUDY_PDF} target="_blank" rel="noopener noreferrer"
               className="bb-sci-bulg-study" aria-label="Отвори научния труд (PDF)">
              <img src={STUDY_COVER} alt="Probiotic significance of Lactobacillus strains — Gut Microbes, 2024" loading="lazy" width={657} height={856} />
              <span className="bb-sci-bulg-study-badge">PDF · Gut Microbes 2024</span>
            </a>
          </div>
        </div>
      </section>

      {/* ─── PROCESS TIMELINE (4 steps horizontal) ─── */}
      <section className="bb-sci-process not-prose">
        <div className="bb-sci-section-head">
          <span className="bb-sci-tag">От лабораторията до твоята капсула</span>
          <h2 className="bb-sci-h2">
            Производственият <em>процес.</em>
          </h2>
          <p className="bb-sci-section-sub">
            4 стъпки. Всяка с независим контрол. Нито една не може да се прескочи.
          </p>
        </div>

        <ol className="bb-sci-process-list">
          {[
            {n: '01', h: 'Подбор на щамове', p: 'в основата на всяка наша формула'},
            {n: '02', h: 'Формулиране', p: 'Учените комбинират пробиотичните щамове с допълващите естествени съставки синергично според терапевтичната нужда - стомах, имунитет, женско здраве, стрес.'},
            {n: '03', h: 'Контрол и тестване', p: 'Микробиологични анализи за CFU брой и чистота. Биохимични тестове за активност. Всичко по EU стандарти.'},
            {n: '04', h: 'Стабилност и ефективност', p: 'Тестване за устойчивост в стомашна киселина + многомесечни тестове за съхранение при стайна температура.'},
          ].map((s, i) => (
            <li key={s.n} className="bb-sci-process-step">
              <div className="bb-sci-process-num">{s.n}</div>
              <h3>{s.h}</h3>
              <p>{s.p}</p>
              {i < 3 && <div className="bb-sci-process-link" aria-hidden="true" />}
            </li>
          ))}
        </ol>
      </section>

      {/* ─── STRAINS LAB GRID ─── */}
      <section className="bb-sci-strains not-prose">
        <div className="bb-sci-section-head">
          <span className="bb-sci-tag">Каталог на щамовете</span>
          <h2 className="bb-sci-h2">
            Прозрачност <em>без компромис.</em>
          </h2>
          <p className="bb-sci-section-sub">
            Всички клинично проучени щамове + витамини и минерали,
            които комбинираме в различните си формули.
          </p>
        </div>

        <div className="bb-sci-strains-grid">
          {STRAINS.map((s) => (
            <article key={s.name} className={`bb-sci-strain${s.highlight ? ' bb-sci-strain--star' : ''}`}>
              <div className="bb-sci-strain-img">
                <img src={s.img} alt={s.name} loading="lazy" />
              </div>
              <div className="bb-sci-strain-body">
                {s.highlight && <span className="bb-sci-strain-star">★ FLAGSHIP</span>}
                <h4>{s.name}</h4>
                <span className="bb-sci-strain-sub">{s.sub}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ─── CERTIFICATIONS ROW ─── */}
      <section className="bb-sci-certs not-prose">
        <div className="bb-sci-section-head">
          <span className="bb-sci-tag bb-sci-tag--gold">Независимо потвърдено</span>
          <h2 className="bb-sci-h2 bb-sci-h2--white">
            Сертификати <em>и стандарти.</em>
          </h2>
        </div>

        {/* Client: real certification badges (HACCP / Pharmaceutical Grade /
            GMP / ISO / Made in EU) — the combined image from bulgarbiotic.bg. */}
        <div className="bb-sci-certs-row">
          <img
            className="bb-sci-certs-img"
            src="https://cdncloudcart.com/26377/files/image/logos_certificates_cut.webp?1769152740"
            alt="Сертификати: HACCP · Pharmaceutical Grade · GMP · ISO · Made in EU"
            loading="lazy"
          />
        </div>

        <p className="bb-sci-certs-note">
          Сертификатите се одитират ежегодно от независими сертификационни органи.
          Всяка партида получава Лаборатория на анализ преди опаковка.
        </p>
      </section>

      {/* ─── EXPERT QUOTES ─── */}
      <section className="bb-sci-experts not-prose">
        <div className="bb-sci-section-head">
          <span className="bb-sci-tag">Мнението на учените</span>
          <h2 className="bb-sci-h2">
            Какво казват <em>водещите имена.</em>
          </h2>
          <p className="bb-sci-section-sub">
            Не само ние говорим за връзката между микробиома и здравето.
            Световните авторитети потвърждават.
          </p>
        </div>

        <div className="bb-sci-experts-grid">
          <article className="bb-sci-expert">
            <header className="bb-sci-expert-header">
              <div className="bb-sci-expert-photo">
                <img src={MAYER_PHOTO} alt="Емеран Майер" loading="lazy" />
              </div>
              <div>
                <div className="bb-sci-expert-name">Емеран Майер</div>
                <div className="bb-sci-expert-role">Гастроентеролог &amp; невролог</div>
                <div className="bb-sci-expert-cred">35 г. изследвания на оста <em>черва ↔ мозък</em></div>
              </div>
            </header>
            <svg className="bb-sci-expert-quote" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M3 9c0-3.3 2.7-6 6-6v3c-1.7 0-3 1.3-3 3h3v6H3V9zm12 0c0-3.3 2.7-6 6-6v3c-1.7 0-3 1.3-3 3h3v6h-6V9z" />
            </svg>
            <blockquote>
              Връзката между чревните бактерии и мозъка е <em>двупосочна и
              изключително мощна</em> - промени в микробиома могат да променят
              начина, по който тялото и умът функционират.
            </blockquote>
          </article>

          <article className="bb-sci-expert">
            <header className="bb-sci-expert-header">
              <div className="bb-sci-expert-photo">
                <img src={ENDERS_PHOTO} alt="Джулия Ендерс" loading="lazy" />
              </div>
              <div>
                <div className="bb-sci-expert-name">Джулия Ендерс</div>
                <div className="bb-sci-expert-role">Учен &amp; автор</div>
                <div className="bb-sci-expert-cred"><em>"Черво с чар"</em> - бестселър за микробиома</div>
              </div>
            </header>
            <svg className="bb-sci-expert-quote" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M3 9c0-3.3 2.7-6 6-6v3c-1.7 0-3 1.3-3 3h3v6H3V9zm12 0c0-3.3 2.7-6 6-6v3c-1.7 0-3 1.3-3 3h3v6h-6V9z" />
            </svg>
            <blockquote>
              Чревният микробиом е <em>ключов регулатор</em> на имунната система,
              метаболизма и мозъчната функция - неговият баланс е фундаментален
              за цялостното здраве.
            </blockquote>
          </article>
        </div>
      </section>

      {/* ─── FINAL CTA STRIP ─── */}
      <section className="bb-sci-finale not-prose">
        <div className="bb-sci-finale-inner">
          <span className="bb-sci-eyebrow bb-sci-eyebrow--gold">Готов да започнеш?</span>
          <h2 className="bb-sci-finale-h">
            Открий <em>правилния пробиотик</em><br />за теб.
          </h2>
          <div className="bb-sci-finale-actions">
            <Link to="/category/all-products" className="bb-sci-cta bb-sci-cta--gold" prefetch="intent">
              <strong>Виж всички продукти</strong>
              <span className="bb-sci-cta-arrow">→</span>
            </Link>
          </div>
        </div>
      </section>

      <style>{`
        /* Match width of homepage */
        .bb-page-content { max-width: 100%; }

        /* ──────────────── HERO MANIFESTO ──────────────── */
        .bb-sci-manifesto {
          margin: 0 0 64px;
          padding: 56px 36px;
          background: linear-gradient(135deg, var(--color-cream-2) 0%, var(--color-pink-1) 100%);
          border-radius: 28px;
          position: relative;
          overflow: hidden;
        }
        @media (max-width: 720px) {
          .bb-sci-manifesto { padding: 36px 18px 28px; margin-bottom: 48px; border-radius: 22px; }
        }
        .bb-sci-manifesto::before {
          content: ""; position: absolute;
          top: -200px; right: -200px;
          width: 600px; height: 600px;
          background: radial-gradient(circle, rgba(227, 22, 108, 0.18), transparent 70%);
          pointer-events: none;
        }
        .bb-sci-manifesto-grid {
          position: relative; z-index: 1;
          max-width: 1180px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 60px;
          align-items: center;
        }
        @media (max-width: 880px) {
          .bb-sci-manifesto-grid { grid-template-columns: 1fr; gap: 40px; }
          .bb-sci-manifesto-vis { order: -1; }
        }
        .bb-sci-eyebrow {
          display: inline-block;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 2.4px;
          text-transform: uppercase;
          color: var(--color-brand-pink);
          margin-bottom: 18px;
        }
        .bb-sci-eyebrow--gold { color: #f4d585; }
        .bb-sci-manifesto-h {
          font-family: var(--font-serif);
          font-weight: 400;
          font-size: clamp(36px, 5.6vw, 64px);
          line-height: 0.98;
          letter-spacing: -2px;
          color: var(--color-ink);
          margin: 0 0 22px;
        }
        .bb-sci-manifesto-h em { font-style: italic; color: var(--color-brand-pink); }
        .bb-sci-manifesto-p {
          font-size: clamp(15px, 1.7vw, 18px);
          line-height: 1.65;
          color: rgba(10, 37, 64, 0.78);
          margin: 0 0 32px;
          max-width: 520px;
        }
        .bb-sci-manifesto-p strong { font-weight: 800; color: var(--color-ink); }
        .bb-sci-manifesto-stats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
          padding-top: 26px;
          border-top: 1px solid rgba(10, 37, 64, 0.12);
        }
        @media (max-width: 540px) { .bb-sci-manifesto-stats { grid-template-columns: 1fr; gap: 8px; } }
        .bb-sci-manifesto-stats > div { display: flex; flex-direction: column; }
        .bb-sci-manifesto-stats strong {
          font-family: var(--font-serif);
          font-style: italic;
          font-weight: 500;
          font-size: clamp(28px, 3.8vw, 38px);
          letter-spacing: -1.2px;
          line-height: 1;
          color: var(--color-brand-pink);
        }
        .bb-sci-manifesto-stats span {
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.3px;
          color: rgba(10, 37, 64, 0.55);
          margin-top: 6px;
          line-height: 1.3;
        }

        /* ─── Animated orb visual (much more dramatic) ─── */
        .bb-sci-manifesto-vis {
          position: relative;
          aspect-ratio: 1 / 1;
          max-width: 500px;
          margin: 0 auto;
          min-height: 320px;
        }
        .bb-sci-manifesto-orb {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .bb-sci-orb-backdrop {
          position: absolute;
          inset: 22%;
          background: white;
          border-radius: 50%;
          box-shadow:
            0 30px 60px -16px rgba(227, 22, 108, 0.28),
            0 0 0 1px rgba(227, 22, 108, 0.08) inset;
          z-index: 0;
        }
        .bb-sci-orb-ring {
          position: absolute;
          border-radius: 50%;
          border: 1.5px dashed rgba(227, 22, 108, 0.55);
          animation: bb-sci-orb-spin 60s linear infinite;
          pointer-events: none;
        }
        .bb-sci-orb-ring--1 { inset: 0;   animation-duration: 90s; border-color: rgba(227, 22, 108, 0.32); }
        .bb-sci-orb-ring--2 { inset: 10%; animation-duration: 60s; animation-direction: reverse; border-color: rgba(227, 22, 108, 0.45); }
        .bb-sci-orb-ring--3 { inset: 22%; animation-duration: 30s; border-style: solid; border-color: rgba(227, 22, 108, 0.18); border-width: 1px; }
        @keyframes bb-sci-orb-spin { to { transform: rotate(360deg); } }
        .bb-sci-manifesto-orb img {
          position: relative;
          z-index: 1;
          max-width: 52%; height: auto;
          filter: drop-shadow(0 24px 40px rgba(227, 22, 108, 0.32));
          animation: bb-sci-orb-float 6s ease-in-out infinite;
        }
        @keyframes bb-sci-orb-float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-10px); }
        }

        /* Floating data callouts orbiting the central visual */
        .bb-sci-orb-chip {
          position: absolute;
          background: white;
          border: 1px solid rgba(10, 37, 64, 0.08);
          padding: 10px 14px 12px;
          border-radius: 14px;
          box-shadow: 0 16px 32px -10px rgba(10, 37, 64, 0.18);
          display: flex; flex-direction: column;
          min-width: 0;
          animation: bb-sci-chip-float 7s ease-in-out infinite;
          z-index: 2;
        }
        @keyframes bb-sci-chip-float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }
        .bb-sci-orb-chip--strain {
          top: 4%; left: -4%;
          animation-delay: -1s;
        }
        .bb-sci-orb-chip--cfu {
          top: 38%; right: -6%;
          animation-delay: -3s;
        }
        .bb-sci-orb-chip--cert {
          bottom: 4%; left: 8%;
          animation-delay: -5s;
        }
        .bb-sci-orb-chip-label {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          color: rgba(10, 37, 64, 0.5);
          margin-bottom: 4px;
          white-space: nowrap;
        }
        .bb-sci-orb-chip strong {
          font-family: var(--font-serif);
          font-style: italic;
          font-weight: 500;
          font-size: 22px;
          letter-spacing: -0.4px;
          line-height: 1;
          color: var(--color-brand-pink);
          white-space: nowrap;
        }
        .bb-sci-orb-chip strong em {
          font-style: italic;
          font-size: 14px;
          color: rgba(227, 22, 108, 0.7);
          margin-left: 3px;
          letter-spacing: 0;
        }
        .bb-sci-orb-chip-sub {
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.2px;
          color: rgba(10, 37, 64, 0.55);
          margin-top: 6px;
          white-space: nowrap;
        }
        @media (max-width: 880px) {
          /* Mobile: keep visual but shrink chip text & repack tighter */
          .bb-sci-manifesto-vis { min-height: 280px; max-width: 380px; }
          .bb-sci-orb-chip { padding: 8px 12px 10px; }
          .bb-sci-orb-chip strong { font-size: 18px; }
          .bb-sci-orb-chip-label { font-size: 8.5px; }
          .bb-sci-orb-chip-sub { font-size: 10px; }
        }
        @media (max-width: 540px) {
          .bb-sci-manifesto-vis { max-width: 320px; min-height: 260px; }
          .bb-sci-orb-chip strong { font-size: 16px; }
          .bb-sci-orb-chip strong em { font-size: 12px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .bb-sci-orb-ring,
          .bb-sci-orb-chip,
          .bb-sci-manifesto-orb img { animation: none !important; }
        }

        /* ──────────────── COMMON ──────────────── */
        .bb-sci-section-head {
          text-align: center;
          margin-bottom: 48px;
          max-width: 740px;
          margin-left: auto; margin-right: auto;
        }
        .bb-sci-tag {
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
        .bb-sci-tag--gold {
          background: rgba(244, 213, 133, 0.16);
          color: #f4d585;
          border: 1px solid rgba(244, 213, 133, 0.3);
        }
        .bb-sci-h2 {
          font-family: var(--font-serif);
          font-weight: 400;
          font-size: clamp(30px, 4.2vw, 48px);
          line-height: 1.05;
          letter-spacing: -1.6px;
          color: var(--color-ink);
          margin: 0 0 14px;
        }
        .bb-sci-h2--white { color: white; }
        .bb-sci-h2 em { font-style: italic; color: var(--color-brand-pink); }
        .bb-sci-h2--white em { color: #f4d585; }
        .bb-sci-section-sub {
          font-size: 15px;
          line-height: 1.65;
          color: rgba(10, 37, 64, 0.7);
        }
        .bb-sci-pillars,
        .bb-sci-bulg,
        .bb-sci-process,
        .bb-sci-strains,
        .bb-sci-experts {
          margin: 0 0 80px;
        }
        @media (max-width: 720px) {
          .bb-sci-pillars,
          .bb-sci-bulg,
          .bb-sci-process,
          .bb-sci-strains,
          .bb-sci-experts { margin-bottom: 60px; }
        }

        /* ──────────────── 4 PILLARS ──────────────── */
        .bb-sci-pillars-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }
        @media (max-width: 980px) { .bb-sci-pillars-grid { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 540px) { .bb-sci-pillars-grid { grid-template-columns: 1fr; } }
        .bb-sci-pillar {
          padding: 32px 26px 28px;
          background: white;
          border: 1px solid rgba(10, 37, 64, 0.08);
          border-radius: 20px;
          transition: all 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .bb-sci-pillar:hover {
          transform: translateY(-4px);
          border-color: var(--color-brand-pink);
          box-shadow: 0 20px 40px -16px rgba(227, 22, 108, 0.2);
        }
        .bb-sci-pillar-head {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 18px;
        }
        .bb-sci-pillar-icon {
          width: 44px; height: 44px;
          border-radius: 12px;
          background: var(--color-pink-1);
          color: var(--color-brand-pink);
          display: inline-flex; align-items: center; justify-content: center;
          transition: all 0.22s;
        }
        .bb-sci-pillar:hover .bb-sci-pillar-icon {
          background: var(--color-brand-pink);
          color: white;
        }
        .bb-sci-pillar-icon svg { width: 22px; height: 22px; }
        .bb-sci-pillar-n {
          font-family: var(--font-serif);
          font-style: italic;
          font-weight: 500;
          font-size: 26px;
          letter-spacing: -0.8px;
          color: rgba(10, 37, 64, 0.18);
          line-height: 1;
        }
        .bb-sci-pillar h3 {
          font-size: 17px;
          font-weight: 800;
          letter-spacing: -0.3px;
          color: var(--color-ink);
          margin: 0 0 10px;
          line-height: 1.2;
        }
        .bb-sci-pillar p {
          font-size: 13px;
          line-height: 1.6;
          color: rgba(10, 37, 64, 0.7);
          margin: 0;
        }

        /* ──────────────── BULGARICUS HERO ──────────────── */
        .bb-sci-bulg {
          padding: 70px 50px;
          background: linear-gradient(135deg, #0a2540 0%, #112c4d 100%);
          color: white;
          border-radius: 28px;
          position: relative;
          overflow: hidden;
        }
        @media (max-width: 720px) { .bb-sci-bulg { padding: 48px 24px; } }
        .bb-sci-bulg::before {
          content: ""; position: absolute;
          top: -120px; right: -120px;
          width: 380px; height: 380px;
          background: radial-gradient(circle, rgba(227, 22, 108, 0.25), transparent 70%);
          pointer-events: none;
        }
        .bb-sci-bulg-grid {
          position: relative; z-index: 1;
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 60px;
          align-items: center;
          max-width: 1180px;
          margin: 0 auto;
        }
        @media (max-width: 880px) { .bb-sci-bulg-grid { grid-template-columns: 1fr; } }
        .bb-sci-bulg-h {
          font-family: var(--font-serif);
          font-weight: 400;
          font-size: clamp(34px, 5vw, 52px);
          line-height: 1;
          letter-spacing: -1.8px;
          color: white;
          margin: 14px 0 22px;
        }
        .bb-sci-bulg-h em { font-style: italic; color: #f4d585; }
        .bb-sci-bulg-lead {
          font-size: 16px;
          line-height: 1.65;
          color: rgba(255, 255, 255, 0.82);
          margin: 0 0 32px;
        }
        .bb-sci-bulg-lead em {
          font-family: var(--font-serif);
          font-style: italic;
          color: #f4d585;
          font-weight: 500;
        }
        .bb-sci-bulg-timeline {
          display: flex; flex-direction: column;
          gap: 14px;
          padding-top: 24px;
          border-top: 1px solid rgba(244, 213, 133, 0.22);
        }
        .bb-sci-bulg-event {
          display: grid;
          grid-template-columns: 80px 1fr;
          gap: 18px;
          align-items: baseline;
        }
        .bb-sci-bulg-year {
          font-family: var(--font-serif);
          font-style: italic;
          font-weight: 500;
          font-size: 26px;
          color: #f4d585;
          letter-spacing: -0.5px;
        }
        .bb-sci-bulg-event p {
          font-size: 14px;
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.78);
          margin: 0;
        }
        .bb-sci-bulg-visual {
          position: relative;
          aspect-ratio: 1/1;
          display: flex; align-items: center; justify-content: center;
        }
        .bb-sci-bulg-glow {
          position: absolute; inset: 8%;
          background: radial-gradient(circle, rgba(244, 213, 133, 0.32) 0%, transparent 70%);
          border-radius: 50%;
        }
        .bb-sci-bulg-visual img {
          position: relative;
          max-width: 75%; height: auto;
          filter: drop-shadow(0 28px 50px rgba(244, 213, 133, 0.42));
        }

        /* Корицата на труда е лист хартия, не светеща емблема: правоъгълна
           сянка вместо златното сияние, и лек ръб, за да се чете като документ. */
        .bb-sci-bulg-study {
          position: relative;
          display: inline-block;
          text-decoration: none;
          transition: transform .3s ease;
        }
        .bb-sci-bulg-study:hover { transform: translateY(-6px); }
        .bb-sci-bulg-study:focus-visible {
          outline: 2px solid #f4d585; outline-offset: 6px; border-radius: 8px;
        }
        .bb-sci-bulg-visual .bb-sci-bulg-study img {
          max-width: min(100%, 320px);
          max-height: 440px;
          width: auto; height: auto;
          border-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          box-shadow: 0 30px 60px -20px rgba(0, 0, 0, 0.6);
          filter: none;
        }
        .bb-sci-bulg-study-badge {
          position: absolute; left: 50%; bottom: -14px; transform: translateX(-50%);
          white-space: nowrap;
          padding: 6px 14px; border-radius: 999px;
          background: #f4d585; color: #12233f;
          font-size: 11px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase;
          box-shadow: 0 8px 20px -8px rgba(0, 0, 0, 0.5);
        }

        /* ──────────────── PROCESS TIMELINE ──────────────── */
        .bb-sci-process-list {
          list-style: none;
          padding: 0; margin: 0;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          counter-reset: bb-sci-proc;
        }
        @media (max-width: 880px) { .bb-sci-process-list { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 540px) { .bb-sci-process-list { grid-template-columns: 1fr; } }
        .bb-sci-process-step {
          position: relative;
          padding: 30px 24px;
          background: var(--color-cream-2);
          border-radius: 18px;
          transition: background 0.22s;
        }
        .bb-sci-process-step:hover { background: var(--color-pink-1); }
        .bb-sci-process-num {
          font-family: var(--font-serif);
          font-style: italic;
          font-weight: 500;
          font-size: 42px;
          letter-spacing: -1.5px;
          line-height: 1;
          color: var(--color-brand-pink);
          margin-bottom: 14px;
        }
        .bb-sci-process-step h3 {
          font-size: 16px;
          font-weight: 800;
          letter-spacing: -0.2px;
          color: var(--color-ink);
          margin: 0 0 10px;
        }
        .bb-sci-process-step p {
          font-size: 13px;
          line-height: 1.55;
          color: rgba(10, 37, 64, 0.72);
          margin: 0;
        }
        .bb-sci-process-link {
          position: absolute;
          top: 48px;
          right: -12px;
          width: 24px; height: 2px;
          background: repeating-linear-gradient(to right, var(--color-brand-pink), var(--color-brand-pink) 3px, transparent 3px, transparent 6px);
          z-index: 1;
        }
        @media (max-width: 880px) { .bb-sci-process-link { display: none; } }

        /* ──────────────── STRAINS LAB GRID ──────────────── */
        .bb-sci-strains-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        @media (max-width: 880px) { .bb-sci-strains-grid { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 540px) { .bb-sci-strains-grid { grid-template-columns: 1fr; } }
        .bb-sci-strain {
          display: grid;
          grid-template-columns: 64px 1fr;
          gap: 16px;
          align-items: center;
          padding: 18px;
          background: white;
          border: 1px solid rgba(10, 37, 64, 0.08);
          border-radius: 14px;
          transition: all 0.22s;
        }
        .bb-sci-strain:hover {
          border-color: var(--color-brand-pink);
          transform: translateY(-3px);
          box-shadow: 0 16px 28px -12px rgba(227, 22, 108, 0.2);
        }
        .bb-sci-strain--star {
          background: linear-gradient(135deg, var(--color-pink-1), var(--color-cream-2));
          border-color: rgba(227, 22, 108, 0.18);
        }
        .bb-sci-strain-img {
          width: 64px; height: 64px;
          background: white;
          border-radius: 14px;
          padding: 8px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 10px -2px rgba(10, 37, 64, 0.08);
        }
        .bb-sci-strain-img img { max-width: 100%; max-height: 100%; object-fit: contain; }
        .bb-sci-strain-body { min-width: 0; }
        .bb-sci-strain-star {
          display: inline-block;
          font-size: 9.5px;
          font-weight: 800;
          letter-spacing: 1.2px;
          color: white;
          background: var(--color-brand-pink);
          padding: 2px 8px;
          border-radius: 999px;
          margin-bottom: 6px;
        }
        .bb-sci-strain h4 {
          font-family: var(--font-serif);
          font-style: italic;
          font-weight: 500;
          font-size: 15px;
          letter-spacing: -0.2px;
          color: var(--color-ink);
          margin: 0 0 4px;
          line-height: 1.2;
        }
        .bb-sci-strain-sub {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          color: var(--color-brand-pink);
        }

        /* ──────────────── CERTIFICATIONS BAND ──────────────── */
        .bb-sci-certs {
          padding: 64px 36px;
          background: linear-gradient(135deg, #0a2540 0%, #112c4d 100%);
          color: white;
          border-radius: 28px;
          position: relative;
          overflow: hidden;
        }
        @media (max-width: 720px) { .bb-sci-certs { padding: 48px 22px; } }
        .bb-sci-certs::before {
          content: ""; position: absolute;
          bottom: -120px; left: -120px;
          width: 360px; height: 360px;
          background: radial-gradient(circle, rgba(244, 213, 133, 0.18), transparent 70%);
          pointer-events: none;
        }
        .bb-sci-certs-row {
          position: relative;
          display: flex;
          justify-content: center;
          max-width: 880px;
          margin: 0 auto;
        }
        .bb-sci-certs-img {
          display: block; width: 100%; max-width: 820px; height: auto;
          background: #fff; border-radius: 20px; padding: 26px 32px;
          box-shadow: 0 22px 50px -24px rgba(0, 0, 0, 0.45);
        }
        @media (max-width: 720px) { .bb-sci-certs-img { padding: 18px 16px; border-radius: 16px; } }
        .bb-sci-cert {
          aspect-ratio: 1 / 1;
          background: radial-gradient(circle at 35% 30%, #faf6ec, #e8e3d4);
          border: 2px solid #c4974f;
          border-radius: 50%;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 4px;
          text-align: center;
          padding: 12px;
          transition: transform 0.22s;
        }
        .bb-sci-cert:hover { transform: scale(1.05) rotate(-3deg); }
        .bb-sci-cert-acro {
          font-size: 16px;
          font-weight: 900;
          letter-spacing: 0.5px;
          color: #0a2540;
        }
        .bb-sci-cert-sub {
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          color: rgba(10, 37, 64, 0.7);
        }
        .bb-sci-certs-note {
          margin: 28px auto 0;
          max-width: 580px;
          text-align: center;
          font-size: 12.5px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.6);
        }

        /* ──────────────── EXPERTS ──────────────── */
        .bb-sci-experts-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
        }
        @media (max-width: 880px) { .bb-sci-experts-grid { grid-template-columns: 1fr; } }
        .bb-sci-expert {
          padding: 32px 30px;
          background: white;
          border: 1px solid rgba(10, 37, 64, 0.08);
          border-radius: 22px;
          transition: all 0.22s;
        }
        .bb-sci-expert:hover {
          border-color: var(--color-brand-pink);
          box-shadow: 0 20px 40px -16px rgba(227, 22, 108, 0.18);
        }
        .bb-sci-expert-header {
          display: grid;
          grid-template-columns: 84px 1fr;
          gap: 18px;
          align-items: center;
          padding-bottom: 22px;
          margin-bottom: 22px;
          border-bottom: 1px solid rgba(10, 37, 64, 0.08);
        }
        @media (max-width: 540px) {
          .bb-sci-expert { padding: 26px 22px; }
          .bb-sci-expert-header { grid-template-columns: 64px 1fr; gap: 14px; }
        }
        .bb-sci-expert-photo {
          width: 84px; height: 84px;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;
          border: 3px solid var(--color-pink-1);
        }
        @media (max-width: 540px) {
          .bb-sci-expert-photo { width: 64px; height: 64px; }
        }
        .bb-sci-expert-photo img {
          width: 100%; height: 100%;
          object-fit: cover;
        }
        .bb-sci-expert-name {
          font-size: 17px;
          font-weight: 800;
          letter-spacing: -0.2px;
          color: var(--color-ink);
        }
        .bb-sci-expert-role {
          font-size: 12.5px;
          font-weight: 700;
          color: var(--color-brand-pink);
          margin-top: 2px;
        }
        .bb-sci-expert-cred {
          font-size: 11.5px;
          color: rgba(10, 37, 64, 0.6);
          margin-top: 4px;
          line-height: 1.4;
        }
        .bb-sci-expert-cred em {
          font-style: italic;
          color: var(--color-ink);
          font-weight: 600;
        }
        .bb-sci-expert-quote {
          width: 32px; height: 32px;
          color: var(--color-brand-pink);
          opacity: 0.35;
          display: block;
          margin-bottom: 12px;
        }
        .bb-sci-expert blockquote {
          font-family: var(--font-serif);
          font-style: italic;
          font-weight: 400;
          font-size: 17px;
          line-height: 1.5;
          letter-spacing: -0.2px;
          color: var(--color-ink);
          margin: 0;
          padding: 0;
          border: 0;
        }
        .bb-sci-expert blockquote em {
          font-style: italic;
          color: var(--color-brand-pink);
          font-weight: 500;
        }

        /* ──────────────── FINAL CTA ──────────────── */
        .bb-sci-finale {
          padding: 80px 36px;
          background: linear-gradient(135deg, #0a2540 0%, #1a3656 100%);
          color: white;
          border-radius: 28px;
          position: relative;
          overflow: hidden;
        }
        @media (max-width: 720px) { .bb-sci-finale { padding: 56px 24px; } }
        .bb-sci-finale::before {
          content: ""; position: absolute;
          top: -150px; left: -150px;
          width: 420px; height: 420px;
          background: radial-gradient(circle, rgba(244, 213, 133, 0.2), transparent 70%);
          pointer-events: none;
        }
        .bb-sci-finale::after {
          content: ""; position: absolute;
          bottom: -120px; right: -120px;
          width: 380px; height: 380px;
          background: radial-gradient(circle, rgba(227, 22, 108, 0.2), transparent 70%);
          pointer-events: none;
        }
        .bb-sci-finale-inner {
          position: relative; z-index: 1;
          max-width: 760px;
          margin: 0 auto;
          text-align: center;
        }
        .bb-sci-finale-h {
          font-family: var(--font-serif);
          font-weight: 400;
          font-size: clamp(34px, 5vw, 56px);
          line-height: 1.05;
          letter-spacing: -1.8px;
          color: white;
          margin: 0 0 22px;
        }
        .bb-sci-finale-h em { font-style: italic; color: #f4d585; }
        .bb-sci-finale-p {
          font-size: 16px;
          line-height: 1.65;
          color: rgba(255, 255, 255, 0.78);
          max-width: 560px;
          margin: 0 auto 36px;
        }
        .bb-sci-finale-actions {
          display: flex; gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .bb-sci-cta {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 16px 28px;
          border-radius: 14px;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.2px;
          text-decoration: none;
          transition: all 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .bb-sci-cta:hover { text-decoration: none; transform: translateY(-2px); }
        .bb-sci-cta--gold {
          background: #f4d585;
          color: #0a2540;
        }
        .bb-sci-cta--gold:hover {
          background: white;
          box-shadow: 0 20px 40px -16px rgba(244, 213, 133, 0.4);
        }
        .bb-sci-cta--ghost {
          background: transparent;
          color: white;
          border: 1.5px solid rgba(255, 255, 255, 0.3);
        }
        .bb-sci-cta--ghost:hover {
          background: white;
          color: #0a2540;
          border-color: white;
        }
        .bb-sci-cta-arrow {
          font-size: 18px;
          line-height: 1;
          transition: transform 0.22s;
        }
        .bb-sci-cta:hover .bb-sci-cta-arrow { transform: translateX(4px); }
      `}</style>
    </>
  );
}
