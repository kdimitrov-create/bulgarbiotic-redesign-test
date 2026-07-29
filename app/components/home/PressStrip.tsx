import {Link} from 'react-router';

/**
 * Press / media strip — REAL outlets that have covered Bulgar Biotic.
 *
 * Sourced from `/page/mediite-za-nas` (CMS page id=36) — the actual
 * "Медиите за нас" page on bulgarbiotic.bg lists 19 real article mentions.
 * We surface 8 of the most recognizable Bulgarian outlets; each chip links
 * to the actual external article so users can verify the coverage.
 *
 * Earlier version had fabricated logos (Forbes / Капитал / БНТ / Manager /
 * DarikNews) — these are now replaced with verified mentions only.
 *
 * Typographic representation only (no licensed logos used).
 */
type Outlet = {
  name: string;
  tagline?: string;
  headline: string;
  url: string;
  family: 'sans' | 'serif';
};

const OUTLETS: Outlet[] = [
  {name: 'ELLE',         family: 'serif', tagline: 'България',  headline: '10 успели жени празнуват живота с Bulgar Biotic',  url: 'https://www.elle.bg/a/10-uspeli-zheni-praznuvat-zhivota-s-bulgar-biotik'},
  {name: 'Cosmopolitan', family: 'sans',  tagline: 'България',  headline: 'Вдъхновение от традициите и природата',           url: 'https://www.cosmopolitan.bg/a/bulgar-biotik-vdxnovenie-ot-tradiciite-i-prirodata'},
  {name: '24 часа',      family: 'sans',  tagline: 'Daily',     headline: 'Българска фирма впечатли германците с пробиотици с шоколад', url: 'https://www.24chasa.bg/bulgaria/article/17511201'},
  {name: 'Mediapool',    family: 'sans',  tagline: 'News',      headline: 'Изсушено кисело мляко под формата на перли',     url: 'https://www.mediapool.bg/izsusheno-kiselo-mlyako-pod-formata-na-perli-v-nov-shokoladov-probiotik-news302802.html'},
  {name: 'Manager',      family: 'serif', tagline: 'Магазин',   headline: 'Bulgar Biotik — вдъхновение от традициите',       url: 'https://manager.bg/общество/bulgar-biotik-vdahnovenie-ot-tradiciite-i-prirodata'},
  {name: 'az-жената',    family: 'sans',  tagline: 'Здраве',    headline: 'Bulgar Biotic — здраве и красота',                url: 'https://www.az-jenata.bg/a/5-zdrave-i-krasota/69992-bulgar-biotik'},
  {name: 'Mila',         family: 'serif', tagline: 'Lifestyle', headline: 'Bulgar Biotic — нашите традиции',                 url: 'https://www.mila.bg/Article/17511480'},
  {name: 'Mama 24',      family: 'sans',  tagline: 'За майки',  headline: 'Bulgar Biotic за цялото семейство',               url: 'https://www.mama24.bg/Article/17512059'},
];

export function PressStrip() {
  return (
    <section className="bb-press" aria-label="Медиите за нас">
      <div className="bb-container bb-press-inner">
        <div className="bb-press-head">
          <span className="bb-press-label">Медиите за нас</span>
          <span className="bb-press-meta">19+ реални публикации · Виж всички →</span>
        </div>
        <div className="bb-press-row">
          {OUTLETS.map((o) => (
            <a
              key={o.name}
              href={o.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`bb-press-logo bb-press-logo--${o.family}`}
              title={o.headline}
              aria-label={`${o.name}: ${o.headline}`}
            >
              <span className="bb-press-name">{o.name}</span>
              {o.tagline && <span className="bb-press-small">{o.tagline}</span>}
            </a>
          ))}
        </div>
        <div className="bb-press-allcta">
          <Link to="/page/mediite-za-nas" prefetch="intent">
            Виж пълния списък в нашата media страница →
          </Link>
        </div>
      </div>

      <style>{`
        .bb-press {
          background: var(--color-cream-1);
          padding: 56px 0 64px;
          border-top: 1px solid rgba(10, 37, 64, 0.06);
          border-bottom: 1px solid rgba(10, 37, 64, 0.06);
        }
        .bb-press-inner { padding: 0 36px; }
        @media (max-width: 720px) { .bb-press-inner { padding: 0 22px; } }

        .bb-press-head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-bottom: 28px;
          flex-wrap: wrap;
          gap: 8px;
        }
        .bb-press-label {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.8px;
          text-transform: uppercase;
          color: rgba(10, 37, 64, 0.55);
        }
        .bb-press-meta {
          font-size: 11px;
          font-weight: 700;
          color: rgba(10, 37, 64, 0.4);
          letter-spacing: 0.4px;
        }

        .bb-press-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          align-items: stretch;
        }
        @media (max-width: 880px) {
          .bb-press-row { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 560px) {
          .bb-press-row { grid-template-columns: repeat(2, 1fr); }
        }

        .bb-press-logo {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 18px 16px;
          background: white;
          border-radius: 14px;
          border: 1px solid rgba(10, 37, 64, 0.08);
          color: var(--color-ink);
          text-align: center;
          min-height: 84px;
          transition: all 0.2s;
        }
        .bb-press-logo:hover {
          background: var(--color-ink);
          color: var(--color-cream-1);
          border-color: var(--color-ink);
          text-decoration: none;
          transform: translateY(-2px);
          box-shadow: 0 14px 30px -12px rgba(10, 37, 64, 0.25);
        }
        .bb-press-name {
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.3px;
          line-height: 1;
        }
        .bb-press-logo--serif .bb-press-name {
          font-family: var(--font-serif);
          font-style: italic;
          font-weight: 500;
          letter-spacing: -0.5px;
        }
        .bb-press-small {
          font-size: 10.5px;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          font-weight: 600;
          opacity: 0.55;
        }

        .bb-press-allcta {
          text-align: center;
          margin-top: 22px;
          font-size: 13px;
          font-weight: 600;
          color: rgba(10, 37, 64, 0.6);
        }
        .bb-press-allcta a {
          color: var(--color-brand-pink);
          text-decoration: none;
          letter-spacing: 0.2px;
        }
        .bb-press-allcta a:hover { text-decoration: underline; }
      `}</style>
    </section>
  );
}
