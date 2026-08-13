import {Link} from 'react-router';
import {Image} from '@cloudcart/nitro-react';
import type {Article} from '@cloudcart/nitro';

interface Props {
  articles: Article[];
}

/* Сочи към `/blog`, а не към конкретен блог: този маршрут вече резолвва
   реалния handle от панела и пренасочва натам. Така връзката не остарява. */

/** Map an article handle to a short category tag rendered above the title. */
function categoryFor(handle: string): string {
  if (handle.includes('uprajneniya') || handle.includes('exercises')) return 'Тренировки';
  if (handle.includes('metabolizma') || handle.includes('metabolizm')) return 'Метаболизъм';
  if (handle.includes('roza') || handle.includes('damascena')) return 'Красота';
  if (handle.includes('gazove') || handle.includes('zapek') || handle.includes('disbioza')) return 'Храносмилане';
  if (handle.includes('femin') || handle.includes('vaginal')) return 'Женско здраве';
  if (handle.includes('deca') || handle.includes('babies')) return 'За децата';
  return 'Здраве';
}

/** Strip HTML tags and collapse whitespace, then take the first N chars. */
function previewText(s: string, max = 130): string {
  const stripped = s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (stripped.length <= max) return stripped;
  return stripped.slice(0, max).trimEnd() + '…';
}

/**
 * Blog highlights — 3 hand-picked articles from the Beauty and Health blog,
 * pulled in the homepage loader via `ctx.storefront.getArticle(handle, ...)`.
 *
 * Real source articles (id → handle):
 *   76 → roza-damascena-...                  (Damask Rose / female beauty)
 *   78 → top-5-uprajneniya-za-korem-u-doma   (Top 5 ab exercises)
 *   81 → top-10-saveta-kak-da-podobrish-...  (Top 10 metabolism tips)
 *
 * Designed to sit between <Stories /> and <FAQ /> — pivots the page from
 * social proof into educational long-form content (good for SEO + dwell time).
 */
export function BlogHighlights({articles}: Props) {
  if (!articles || articles.length === 0) return null;

  return (
    <section className="bb-blog reveal" aria-labelledby="bb-blog-title">
      <div className="bb-container">
        <div className="bb-blog-head">
          <div>
            <div className="section-tag">От блога</div>
            <h2 id="bb-blog-title" className="section-h2">
              Знание за <span className="accent">микробиома.</span>
            </h2>
            <p className="bb-blog-sub">
              Експертно съдържание за храносмилане, имунитет, женско здраве и красота.
              Без жаргон. Базирано на наука.
            </p>
          </div>
          <Link to="/blog" className="bb-blog-allcta" prefetch="intent">
            Виж всички статии
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>

        <BlogCards articles={articles} />
      </div>

      <style>{`
        .bb-blog {
          background: var(--color-cream-1);
          padding: 90px 0 100px;
        }
        .bb-blog-head {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 32px;
          align-items: end;
          margin-bottom: 44px;
          padding: 0 36px;
        }
        @media (max-width: 880px) {
          .bb-blog { padding: 64px 0 72px; }
          .bb-blog-head {
            grid-template-columns: 1fr;
            gap: 18px;
            text-align: center;
            padding: 0 22px;
          }
        }
        .bb-blog-sub {
          margin-top: 14px;
          font-size: 15px;
          color: rgba(10, 37, 64, 0.7);
          line-height: 1.65;
          max-width: 520px;
        }
        @media (max-width: 880px) {
          .bb-blog-sub { margin-left: auto; margin-right: auto; }
        }

        .bb-blog-allcta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: white;
          border: 1px solid rgba(10, 37, 64, 0.12);
          border-radius: 999px;
          color: var(--color-ink);
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.3px;
          flex-shrink: 0;
          transition: all 0.18s;
        }
        .bb-blog-allcta:hover {
          background: var(--color-ink);
          color: var(--color-cream-1);
          text-decoration: none;
          border-color: var(--color-ink);
          transform: translateY(-1px);
        }
        .bb-blog-allcta svg { width: 14px; height: 14px; }
      `}</style>
    </section>
  );
}

/**
 * Самите карти - изнесени, защото същите ги рисува и блокът „Статии" от
 * конструктора. Стиловете пътуват с компонента, за да изглежда еднакво и
 * когато секцията е сглобена в панела, а не в кода.
 */
