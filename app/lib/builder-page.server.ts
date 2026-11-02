import {adminGql, adminListAll, adminOrigin, adminPat} from './admin-api.server';

/**
 * Pages built in the panel's Page Builder, read from the Admin API.
 *
 * Since October 2026 the Storefront API answers `page: null` for every page of
 * `type: builder` — by handle, by id and in the `pages` list, on every API
 * version — while the admin still lists them as active. The page route turned
 * that into a 404 (detox-boost, longevity-bactology and eight unlinked pages).
 *
 * The admin still serves them, so when the Storefront has nothing we rebuild
 * the same `{id, title, handle, body}` the Storefront used to hand back, with
 * the design tree serialised into `body` — which is exactly what the renderer
 * already parses.
 *
 * Only what the merchant PUBLISHED is served: `pageHistoryVersion` for the
 * `publishedHistoryId`, never the latest draft.
 *
 * Admin load stays small on purpose (the storefront once 429'd the admin
 * panel): one cached list of pages, so an unknown handle costs nothing, and
 * one request for the design of a page that really exists. Both go through the
 * shared cache. Never throws — at worst the page stays a 404, as before.
 *
 * SERVER ONLY: `.server.ts` keeps the PAT out of the client bundle.
 */

interface Row {
  id: string;
  name: string | null;
  urlHandle: string | null;
  type: string | null;
  active: unknown;
  hidden: unknown;
  private: unknown;
  systemPage: string | null;
  publishedHistoryId: string | null;
  seoDescription: string | null;
}

export interface BuilderPage {
  id: string;
  title: string;
  handle: string;
  /** The published design tree as JSON text, like the Storefront body was. */
  body: string;
  seoDescription?: string;
}

const FIELDS =
  'id name urlHandle type active hidden private systemPage publishedHistoryId seoDescription';

const DESIGN_QUERY = `query PublishedPageDesign($pageId: ID!, $historyId: ID!) {
  pageHistoryVersion(pageId: $pageId, historyId: $historyId) { design published }
}`;

const LIST_TTL_MS = 60 * 1000;

let cache: {at: number; rows: Row[]} | null = null;

/** The admin writes booleans as "yes"/"no"; tolerate real booleans too. */
function isYes(value: unknown): boolean {
  return ['yes', 'true', '1'].includes(String(value).toLowerCase());
}

async function listPages(origin: string, pat: string): Promise<Row[]> {
  if (cache && Date.now() - cache.at < LIST_TTL_MS) return cache.rows;
  try {
    const rows = await adminListAll<Row>(origin, pat, {
      root: 'pages',
      nodeFields: FIELDS,
      label: 'builder pages',
    });
    cache = {at: Date.now(), rows};
    return rows;
  } catch (error) {
    console.warn('builder pages: keeping the previous list —', (error as Error).message);
    // Stamp the failure too, so an admin outage costs one call a minute, not one per page view.
    cache = {at: Date.now(), rows: cache?.rows ?? []};
    return cache.rows;
  }
}

export async function fetchBuilderPage(
  env: Record<string, string | undefined> | undefined,
  handle: string,
  options: {home?: boolean} = {},
): Promise<BuilderPage | null> {
  const pat = adminPat(env);
  const origin = adminOrigin(env);
  if (!pat || !origin) return null;

  try {
    const row = (await listPages(origin, pat)).find((r) => r.urlHandle === handle);
    // Same visibility rules the storefront applies to any page: off, hidden,
    // private and system pages (home, 404, …) are never served from here.
    // The one exception is the homepage, asked for explicitly by `_index.tsx`
    // (`{home: true}`): its slider lives in this design.
    const systemOk = options.home ? row?.systemPage === 'home' : !row?.systemPage;
    if (
      !row ||
      row.type !== 'builder' ||
      !isYes(row.active) ||
      isYes(row.hidden) ||
      isYes(row.private) ||
      !systemOk ||
      !row.publishedHistoryId
    ) {
      return null;
    }

    const data = await adminGql<{
      pageHistoryVersion: {design: unknown; published: unknown} | null;
    }>(origin, pat, DESIGN_QUERY, {pageId: row.id, historyId: row.publishedHistoryId});
    const version = data?.pageHistoryVersion;
    if (!version || !isYes(version.published)) return null;
    if (!version.design || typeof version.design !== 'object') return null;

    return {
      id: String(row.id),
      title: row.name || handle,
      handle,
      body: JSON.stringify(version.design),
      seoDescription: row.seoDescription || undefined,
    };
  } catch (error) {
    console.warn(`builder pages: could not read "${handle}" —`, (error as Error).message);
    return null;
  }
}
