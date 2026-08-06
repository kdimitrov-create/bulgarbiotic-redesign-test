import {Link} from 'react-router';

// Categories layout: 1 big "hero" tile (Women series) + 6 small tiles.
// Small tiles point to either:
//   - CloudCart collections (/collections/{handle})           — for browsable lists
//   - CloudCart CMS landing pages (/pages/{handle})           — for marketing pages with real curated content
//
// The /pages/* tiles surface real landing pages that bulgarbiotic.bg has
// produced (probiotik-za-bremenni, kosa-koja-i-nokti). These had no link
// from the home before, making them essentially invisible to new visitors.
type Tile = {
  key: string;
  title: string;
  accent?: string;
  desc: string;
  img: string;
  link: string;
  big?: boolean;
};

const TILES: Tile[] = [
  {key: 'women',     title: 'За жени',     accent: 'жени', desc: 'Интимно здраве, хормонален баланс, женско благополучие.', img: '/images/generated-v2/c-women.png',         link: '/category/probiotik-za-jeni', big: true},
  {key: 'kids',      title: 'За деца',     accent: 'деца', desc: 'Smart Start + перли с шоколад.',                                          img: '/images/generated-v2/c-kids.png',          link: '/category/probiotik-za-deca'},
  {key: 'pregnancy', title: 'За бременни',                desc: 'Специализиран пакет за бременност и кърмене.',                            img: '/images/generated/cat-pregnancy.png',      link: '/page/probiotik-za-bremenni'},
  {key: 'pearls',    title: 'Перли',                       desc: 'С натурален или млечен шоколад.',                                          img: '/images/generated-v2/c-pearls.png',        link: '/category/perli'},
  {key: 'beauty',    title: 'За отслабване', accent: 'отслабване', desc: 'Грижа за микробиома и метаболизма в борбата с излишните килограми.', img: '/images/categories/weight-loss-600900.png', link: '/category/probiotik-za-otslabvane'},
  {key: 'pets',      title: 'За домашни любимци',           desc: 'Bactology Pets — кучета и котки.',                                       img: '/images/generated-v2/c-pets.png',          link: '/product/bactology-pets'},
  {key: 'bundles',   title: 'Пакети',                       desc: 'Family Pack, Travel Pack и още комплекти с отстъпка.',                   img: '/images/generated-v2/c-bundles.png',       link: '/category/packages'},
];

export function Categories() {
  return (
    <section className="bb-cats">
      <div className="bb-container">
        <div className="bb-cats-head reveal">
          <div className="section-tag" style={{justifyContent: 'center'}}>За всеки етап</div>
          <h2 className="section-h2">Намери своя<br /><span className="accent">пробиотик.</span></h2>
        </div>
        <div className="bb-bento bb-mobile-slider reveal">
          {TILES.map((t) => (
            <Link key={t.key} to={t.link} className={`bb-ctile ${t.big ? 'bb-ctile-big' : ''}`} prefetch="intent">
              <img src={t.img} alt={t.title} />
              <div className="bb-ctile-content">
                <h3>{t.accent ? <>За <span className="accent">{t.accent}</span></> : t.title}</h3>
                <p>{t.desc}</p>
                <span className="bb-ctile-arrow">
                  Виж {t.big ? 'серията' : ''}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <style>{`
        .bb-cats { background: var(--color-cream-1); padding: 80px 0 110px; }
        .bb-cats-head { text-align: center; margin-bottom: 56px; padding: 0 36px; }
        .bb-bento {
          /* 3 columns × 3 rows. Big "Women" tile spans all 3 rows on the
             left; 6 small tiles fill the remaining 2 columns × 3 rows. */
          display: grid;
          grid-template-columns: 1.8fr 1fr 1fr;
          grid-template-rows: repeat(3, minmax(200px, 1fr));
          gap: 14px;
          height: auto;
          min-height: 700px;
          padding: 0 36px;
        }
        @media (max-width: 880px) {
          .bb-bento {
            grid-template-columns: 1fr 1fr;
            grid-template-rows: auto;
            min-height: 0;
            padding: 0 20px;
          }
        }
        @media (max-width: 540px) {
          .bb-bento { grid-template-columns: 1fr; }
        }
        .bb-ctile {
          border-radius: 24px;
          overflow: hidden;
          position: relative;
          cursor: pointer;
          transition: transform 0.4s ease, box-shadow 0.4s ease;
          min-height: 240px;
          display: block;
          color: white;
        }
        .bb-ctile:hover { transform: translateY(-6px); box-shadow: 0 28px 60px -16px rgba(10, 37, 64, 0.25); }
        .bb-ctile img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.7s ease; }
        .bb-ctile:hover img { transform: scale(1.05); }
        .bb-ctile-big { grid-row: span 3; }
        @media (max-width: 880px) {
          .bb-ctile-big { grid-row: auto; grid-column: span 2; min-height: 320px; }
        }
        @media (max-width: 540px) {
          .bb-ctile-big { grid-column: auto; min-height: 280px; }
        }
        .bb-ctile-content {
          position: absolute; inset: 0;
          padding: 32px;
          display: flex; flex-direction: column; justify-content: flex-end;
          color: white;
          background: linear-gradient(180deg, transparent 40%, rgba(10, 37, 64, 0.7) 100%);
        }
        .bb-ctile-content h3 {
          font-size: 28px; font-weight: 800; letter-spacing: -0.8px;
          line-height: 1.05; margin-bottom: 6px;
        }
        .bb-ctile-content h3 .accent { font-family: var(--font-serif); font-style: italic; font-weight: 400; color: var(--color-pink-3); }
        .bb-ctile-content p { font-size: 13px; opacity: 0.9; margin-bottom: 16px; max-width: 320px; line-height: 1.5; }
        .bb-ctile-arrow {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(255, 255, 255, 0.2); backdrop-filter: blur(10px);
          padding: 8px 14px; border-radius: 999px;
          font-size: 11px; font-weight: 800; letter-spacing: 0.4px;
          width: max-content; transition: all 0.3s;
        }
        .bb-ctile:hover .bb-ctile-arrow { background: white; color: var(--color-ink); }
        .bb-ctile-arrow svg { width: 12px; height: 12px; transition: transform 0.3s; }
        .bb-ctile:hover .bb-ctile-arrow svg { transform: translateX(3px); }
      `}</style>
    </section>
  );
}
