/**
 * The main menu, read live from the admin panel so the storefront mirrors
 * Дизайн → Навигация (client 2026-08-04: "промените по навигацията в админ
 * панела да се отразяват в клиентската част").
 *
 * Two steps, because the admin returns *what* an item points at, not *where*:
 *   1. `navigation(group:"main")` → the tree, each item carrying
 *      `linkType` + `linkId` (category 4, product 67, page 44 …). `route` and
 *      `linkFormatted` come back null, so there is no ready-made URL.
 *   2. one batched, aliased request resolves every id to its `urlHandle`,
 *      which is what our routes are keyed by.
 *
 * SERVER ONLY — the `.server.ts` suffix keeps the PAT out of the client bundle.
 */
import type {NavMenu, NavNode} from './navigation';

// 30 s, same as the discount cache: the merchant edits the menu in the panel and
// expects to see it on the next refresh, not in five minutes. Still not zero —
// every page render reads this.
const CACHE_TTL_MS = 30 * 1000;
const REQUEST_TIMEOUT_MS = 8000;

const FIELDS = 'id name type linkType linkId url blank class widgetText order';

const treeQuery = (group: string) => `query NavMenu {
  navigation(group: "${group}") {
    items {
      ${FIELDS}
      children {
        ${FIELDS}
        children { ${FIELDS} }
      }
    }
  }
}`;

/** Admin query + storefront path for every link type the panel can produce. */
const RESOLVERS: Record<string, {alias: string; query: string; path: (handle: string) => string}> = {
  category: {alias: 'c', query: 'category', path: (h) => `/category/${h}`},
  product: {alias: 'p', query: 'product', path: (h) => `/product/${h}`},
  page: {alias: 'g', query: 'page', path: (h) => `/page/${h}`},
  blog: {alias: 'b', query: 'blogCategory', path: (h) => `/blog/${h}`},
  selection: {alias: 's', query: 'smartCollection', path: (h) => `/selection/${h}`},
};

interface RawItem {
  id: string;
  name: string;
  type: string | null;
  linkType: string | null;
  linkId: string | null;
  url: string | null;
  blank: boolean | null;
  class: string | null;
  widgetText: string | null;
  order: number | null;
  children?: RawItem[];
}

/** One cache per group: the header and the footer are separate menus. */
const cache = new Map<string, {at: number; data: NavMenu}>();

/** A menu group from the panel, or null when unconfigured / the call failed. */
export async function fetchNavMenu(
  env: Record<string, string | undefined>,
  group: string,
): Promise<NavMenu | null> {
  const pat = env.CLOUDCART_ADMIN_PAT || env.CLOUDCARTADMINPAT;
  const origin = adminOrigin(env);
  if (!pat || !origin) return null;

  const cached = cache.get(group);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;

  try {
    const tree = await gql(origin, pat, treeQuery(group), {});
    const roots: RawItem[] = tree?.navigation?.items ?? [];
    if (!roots.length) return cached?.data ?? null;

    const handles = await resolveHandles(origin, pat, roots);
    const items = roots.map((item) => toNode(item, handles)).filter(Boolean) as NavNode[];

    const data = {items};
    cache.set(group, {at: Date.now(), data});
    return data;
  } catch (error) {
    console.error('navigation(%s): keeping the previous menu —', group, (error as Error).message);
    return cached?.data ?? null;
  }
}

/** Дизайн → Навигация, главното меню. */
export function fetchMainMenu(env: Record<string, string | undefined>) {
  return fetchNavMenu(env, 'main');
}

/** Дизайн → Навигация, менюто на футъра. Each group is one footer column. */
export function fetchFooterMenu(env: Record<string, string | undefined>) {
  return fetchNavMenu(env, 'footer');
}

/** What one batched lookup gives back for a linked entity. */
interface Target {
  handle: string;
  /** Products only — used by the "Препоръчано" card. */
  image?: string | null;
  blurb?: string | null;
}

/** One request that turns every (type, id) pair in the tree into a url handle. */
async function resolveHandles(
  origin: string,
  pat: string,
  roots: RawItem[],
): Promise<Record<string, Target>> {
  const wanted = new Map<string, {type: string; id: string}>();
  const walk = (items: RawItem[]) => {
    for (const item of items) {
      const type = item.linkType ?? item.type ?? '';
      if (item.linkId && RESOLVERS[type]) {
        wanted.set(`${type}:${item.linkId}`, {type, id: item.linkId});
      }
      if (item.children?.length) walk(item.children);
    }
  };
  walk(roots);
  if (!wanted.size) return {};

  const fields = [...wanted.values()].map(({type, id}) => {
    const r = RESOLVERS[type];
    // A product also gives up its photo and short description, so the featured
    // card can be authored entirely in the panel: pick the product, and its own
    // admin content fills the card.
    const extra = type === 'product' ? ' imageUrl shortDescription' : '';
    return `${r.alias}${id}: ${r.query}(id: "${id}") { urlHandle${extra} }`;
  });
  const data = await gql(origin, pat, `query MenuTargets { ${fields.join(' ')} }`, {});

  const out: Record<string, Target> = {};
  for (const {type, id} of wanted.values()) {
    const row = data?.[`${RESOLVERS[type].alias}${id}`];
    if (row?.urlHandle) {
      out[`${type}:${id}`] = {
        handle: row.urlHandle,
        image: cardImage(row.imageUrl),
        blurb: stripHtml(row.shortDescription),
      };
    }
  }
  return out;
}

/**
 * The admin hands back a 150 px thumbnail, which is soft in the mega-menu card.
 * Ask the CDN for a size that survives a retina screen instead.
 */
function cardImage(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('width', '400');
    parsed.searchParams.set('height', '400');
    return parsed.toString();
  } catch {
    return url;
  }
}

/** The panel stores the short description as HTML; the card wants a sentence. */
function stripHtml(value: string | null | undefined): string | null {
  if (!value) return null;
  const text = value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  return text || null;
}

function toNode(item: RawItem, handles: Record<string, Target>): NavNode | null {
  if (!item?.name) return null;
  const children = (item.children ?? [])
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((child) => toNode(child, handles))
    .filter(Boolean) as NavNode[];

  const type = item.linkType ?? item.type ?? '';
  const resolver = RESOLVERS[type];
  const target = item.linkId ? handles[`${type}:${item.linkId}`] : undefined;

  // A group has no target of its own — point it at its first child so the
  // header link still goes somewhere sensible when clicked.
  const ownUrl = resolver && target ? resolver.path(target.handle) : item.url || null;
  const url = ownUrl ?? children.find((c) => c.url)?.url ?? null;

  return {
    id: String(item.id),
    title: item.name,
    url,
    blank: Boolean(item.blank),
    // The panel lets the merchant paste HTML; that is how the rich mega-menu
    // blocks are authored without a redeploy.
    html: item.widgetText || null,
    className: item.class || null,
    image: target?.image ?? null,
    blurb: target?.blurb ?? null,
    children,
  };
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
