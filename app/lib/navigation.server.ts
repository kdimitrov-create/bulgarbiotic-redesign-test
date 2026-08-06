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

const TREE_QUERY = `query MainMenu {
  navigation(group: "main") {
    items {
      id name type linkType linkId url blank class widgetText order
      children {
        id name type linkType linkId url blank class widgetText order
        children { id name type linkType linkId url blank class widgetText order }
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

let cache: {at: number; data: NavMenu} | null = null;

/** The merchant's menu, or null when unconfigured / the call failed. Never throws. */
export async function fetchMainMenu(
  env: Record<string, string | undefined>,
): Promise<NavMenu | null> {
  const pat = env.CLOUDCART_ADMIN_PAT || env.CLOUDCARTADMINPAT;
  const origin = adminOrigin(env);
  if (!pat || !origin) return null;

  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;

  try {
    const tree = await gql(origin, pat, TREE_QUERY, {});
    const roots: RawItem[] = tree?.navigation?.items ?? [];
    if (!roots.length) return cache?.data ?? null;

    const handles = await resolveHandles(origin, pat, roots);
    const items = roots.map((item) => toNode(item, handles)).filter(Boolean) as NavNode[];

    cache = {at: Date.now(), data: {items}};
    return cache.data;
  } catch (error) {
    console.error('navigation: keeping the previous menu —', (error as Error).message);
    return cache?.data ?? null;
  }
}

/** One request that turns every (type, id) pair in the tree into a url handle. */
async function resolveHandles(
  origin: string,
  pat: string,
  roots: RawItem[],
): Promise<Record<string, string>> {
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
    return `${r.alias}${id}: ${r.query}(id: "${id}") { urlHandle }`;
  });
  const data = await gql(origin, pat, `query MenuTargets { ${fields.join(' ')} }`, {});

  const out: Record<string, string> = {};
  for (const {type, id} of wanted.values()) {
    const handle = data?.[`${RESOLVERS[type].alias}${id}`]?.urlHandle;
    if (handle) out[`${type}:${id}`] = handle;
  }
  return out;
}

function toNode(item: RawItem, handles: Record<string, string>): NavNode | null {
  if (!item?.name) return null;
  const children = (item.children ?? [])
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((child) => toNode(child, handles))
    .filter(Boolean) as NavNode[];

  const type = item.linkType ?? item.type ?? '';
  const resolver = RESOLVERS[type];
  const handle = item.linkId ? handles[`${type}:${item.linkId}`] : undefined;

  // A group has no target of its own — point it at its first child so the
  // header link still goes somewhere sensible when clicked.
  const ownUrl = resolver && handle ? resolver.path(handle) : item.url || null;
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