export function BlogCards({articles, perRow = 3}: {articles: Article[]; perRow?: number}) {
  if (!articles || articles.length === 0) return null;

  return (
    <>
      <div
        className="bb-blog-grid bb-mobile-slider"
        style={{'--bb-blog-per-row': perRow} as React.CSSProperties}
      >
        {articles.map((a) => (
          <Link
            key={a.id ?? a.handle}
            to={`/article/${a.handle}`}
            className="bb-blog-card"
            prefetch="intent"
          >
            <div className="bb-blog-img">
              {a.image?.url ? (
                <Image data={a.image} alt={a.title} />
              ) : (
                <div className="bb-blog-img-fallback" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                    <path d="M4 5h16v14H4z" />
                    <path d="M4 15l5-5 4 4 3-3 4 4" />
                    <circle cx="9" cy="9" r="1.4" />
                  </svg>
                </div>
              )}
            </div>
            <div className="bb-blog-body">
              <span className="bb-blog-tag">{categoryFor(a.handle)}</span>
              <h3 className="bb-blog-title">{a.title}</h3>
              <p className="bb-blog-excerpt">{previewText(a.excerpt || '')}</p>
              <span className="bb-blog-readmore">
                Прочети
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </span>
            </div>
          </Link>
        ))}
      </div>

      <style>{`
        .bb-blog-grid {
          display: grid;
          grid-template-columns: repeat(var(--bb-blog-per-row, 3), 1fr);
          gap: 28px;
          padding: 0 36px;
        }
        @media (max-width: 980px) {
          .bb-blog-grid { grid-template-columns: 1fr 1fr; gap: 22px; padding: 0 22px; }
        }
        @media (max-width: 640px) {
          .bb-blog-grid { grid-template-columns: 1fr; gap: 22px; }
        }

        .bb-blog-card {
          display: flex;
          flex-direction: column;
          background: white;
          border-radius: 18px;
          overflow: hidden;
          color: var(--color-ink);
          border: 1px solid rgba(10, 37, 64, 0.06);
          transition: transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.22s;
        }
        .bb-blog-card:hover {
          text-decoration: none;
          transform: translateY(-4px);
          box-shadow: 0 18px 40px -16px rgba(10, 37, 64, 0.18), 0 4px 12px -4px rgba(10, 37, 64, 0.08);
        }

        .bb-blog-img {
          width: 100%;
          aspect-ratio: 16 / 10;
          background: linear-gradient(135deg, var(--color-pink-1), var(--color-cream-2));
          overflow: hidden;
          position: relative;
        }
        .bb-blog-img img {
          width: 100%; height: 100%;
          object-fit: cover;
          transition: transform 0.45s ease;
        }
        .bb-blog-card:hover .bb-blog-img img {
          transform: scale(1.04);
        }
        .bb-blog-img-fallback {
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          color: rgba(10, 37, 64, 0.2);
        }
        .bb-blog-img-fallback svg { width: 64px; height: 64px; }

        .bb-blog-body {
          padding: 22px 22px 26px;
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .bb-blog-tag {
          display: inline-block;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: var(--color-brand-pink);
          padding: 4px 10px;
          background: var(--color-pink-1);
          border-radius: 999px;
          margin-bottom: 12px;
          align-self: flex-start;
        }
        .bb-blog-title {
          font-size: 18px;
          font-weight: 700;
          line-height: 1.3;
          letter-spacing: -0.3px;
          margin-bottom: 10px;
          /* Clamp to 3 lines so cards stay roughly equal height */
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .bb-blog-excerpt {
          font-size: 15px;
          color: rgba(10, 37, 64, 0.65);
          line-height: 1.6;
          margin-bottom: 16px;
          flex: 1;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .bb-blog-readmore {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 700;
          color: var(--color-brand-pink);
          letter-spacing: 0.2px;
          margin-top: auto;
        }
        .bb-blog-readmore svg {
          width: 13px; height: 13px;
          transition: transform 0.18s;
        }
        .bb-blog-card:hover .bb-blog-readmore svg {
          transform: translateX(3px);
        }
      `}</style>
    </>
  );
}
