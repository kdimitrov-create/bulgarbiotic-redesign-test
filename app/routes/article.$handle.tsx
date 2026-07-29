import {useLoaderData, data, Link} from 'react-router';
import type {Route} from './+types/article.$handle';
import {getContext} from '~/lib/context';
import {getSeoMeta} from '@cloudcart/nitro';
import {RichText, Image} from '@cloudcart/nitro-react';
import {PageShell, PageBackLink} from '~/components/PageShell';
import {enhanceArticleImage} from '~/lib/article-images';

/** Default blog handle on bulgarbiotic.bg. All articles live in this blog,
 *  matching the legacy single-segment URL pattern `/article/{slug}`. */
const DEFAULT_BLOG_HANDLE = 'beauty-and-health';

export const meta: Route.MetaFunction = ({data: d}) => {
  const article = d?.article as any;
  if (!article) return getSeoMeta({title: 'Статия | Bactology'});
  return getSeoMeta({
    title: `${article.title} | Bactology Блог`,
    description: article.excerpt?.slice(0, 160) || undefined,
    type: 'article',
    ...(article.image?.url
      ? {image: {url: article.image.url, width: article.image.width, height: article.image.height}}
      : {}),
  });
};

export async function loader({params, context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const article = await ctx.storefront
    .getArticle(DEFAULT_BLOG_HANDLE, params.handle)
    .catch(() => null);
  if (!article) throw data('Статията не е намерена', {status: 404});
  // Decorate with the real cover image URL — storefront returns empty.
  // Use a wider hero image (1600x900) for the article hero banner.
  return {article: enhanceArticleImage(article as any, {width: 1600, height: 900})};
}

export default function ArticleRoute() {
  const {article} = useLoaderData<typeof loader>();
  const a = article as any;

  // Author + date — suppress CloudCart's epoch-zero sentinel
  // (`1970-01-01`) which appears when articles have no real publishedAt.
  const author = a.authorV2?.name as string | undefined;
  const rawDate = a.publishedAt as string | undefined;
  const dateObj = rawDate ? new Date(rawDate) : null;
  const publishedAt =
    dateObj && isFinite(dateObj.getTime()) && dateObj.getFullYear() >= 2000
      ? dateObj.toLocaleDateString('bg-BG', {year: 'numeric', month: 'long', day: 'numeric'})
      : null;

  return (
    <PageShell
      title={a.title}
      tag="Блог"
      breadcrumbs={[
        {title: 'Блог', to: '/blog'},
      ]}
      heroImage={a.image?.url}
    >
      {(author || publishedAt) && (
        <div className="bb-article-meta">
          {author && (
            <span className="bb-article-author">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="3.4" />
                <path d="M5.5 19.5c1.4-3.2 3.9-4.8 6.5-4.8s5.1 1.6 6.5 4.8" />
              </svg>
              {author}
            </span>
          )}
          {publishedAt && (
            <span className="bb-article-date">{publishedAt}</span>
          )}
        </div>
      )}

      {a.contentHtml ? (
        <RichText data={a.contentHtml} />
      ) : a.excerpt ? (
        <p>{a.excerpt}</p>
      ) : (
        <p className="text-gray-500">Тази статия се подготвя.</p>
      )}

      <PageBackLink />

      <style>{`
        .bb-article-meta {
          display: flex;
          gap: 18px;
          font-size: 13px;
          color: rgba(10, 37, 64, 0.55);
          margin-bottom: 20px;
          padding-bottom: 18px;
          border-bottom: 1px solid rgba(10, 37, 64, 0.08);
        }
        .bb-article-author {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-weight: 700;
          color: var(--color-ink);
        }
        .bb-article-author svg { width: 14px; height: 14px; opacity: 0.55; }
      `}</style>
    </PageShell>
  );
}
