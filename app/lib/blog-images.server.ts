/**
 * REAL blog cover images, read from the CloudCart Admin API.
 *
 * Why: the Storefront API returns an EMPTY `article.image.url` for every
 * article (sentinel id `gid://cloudcart/ArticleImage/0`), which is why this
 * project used to carry a hand-maintained filename map. The Admin API has the
 * filename — `Article.image` = e.g. "112.png" — and the public URL is
 *
 *   {store}/cdn/img/articles/{articleId}/{filename}?width=W&height=H
 *
 * (verified 2026-08-04 against the article's own og:image on the live store).
 * Reading it live means a newly published article shows its real cover with no
 * code change, which is exactly what the client asked for.
 *
 * SERVER ONLY — the `.server.ts` suffix keeps the PAT out of the client bundle.
 */
import type {ArticleImageMap} from './article-images';

// 30 min: covers change when an article is published, not by the minute.
const CACHE_TTL_MS = 30 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8000;
const PAGE_SIZE = 100;
const MAX_PAGES = 5;

const QUERY = `query BlogImages($first: Int!, $after: String) {
  articles(first: $first, after: $after, active: yes) {
    edges { node { id urlHandle image } }
    pageInfo { hasNextPage endCursor }
  }
}`;

interface RawArticle {
  id: string | null;
  urlHandle: string | null;
  image: string | null;
}

let cache: {at: number; data: ArticleImageMap} | null = null;

/**
 * handle → {id, filename} for every published article, or null when the PAT is
 * missing / the call failed — callers then keep the static map. Never throws.
 */
export async function fetchArticleImages(
  env: Record<string, string | undefined>,
): Promise<ArticleImageMap | null> {
  const pat = env.CLOUDCART_ADMIN_PAT || env.CLOUDCARTADMINPAT;
  const origin = adminOrigin(env);
  if (!pat || !origin) return null;

  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;

  try {
    const out: ArticleImageMap = {};
    let after: string | null = null;

    for (let page = 0; page < MAX_PAGES; page++) {
      const data: any = await gql(origin, pat, QUERY, {first: PAGE_SIZE, after});
      const rows: RawArticle[] = (data?.articles?.edges ?? []).map((e: any) => e.node);
      for (const row of rows) {
        if (!row?.urlHandle || !row?.id) continue;
        // Статия без качена корица също влиза - с празно име на файла. Тя няма
        // да получи снимка (за нея важи статичната карта), но записът ѝ носи
        // id-то, а по него се разпознава коя статия е по-нова: датата на
        // публикуване в панела често е празна.
        out[row.urlHandle] = {id: Number(row.id), filename: row.image ?? ''};
      }
      const info = data?.articles?.pageInfo;
      if (!info?.hasNextPage || !info?.endCursor) break;
      after = info.endCursor;
    }

    cache = {at: Date.now(), data: out};
    return out;
  } catch (error) {
    console.error('blog-images: keeping the static map —', (error as Error).message);
    return cache?.data ?? null;
  }
}

async function gql(
  origin: string,
  pat: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${origin}/api/gql`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Authorization: `Bearer ${pat}`},
      body: JSON.stringify({query, variables}),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`admin api ${res.status}`);
    const json = (await res.json()) as {data?: any; errors?: Array<{message: string}>};
    if (json.errors?.length) throw new Error(json.errors[0].message);
    return json.data ?? null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Admin API host. Must be the platform service origin, never the public domain
 * once that is routed to this storefront — otherwise the worker calls itself.
 */
function adminOrigin(env: Record<string, string | undefined>): string | null {
  const origin = env.PUBLIC_API_ORIGIN || env.PUBLIC_STORE_DOMAIN;
  if (!origin) return null;
  return origin.startsWith('http') ? origin.replace(/\/$/, '') : `https://${origin}`;
}
