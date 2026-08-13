import {Link} from 'react-router';

/**
 * Press / media strip — REAL outlets that have covered Bulgar Biotic.
 *
 * Client 2026-08-05: the chips must keep the visitor ON our site, so each one
 * now points at OUR OWN article about that coverage instead of the publisher's
 * page, and only the four outlets she named are shown (was eight). The full
 * list still lives on `/page/mediite-za-nas`, where the client wants the rows
 * to carry NO links at all.
 *
 * Every `article` below is a real handle in the store's `beauty-and-health`
 * blog, matched to the titles she supplied.
 *
 * Typographic representation only (no licensed logos used).
 */
type Outlet = {
  name: string;
  tagline?: string;
  headline: string;
  /** Handle of our own article — rendered as `/article/{handle}`. */
  article: string;
  family: 'sans' | 'serif';
};

const OUTLETS: Outlet[] = [
  {
    name: 'EVA', family: 'serif', tagline: 'Награда',
    headline: 'Булгар Биотик e най-добрият български бранд за пробиотици за 2025 г.',
    article: 'bulgar-biotik-e-nay-dobriyat-balgarski-brand-za-probiotici-za-2025-g',
  },
  {
    name: 'Mediapool', family: 'sans', tagline: 'News',
    headline: 'Bactology Babies & Kids - пробиотични перли с млечен шоколад за силен детски имунитет',
    article: 'bactology-babies-kids-probiotichni-perli-s-mlechen-shokolad-za-silen-detski-imunitet',
  },
  {
    name: 'Grazia', family: 'serif', tagline: 'Lifestyle',
    headline: 'Искаш да отслабнеш? Пробиотиците идват на помощ!',
    article: 'iskash-da-otslabnesh-probioticite-idvat-na-pomosht',
  },
  {
    name: 'Manager', family: 'serif', tagline: 'Бизнес',
    headline: 'Булгар Биотик: вдъхновение от традициите и природата',
    article: 'bulgarbiotik-vdahnovenie-ot-tradiciite-i-prirod',
  },
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
            <Link
              key={o.name}
              to={`/article/${o.article}`}
              prefetch="intent"
              className={`bb-press-logo bb-press-logo--${o.family}`}
              title={o.headline}
              aria-label={`${o.name}: ${o.headline}`}
            >
              <span className="bb-press-name">{o.name}</span>
              {o.tagline && <span className="bb-press-small">{o.tagline}</span>}
            </Link>
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
