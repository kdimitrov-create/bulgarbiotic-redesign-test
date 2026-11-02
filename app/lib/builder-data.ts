import {entries, isOn, number, text, withinSchedule} from './builder-settings';

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
/**
 * Слайдовете на въртележката от началната, както са насрочени в панела.
 *
 * Витрината рисуваше пет зашити банера, а в панела насрочените са два - другите
 * три са с изтекъл прозорец (проверено 17.08.2026: слайд 3 свършва в 09:26,
 * слайд 4 на 06.08, слайд 5 на 09.07). Оттук нататък банерите идват от панела и
 * се сменят сами: сложи ли търговецът нов с дати, витрината го показва точно в
 * неговия прозорец, без промяна в кода.
 *
 * Търси се ПЪРВАТА въртележка в дървото - тя е героят на страницата.
 */
export function heroSlidesFromDesign(
  design: any,
  data?: BuilderData | null,
  storeDomain?: string | null,
): Array<{
  desktop: string;
  mobile?: string;
  link?: string;
  target?: string;
}> {
  let block: any = null;
  const walk = (node: any) => {
    if (block || !node) return;
    if (Array.isArray(node)) {
      for (const child of node) walk(child);
      return;
    }
    if (typeof node !== 'object') return;
    if (node.map === 'carousel' && node.settings) {
      block = node;
      return;
    }
    for (const value of Object.values(node)) walk(value);
  };
  walk(design);
  if (!block) return [];
  // Изключена въртележка не се показва, дори да има насрочени слайдове.
  if (block.settings?.enabled != null && !isOn(block.settings.enabled, true)) return [];
  /* ⚠️ Ключовете се преименуват тук нарочно. Конструкторът нарича широкия
     банер `src`, а слайдерът чака `desktop` - подаден както си е, `<img>`
     оставаше без адрес и на телефон се виждаше само `<source>`. Оттам „точките
     са верни, а картинки няма". */
  return carouselSlides(block.settings, data).map((slide) => ({
    desktop: slide.src,
    mobile: slide.mobile,
    link: internalise(slide.link, storeDomain),
    target: slide.target,
  }));
}

/**
 * Адрес към собствения магазин става вътрешен път.
 *
 * Панелът пази връзката както я е написал търговецът - слайд 1 е с пълен адрес
 * `https://bulgarbiotic.bg/category/all-products`. Слайдерът смята за външно
 * всичко, което не започва с наклонена черта, и го отваря В НОВ ПРОЗОРЕЦ, при
 * все че в панела пише „същия прозорец". Свален до път, адресът си остава
 * същият, но отварянето е в същия раздел и през маршрутизатора.
 */
export function internalise(href: string | undefined, storeDomain?: string | null): string | undefined {
  if (!href) return href;
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return href; // вече е път
  }
  const own = String(storeDomain ?? '').replace(/^https?:\/\//, '').replace(/\/+$/, '').toLowerCase();
  const host = url.host.toLowerCase().replace(/^www\./, '');
  const mine = own.replace(/^www\./, '');
  if (!mine || host !== mine) return href;
  return `${url.pathname}${url.search}${url.hash}` || '/';
}

export function carouselSlides(settings: Record<string, any>, data?: BuilderData | null): Array<{
  src: string;
  mobile?: string;
  link?: string;
  alt?: string;
  /** „Същия прозорец" / „нов прозорец", както е избрано в панела. */
  target?: string;
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
        target: slide.target ? String(slide.target) : undefined,
      };
    })
    .filter(Boolean) as Array<{src: string; mobile?: string; link?: string; alt?: string}>;
}

/** Uploaded files are stored with a placeholder host. */
function resolveStorage(src: string | undefined): string | undefined {
  if (!src) return undefined;
  return src.replace('{storage_url}', 'https://cdncloudcart.com/');
}
