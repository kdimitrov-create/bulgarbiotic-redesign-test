import {entries, number, text, withinSchedule} from './builder-settings';

/**
 * The client-safe half of the page-builder's data blocks.
 *
 * Fetching lives in `builder-data.server.ts` (it needs the storefront token);
 * everything here is pure shaping, so the renderer can import it without
 * dragging server code into the browser bundle.
 */

export interface BuilderData {
  /** Products keyed by the numeric id the panel stores. */
  productsById: Record<string, any>;
  /** A pool for showcases that name no ids ("all products, newest first"). */
  productPool: any[];
  articles: any[];
  /**
   * Адресите зад връзките, зададени в конструктора, по ключ `вид:номер`.
   *
   * Панелът пази връзката на банер или слайд като двойка `link_type` +
   * `link_value`, и за продукт, категория или страница стойността е НОМЕР, не
   * адрес: `{link_type: "product", link_value: "106"}`. Дотук се вземаше само
   * стойността, тоест `href="106"` - относителен адрес, който дава 404. Оттук
   * идва готовият адрес.
   */
  linkHrefs: Record<string, string>;
}

export const EMPTY_BUILDER_DATA: BuilderData = {productsById: {}, productPool: [], articles: [], linkHrefs: {}};

/** Пътищата за видовете връзки, които панелът предлага. */
export const BUILDER_LINK_PATHS: Record<string, (handle: string) => string> = {
  product: (h) => `/product/${h}`,
  category: (h) => `/category/${h}`,
  page: (h) => `/page/${h}`,
  blog: (h) => `/blog/${h}`,
  selection: (h) => `/selection/${h}`,
};

/**
 * Адресът за един запис от конструктора (банер, слайд).
 *
 * `url` и `external` вече носят готов адрес. Останалите видове носят номер и
 * се разрешават през картата, дошла от сървъра. Не се ли разреши - по-добре
 * никаква връзка, отколкото връзка към 404.
 */
export function builderHref(
  entry: Record<string, any>,
  data?: BuilderData | null,
): string | undefined {
  const explicit = entry.link || entry.url;
  if (explicit) return String(explicit);
  const type = String(entry.link_type ?? '').trim();
  const value = entry.link_value == null ? '' : String(entry.link_value).trim();
  if (!value) return undefined;
  if (type === 'url' || type === 'external' || !type) return value;
  if (BUILDER_LINK_PATHS[type]) return data?.linkHrefs?.[`${type}:${value}`];
  // Непознат вид: пуска се само ако вече прилича на адрес.
  return /^(https?:|\/)/.test(value) ? value : undefined;
}

/** Двойките `вид:номер`, които тази страница трябва да разреши. */
export function collectBuilderLinks(design: any): Array<{type: string; id: string}> {
  const out = new Map<string, {type: string; id: string}>();
  const walk = (node: any) => {
    if (!node || typeof node !== 'object') return;
    const settings = node.settings ?? {};
    for (const key of ['banners', 'slides']) {
      for (const entry of entries(settings[key])) {
        const type = String(entry.link_type ?? '').trim();
        const value = entry.link_value == null ? '' : String(entry.link_value).trim();
        if (value && BUILDER_LINK_PATHS[type]) out.set(`${type}:${value}`, {type, id: value});
      }
    }
    for (const child of node.children ?? []) walk(child);
  };
  walk(design);
  return [...out.values()];
}

/** The products one showcase block should render, in the order it asked for. */
export function showcaseProducts(settings: Record<string, any>, data: BuilderData): any[] {
  const ids = Array.isArray(settings.filter_value) ? settings.filter_value.map(String) : [];
  if (ids.length) {
    return ids.map((id) => data.productsById[id.trim()]).filter(Boolean);
  }
  const count = Math.max(1, Math.min(24, number(settings.products) ?? 4));
  return data.productPool.slice(0, count);
}

/** Slides for a carousel block — images only, no catalogue data involved. */
export function carouselSlides(settings: Record<string, any>, data?: BuilderData | null): Array<{
  src: string;
  mobile?: string;
  link?: string;
  alt?: string;
}> {
  return entries(settings.slides)
    // „Активен от / до" от панела: слайд извън прозореца си не се рисува.
    .filter((slide) => withinSchedule(slide))
    .map((slide) => {
      const src = resolveStorage(slide.src || slide.image);
      if (!src) return null;
      return {
        src,
        mobile: resolveStorage(slide.src_mobile) || undefined,
        // The panel writes a slide's link as `link_value`; `link`/`url` are what
        // a hand-written block uses.
        link: builderHref(slide, data),
        alt: slide.alt || slide.caption || text(settings.text) || '',
      };
    })
    .filter(Boolean) as Array<{src: string; mobile?: string; link?: string; alt?: string}>;
}

/** Uploaded files are stored with a placeholder host. */
function resolveStorage(src: string | undefined): string | undefined {
  if (!src) return undefined;
  return src.replace('{storage_url}', 'https://cdncloudcart.com/');
}
