import {useLoaderData, Link, data} from 'react-router';
import type {Route} from './+types/blog.$blogHandle._index';
import {getContext} from '~/lib/context';
import {getSeoMeta, getPaginationVariables} from '@cloudcart/nitro';
import {Image} from '@cloudcart/nitro-react';
import {Pagination} from '~/components/Pagination';
import {Breadcrumbs} from '~/components/Breadcrumbs';
import {enhanceArticleImages, setArticleImages} from '~/lib/article-images';
import {fetchArticleImages} from '~/lib/blog-images.server';

export const meta: Route.MetaFunction = ({data: d}) => getSeoMeta({
  title: d?.blog ? `${d.blog.title} | Bactology Блог` : 'Блог | Bactology',
  description:
    'Знание за микробиома — експертно съдържание за храносмилане, имунитет, женско здраве и красота. Без жаргон, базирано на наука.',
});

export async function loader({params, context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const blog = await ctx.storefront.getBlog(params.blogHandle);
  if (!blog) throw data('Блогът не е намерен', {status: 404});
  const paginationVariables = getPaginationVariables(request, {pageBy: 12});
  const [articles, liveImages] = await Promise.all([
    ctx.storefront.getArticlesPaginated(params.blogHandle, paginationVariables),
    fetchArticleImages(ctx.env as Record<string, string | undefined>),
  ]);
  // CloudCart Storefront API returns an empty image.url for every article, so
  // the covers come from the admin panel (client 2026-08-04: "ползвай реалните
  // снимки"). The static map in article-images.ts is the fallback.
  setArticleImages(liveImages);
  const decorated = {
    ...articles,
    nodes: enhanceArticleImages((articles as any).nodes ?? [], {width: 800, height: 600}),
  };
  return {blog, articles: decorated};
}

/**
 * Format a Bulgarian-locale date but suppress epoch-zero (`1970-01-01`)
 * placeholders that CloudCart returns when an article has no real
 * `publishedAt`. A 1970 stamp is never meaningful editorial content — show
 * nothing rather than gas-lighting visitors with "By Marieta · 01/01/1970".
 */
function formatPublishedDate(iso: string | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (!isFinite(d.getTime())) return null;
  // Suppress the 1970-01-01 sentinel
  if (d.getFullYear() < 2000) return null;
  return d.toLocaleDateString('bg-BG', {year: 'numeric', month: 'long', day: 'numeric'});
}

export default function BlogPage() {
  const {blog, articles} = useLoaderData<typeof loader>();
  const totalCount = (articles as any).totalCount ?? (articles as any).nodes?.length ?? 0;

  return (
    <div className="bb-blogpage">
      <div className="bb-blogpage-container">
        <Breadcrumbs items={[{title: blog.title}]} />

        {/* Hero */}
        <header className="bb-blogpage-hero">
          <span className="bb-blogpage-tag">
            <span className="bb-blogpage-dot" />
            БЛОГ · BACTOLOGY
          </span>
          <h1 className="bb-blogpage-h1">
            Знание за <span className="accent">микробиома.</span>
          </h1>
          <p className="bb-blogpage-lead">
            Експертно съдържание за храносмилане, имунитет, женско здраве и красота.
            Без жаргон. Базирано на наука.
          </p>
          {totalCount > 0 && (
            <div className="bb-blogpage-count">
              <strong>{totalCount}</strong> {totalCount === 1 ? 'статия' : 'статии'}
            </div>
          )}
        </header>

        {/* Grid */}
        <Pagination connection={articles}>
          {({nodes, NextLink, isLoading}) => (
            <div>
              {nodes.length === 0 ? (
                <div className="bb-blogpage-empty">
                  <p>В момента няма статии в този блог.</p>
                </div>
              ) : (
                <div className="bb-blogpage-grid">
                  {nodes.map((article: any, i: number) => {
                    const date = formatPublishedDate(article.publishedAt);
                    const author = article.authorV2?.name as string | undefined;
                    return (
                      <Link
                        key={article.id}
                        to={`/article/${article.handle}`}
                        className={`bb-blogcard${i === 0 ? ' bb-blogcard--feature' : ''}`}
                        prefetch="intent"
                      >
                        <div className="bb-blogcard-img">
                          {article.image ? (
                            <Image data={article.image} alt={article.title} />
                          ) : (
                            <div className="bb-blogcard-img-placeholder" aria-hidden="true">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                <circle cx="9" cy="9" r="2" />
                                <path d="M21 15l-5-5L5 21" />
                              </svg>
                            </div>
                          )}
                          <span className="bb-blogcard-tag">Статия</span>
                        </div>
                        <div className="bb-blogcard-body">
                          <h3 className="bb-blogcard-title">{article.title}</h3>
                          {article.excerpt && (
                            <p className="bb-blogcard-excerpt">{article.excerpt}</p>
                          )}
                          {(author || date) && (
                            <div className="bb-blogcard-meta">
                              {author && <span className="bb-blogcard-author">{author}</span>}
                              {author && date && <span aria-hidden="true">·</span>}
                              {date && <time>{date}</time>}
                            </div>
                          )}
                          <span className="bb-blogcard-cta">
                            Прочети
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                              <line x1="5" y1="12" x2="19" y2="12" />
                              <polyline points="12 5 19 12 12 19" />
                            </svg>
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
              {nodes.length > 0 && (
                <NextLink className={`bb-blogpage-loadmore${isLoading ? ' loading' : ''}`}>
                  {isLoading ? (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="bb-spin">
                        <path d="M12 3a9 9 0 11-6.3 2.6" />
                      </svg>
                      Зареждам…
                    </>
                  ) : (
                    <>
                      Зареди още статии
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </>
                  )}
                </NextLink>
              )}
            </div>
          )}
        </Pagination>
      </div>

      <style>{`
        .bb-blogpage {
          background: var(--color-cream-1);
          padding: 24px 0 80px;
        }
        .bb-blogpage-container {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 20px;
        }
        @media (min-width: 880px) {
          .bb-blogpage { padding: 32px 0 120px; }
          .bb-blogpage-container { padding: 0 32px; }
        }

        /* Hero */
        .bb-blogpage-hero {
          text-align: center;
          padding: 28px 0 36px;
          max-width: 740px;
          margin: 0 auto;
        }
        @media (min-width: 880px) { .bb-blogpage-hero { padding: 40px 0 56px; } }
        .bb-blogpage-tag {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          background: white;
          border: 1px solid var(--color-pink-2);
          border-radius: 999px;
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: 1.4px;
          color: var(--color-ink);
          margin-bottom: 18px;
          box-shadow: 0 4px 12px -4px rgba(227, 22, 108, 0.18);
        }
        .bb-blogpage-dot {
          width: 7px; height: 7px; border-radius: 999px;
          background: var(--color-brand-pink);
          animation: bb-blogpage-pulse 2.4s ease infinite;
        }
        @keyframes bb-blogpage-pulse {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.18); }
        }
        .bb-blogpage-h1 {
          font-size: clamp(34px, 5vw, 56px);
          font-weight: 800;
          line-height: 1.04;
          letter-spacing: -1.6px;
          color: var(--color-ink);
          margin: 0 0 16px;
        }
        .bb-blogpage-h1 .accent {
          font-family: var(--font-serif);
          font-style: italic;
          font-weight: 400;
          color: var(--color-brand-pink);
        }
        .bb-blogpage-lead {
          font-size: 16px;
          color: rgba(10, 37, 64, 0.7);
          line-height: 1.6;
          max-width: 560px;
          margin: 0 auto 18px;
        }
        .bb-blogpage-count {
          display: inline-block;
          padding: 6px 14px;
          background: rgba(10, 37, 64, 0.06);
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          color: rgba(10, 37, 64, 0.7);
        }
        .bb-blogpage-count strong { color: var(--color-ink); }

        /* Grid */
        .bb-blogpage-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 18px;
        }
        @media (min-width: 640px) {
          .bb-blogpage-grid {
            grid-template-columns: 1fr 1fr;
            gap: 22px;
          }
        }
        @media (min-width: 1000px) {
          .bb-blogpage-grid {
            grid-template-columns: repeat(3, 1fr);
          }
          /* Feature first article — spans 2 columns on desktop with a wider image */
          .bb-blogcard--feature {
            grid-column: span 2;
            grid-row: span 1;
          }
        }
        @media (min-width: 1200px) {
          .bb-blogpage-grid { gap: 26px; }
        }

        /* Card */
        .bb-blogcard {
          display: flex;
          flex-direction: column;
          background: white;
          border-radius: 22px;
          overflow: hidden;
          border: 1px solid rgba(10, 37, 64, 0.08);
          color: var(--color-ink);
          text-decoration: none;
          transition: transform 0.32s cubic-bezier(0.2, 0.8, 0.2, 1),
                      box-shadow 0.32s ease,
                      border-color 0.32s ease;
        }
        .bb-blogcard:hover {
          transform: translateY(-4px);
          box-shadow: 0 28px 56px -16px rgba(10, 37, 64, 0.18);
          border-color: var(--color-pink-2);
          text-decoration: none;
          color: var(--color-ink);
        }
        .bb-blogcard-img {
          position: relative;
          aspect-ratio: 16 / 10;
          overflow: hidden;
          background: linear-gradient(135deg, var(--color-cream-2), var(--color-pink-1));
        }
        .bb-blogcard-img img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.7s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .bb-blogcard:hover .bb-blogcard-img img { transform: scale(1.06); }
        .bb-blogcard-img-placeholder {
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          color: rgba(10, 37, 64, 0.25);
        }
        .bb-blogcard-img-placeholder svg { width: 48px; height: 48px; }
        .bb-blogcard-tag {
          position: absolute;
          top: 14px; left: 14px;
          background: rgba(10, 37, 64, 0.85);
          backdrop-filter: blur(8px);
          color: white;
          padding: 5px 12px;
          border-radius: 999px;
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: 0.6px;
        }
        /* Feature card: large overlay image area on desktop */
        @media (min-width: 1000px) {
          .bb-blogcard--feature .bb-blogcard-img { aspect-ratio: 16 / 7; }
        }
        .bb-blogcard-body {
          padding: 22px 22px 24px;
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        @media (min-width: 1000px) {
          .bb-blogcard--feature .bb-blogcard-body { padding: 26px 28px 28px; }
        }
        .bb-blogcard-title {
          font-size: 18px;
          font-weight: 800;
          letter-spacing: -0.4px;
          line-height: 1.25;
          color: var(--color-ink);
          margin: 0 0 10px;
          /* Clamp to 3 lines so cards in the grid stay balanced */
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        @media (min-width: 1000px) {
          .bb-blogcard--feature .bb-blogcard-title { font-size: 26px; -webkit-line-clamp: 2; }
        }
        .bb-blogcard-excerpt {
          font-size: 14px;
          line-height: 1.55;
          color: rgba(10, 37, 64, 0.7);
          margin: 0 0 14px;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .bb-blogcard-meta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: rgba(10, 37, 64, 0.5);
          margin: 0 0 14px;
        }
        .bb-blogcard-author { font-weight: 700; color: rgba(10, 37, 64, 0.7); }
        .bb-blogcard-cta {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: auto;
          padding-top: 6px;
          font-size: 13px;
          font-weight: 800;
          color: var(--color-brand-pink);
          letter-spacing: 0.3px;
        }
        .bb-blogcard-cta svg {
          width: 14px; height: 14px;
          transition: transform 0.25s ease;
        }
        .bb-blogcard:hover .bb-blogcard-cta svg { transform: translateX(4px); }

        /* Empty + load more */
        .bb-blogpage-empty {
          padding: 80px 20px;
          text-align: center;
          color: rgba(10, 37, 64, 0.55);
          font-size: 15px;
        }
        .bb-blogpage-loadmore {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 13px 28px;
          margin: 36px auto 0;
          background: white;
          border: 1px solid rgba(10, 37, 64, 0.12);
          border-radius: 999px;
          font-size: 13.5px;
          font-weight: 700;
          color: var(--color-ink);
          text-decoration: none;
          transition: background 0.18s, border-color 0.18s, color 0.18s;
          width: max-content;
          /* Center horizontally even though it's a Link */
          display: flex;
          margin-left: auto;
          margin-right: auto;
        }
        .bb-blogpage-loadmore:hover {
          background: var(--color-ink);
          border-color: var(--color-ink);
          color: var(--color-cream-1);
          text-decoration: none;
        }
        .bb-blogpage-loadmore.loading { opacity: 0.7; cursor: wait; }
        .bb-blogpage-loadmore svg { width: 14px; height: 14px; }
        .bb-spin { animation: bb-spin 0.8s linear infinite; }
        @keyframes bb-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
