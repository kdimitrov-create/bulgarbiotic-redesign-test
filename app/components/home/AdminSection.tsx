import {Link} from 'react-router';
import {entries, isOn, number, text as str} from '~/lib/builder-settings';
import {liveModule, type ThemeModule} from '~/lib/theme-modules';
import {ProductCard} from '~/components/ProductCard';

/**
 * Homepage sections the merchant owns.
 *
 * Each one is a theme module from Дизайн → Модули, drawn in our design: the
 * panel supplies the words, the images and which products; the layout, type and
 * spacing stay here.
 *
 * ⚠️ Rendering is opt-in per module (`ENABLED_MODULES`), not simply "whatever
 * is switched on in the panel". On this store several of those modules still
 * hold markup written for the OLD classic theme — Bootstrap `col-md-*` grids,
 * `_grid-section` wrappers and leftover Halloween artwork — and dropping that
 * into the redesign would wreck the page. A module joins the list once its
 * content has been rewritten for the new design.
 */

/** Modules cleared for the new homepage. Add a mapping key once its content is ready. */
const ENABLED_MODULES = new Set<string>([]);

/** The panel stores uploaded files with a placeholder instead of the CDN host. */
export function resolveStorageUrl(src: string | undefined): string | undefined {
  if (!src) return undefined;
  return src.replace('{storage_url}', 'https://cdncloudcart.com/');
}

function allowed(mapping: string): ThemeModule | null {
  if (!ENABLED_MODULES.has(mapping)) return null;
  return liveModule(mapping);
}

/** A free text block the merchant writes, optionally over a background image. */
export function AdminText({mapping, background}: {mapping: string; background?: string}) {
  const mod = allowed(mapping);
  const html = str(mod?.settings?.text);
  if (!html) return null;

  const bg = background ? liveModule(background) : null;
  const image = resolveStorageUrl(str(bg?.settings?.src));
  const title = str(mod?.settings?.title);

  return (
    <section
      className={`bb-adm-text${image ? ' bb-adm-text--bg' : ''}`}
      style={image ? {backgroundImage: `url("${image}")`} : undefined}
    >
      <div className="bb-container">
        {title && <h2 className="bb-adm-text-title">{title}</h2>}
        <div className="bb-adm-text-body bb-prose" dangerouslySetInnerHTML={{__html: html}} />
      </div>
    </section>
  );
}

/** A row of banners, each optionally linking somewhere. */
export function AdminBanners({mapping}: {mapping: string}) {
  const mod = allowed(mapping);
  if (!mod) return null;
  const list = entries(mod.settings?.banners);
  if (!list.length) return null;

  const perRow = Math.max(1, Math.min(4, number(mod.settings?.per_row) ?? list.length));
  const title = str(mod.settings?.title);

  return (
    <section className="bb-adm-banners">
      <div className="bb-container">
        {title && <h2 className="bb-adm-banners-title">{title}</h2>}
        <div className="bb-adm-banners-grid" style={{'--bb-adm-per-row': perRow} as React.CSSProperties}>
          {list.map((banner, i) => {
            const src = resolveStorageUrl(banner.src || banner.image);
            if (!src) return null;
            const img = (
              <img src={src} alt={banner.alt || banner.title || ''} loading="lazy" />
            );
            const href = banner.link || banner.url;
            return (
              <div className="bb-adm-banner" key={i}>
                {href ? <LinkOut href={href}>{img}</LinkOut> : img}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/**
 * A product showcase.
 *
 * The module says how many products, in what order and filtered how; the
 * matching products are loaded by the homepage route and handed in, because a
 * component cannot query the storefront on its own.
 */
export function AdminShowcase({
  mapping,
  products,
}: {
  mapping: string;
  products: any[] | undefined;
}) {
  const mod = allowed(mapping);
  if (!mod || !products?.length) return null;
  const title = str(mod.settings?.title);
  const perRow = Math.max(2, Math.min(5, number(mod.settings?.per_row) ?? 4));

  return (
    <section className="bb-adm-showcase">
      <div className="bb-container">
        {title && <h2 className="bb-adm-showcase-title">{title}</h2>}
        <div
          className="bb-adm-showcase-grid"
          style={{'--bb-adm-per-row': perRow} as React.CSSProperties}
        >
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

/** Which products a showcase module is asking for — read by the route loader. */
export function showcaseRequest(mapping: string): {
  count: number;
  onlyNew: boolean;
  onlySale: boolean;
  handles: string[];
} | null {
  const mod = allowed(mapping);
  if (!mod) return null;
  const s = mod.settings ?? {};
  const filterValue = Array.isArray(s.filter_value) ? s.filter_value.map(String) : [];
  return {
    count: Math.max(1, Math.min(24, number(s.products) ?? 4)),
    onlyNew: String(s.new ?? 'both') === 'yes',
    onlySale: String(s.sale ?? 'both') === 'yes',
    handles: filterValue,
  };
}

function LinkOut({href, children}: {href: string; children: React.ReactNode}) {
  const internal = href.startsWith('/') && !href.startsWith('//');
  return internal ? (
    <Link to={href} prefetch="intent">
      {children}
    </Link>
  ) : (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

/** Is any merchant-owned homepage section switched on at all? */
export function hasAdminSections(): boolean {
  for (const mapping of ENABLED_MODULES) {
    if (liveModule(mapping)) return true;
  }
  return false;
}

export const ADMIN_HOMEPAGE_MODULES = ENABLED_MODULES;
export {isOn};
