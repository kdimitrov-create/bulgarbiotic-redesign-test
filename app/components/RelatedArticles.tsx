import {Link} from 'react-router';
import {Image} from '@cloudcart/nitro-react';
import type {Article} from '@cloudcart/nitro';

/**
 * Свързани статии под блог статия (клиент, т. SEO 3 - избра „статии").
 *
 * Дотук статията свършваше с връзка „назад" и читателят нямаше накъде да
 * продължи. За търсачката това е задънена улица: страница без изходящи връзки
 * към сродно съдържание не подава тежест на нищо и посещението свършва тук.
 *
 * Редът е ръчно превъртане, не решетка: статиите са къси карти и на телефон
 * решетката ги прави или прекалено дребни, или безкрайно високи.
 */
interface Props {
  articles: Article[];
  /** Показва се, ако има поне една статия освен текущата. */
  currentHandle?: string;
}

function previewText(s: string, max = 110): string {
  const stripped = (s ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return stripped.length <= max ? stripped : stripped.slice(0, max).trimEnd() + '…';
}

export function RelatedArticles({articles, currentHandle}: Props) {
  const others = (articles ?? []).filter((a: any) => a?.handle && a.handle !== currentHandle).slice(0, 8);
  if (others.length === 0) return null;

  return (
    <section className="bb-related" aria-labelledby="bb-related-title">
      <div className="bb-related-head">
        <h2 id="bb-related-title" className="bb-related-title">Продължи с</h2>
        <Link to="/blog" className="bb-related-all" prefetch="intent">
          Всички статии
        </Link>
      </div>

      <div className="bb-related-rail">
        {others.map((a: any) => (
          <Link key={a.handle} to={`/article/${a.handle}`} className="bb-related-card" prefetch="intent">
            <div className="bb-related-media">
              {a.image?.url ? (
                <Image data={a.image} width={420} height={260} alt={a.image?.altText ?? a.title ?? ''} loading="lazy" />
              ) : (
                <div className="bb-related-media-empty" aria-hidden="true" />
              )}
            </div>
            <div className="bb-related-body">
              <h3 className="bb-related-card-title">{a.title}</h3>
              {a.excerpt ? <p className="bb-related-card-sub">{previewText(a.excerpt)}</p> : null}
            </div>
          </Link>
        ))}
      </div>

      <style>{`
        .bb-related {
          max-width: 1180px;
          margin: 56px auto 0;
          padding: 34px 20px 8px;
          border-top: 1px solid rgba(10, 37, 64, 0.1);
        }
        .bb-related-head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
        }
        .bb-related-title {
          font-size: clamp(20px, 3vw, 26px);
          font-weight: 800;
          letter-spacing: -0.4px;
          color: var(--color-ink);
          margin: 0;
        }
        .bb-related-all {
          font-size: 13px;
          font-weight: 700;
          color: var(--color-brand-pink);
          white-space: nowrap;
        }
        /* Редът се превърта настрани; картите не се свиват под мярката си.
           Отстъпът отдолу оставя място на лентата за превъртане, за да не
           реже долния ръб на картите. */
        .bb-related-rail {
          display: flex;
          gap: 16px;
          overflow-x: auto;
          padding-bottom: 14px;
          scroll-snap-type: x mandatory;
          scrollbar-width: thin;
          scrollbar-color: rgba(10, 37, 64, 0.22) transparent;
        }
        .bb-related-rail::-webkit-scrollbar { height: 8px; }
        .bb-related-rail::-webkit-scrollbar-thumb {
          background: rgba(10, 37, 64, 0.18);
          border-radius: 999px;
        }
        .bb-related-card {
          flex: 0 0 clamp(220px, 74vw, 290px);
          scroll-snap-align: start;
          background: #fff;
          border: 1px solid rgba(10, 37, 64, 0.1);
          border-radius: 14px;
          overflow: hidden;
          text-decoration: none;
          color: inherit;
          transition: border-color 0.18s, transform 0.18s;
        }
        .bb-related-card:hover {
          border-color: var(--color-brand-pink);
          transform: translateY(-2px);
          text-decoration: none;
        }
        .bb-related-media { aspect-ratio: 16 / 10; background: var(--color-cream-2); overflow: hidden; }
        .bb-related-media img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .bb-related-media-empty { width: 100%; height: 100%; background: var(--color-cream-3); }
        .bb-related-body { padding: 14px 15px 17px; }
        .bb-related-card-title {
          font-size: 15px;
          font-weight: 750;
          line-height: 1.3;
          color: var(--color-ink);
          margin: 0 0 6px;
        }
        .bb-related-card-sub {
          font-size: 14px;
          line-height: 1.55;
          color: rgba(10, 37, 64, 0.62);
          margin: 0;
        }
        @media (prefers-reduced-motion: reduce) {
          .bb-related-card { transition: none; }
          .bb-related-card:hover { transform: none; }
        }
      `}</style>
    </section>
  );
}
