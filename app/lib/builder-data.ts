import {entries, number, text} from './builder-settings';

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
}

export const EMPTY_BUILDER_DATA: BuilderData = {productsById: {}, productPool: [], articles: []};

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
export function carouselSlides(settings: Record<string, any>): Array<{
  src: string;
  mobile?: string;
  link?: string;
  alt?: string;
}> {
  return entries(settings.slides)
    .map((slide) => {
      const src = resolveStorage(slide.src || slide.image);
      if (!src) return null;
      return {
        src,
        mobile: resolveStorage(slide.src_mobile) || undefined,
        link: slide.link || slide.url || undefined,
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
