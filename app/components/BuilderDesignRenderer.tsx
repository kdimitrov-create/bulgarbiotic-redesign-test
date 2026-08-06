import {useEffect, useRef} from 'react';
import {Link} from 'react-router';
import {entries, isOn, number, text} from '~/lib/builder-settings';

/**
 * Renders CloudCart's page-builder tree into React markup.
 *
 * A page built in the panel returns `content: null` and puts everything in
 * `builderDesign`. The Storefront API hands the same tree back as a JSON string
 * in `page.body`, so this needs no admin token and works on any storefront.
 *
 *   { children: Row[] }
 *   Row    = { children: Column[], options?: { padding_top, … } }
 *   Column = { children: Block[], width?: '1'..'12' }
 *   Block  = { map: 'text' | 'banner' | …, settings: {…} }
 *
 * Covered here are the blocks that need no extra data — together they are ~95 %
 * of everything the store actually uses (measured across all 43 pages):
 *
 *   text · banner · button · code · title · video · separator
 *
 * The product and blog blocks (`product-showcase`, `showcase`,
 * `bundle-products`, `carousel`, `recent-articles`) need catalogue data loaded
 * alongside the page; they render nothing for now rather than something wrong.
 *
 * An unknown block is skipped silently — a new widget in the panel must never
 * blank out a page.
 */

type BuilderNode = {
  children?: BuilderNode[];
  options?: Record<string, unknown>;
  width?: string;
  id?: string;
  map?: string;
  settings?: Record<string, unknown>;
};

interface Props {
  design: BuilderNode | null | undefined;
}

/** Blocks that are recognised but wait on data we do not load yet. */
const DATA_BLOCKS = new Set([
  'product-showcase',
  'showcase',
  'bundle-products',
  'product',
  'add-to-cart',
  'carousel',
  'text-carousel',
  'recent-articles',
  'product_review',
  'request_review',
  'order-details',
  'store_locations',
  'cc_form',
]);

function rowStyle(node: BuilderNode): React.CSSProperties {
  const o = node.options ?? {};
  return {
    paddingTop: number(o.padding_top),
    paddingBottom: number(o.padding_bottom),
    marginTop: number(o.margin_top),
    marginBottom: number(o.margin_bottom),
  };
}

function colSpan(width: string | undefined): string {
  const w = number(width) ?? 12;
  return `bb-bd-col-${Math.max(1, Math.min(12, Math.round(w)))}`;
}

/**
 * Raw HTML from the "Код" block, with its <script> tags actually executed.
 *
 * React does not run scripts that arrive through dangerouslySetInnerHTML, so a
 * merchant pasting a working snippet would see the markup and none of the
 * behaviour. Re-creating each script node after mount is what makes the block
 * behave the way it does in the panel's preview.
 */
function CodeBlock({html}: {html: string}) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = host.current;
    if (!root) return;
    const added: HTMLScriptElement[] = [];
    for (const old of Array.from(root.querySelectorAll('script'))) {
      const script = document.createElement('script');
      for (const attr of Array.from(old.attributes)) {
        script.setAttribute(attr.name, attr.value);
      }
      script.text = old.textContent ?? '';
      old.replaceWith(script);
      added.push(script);
    }
    return () => {
      for (const s of added) s.remove();
    };
  }, [html]);

  return <div ref={host} className="bb-bd-code" dangerouslySetInnerHTML={{__html: html}} />;
}

function Banner({block}: {block: BuilderNode}) {
  const settings = block.settings ?? {};
  const list = entries(settings.banners);
  if (!list.length) return null;
  const perRow = Math.max(1, Math.min(6, number(settings.per_row) ?? 1));
  const title = text(settings.title);

  return (
    <div className="bb-bd-banners" style={{'--bb-bd-per-row': perRow} as React.CSSProperties}>
      {title && <h3 className="bb-bd-banners-title">{title}</h3>}
      {list.map((banner, i) => {
        const src = banner.src || banner.image;
        if (!src) return null;
        const img = (
          <img
            src={src}
            alt={banner.alt || banner.title || ''}
            loading="lazy"
            className="bb-bd-banner-img"
          />
        );
        const href = banner.link || banner.url;
        return (
          <div key={i} className="bb-bd-banner">
            {href ? <LinkOrAnchor href={href}>{img}</LinkOrAnchor> : img}
          </div>
        );
      })}
    </div>
  );
}

function Buttons({block}: {block: BuilderNode}) {
  const settings = block.settings ?? {};
  const list = entries(settings.buttons);
  if (!list.length) return null;
  const position = text(settings.position) || 'text-center';

  return (
    <div className={`bb-bd-buttons bb-bd-${position}`}>
      {list.map((button, i) => {
        const label = button.text || button.title;
        const href = button.link || button.url;
        if (!label || !href) return null;
        return (
          <LinkOrAnchor key={i} href={href} className="bb-bd-button">
            {label}
          </LinkOrAnchor>
        );
      })}
    </div>
  );
}

/** Internal paths go through the router; anything else is a plain anchor. */
function LinkOrAnchor({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const internal = href.startsWith('/') && !href.startsWith('//');
  if (internal) {
    return (
      <Link to={href} className={className} prefetch="intent">
        {children}
      </Link>
    );
  }
  return (
    <a
      href={href}
      className={className}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
    >
      {children}
    </a>
  );
}

function renderBlock(block: BuilderNode, idx: number): React.ReactNode {
  const settings = block.settings ?? {};
  if (!isOn(settings.enabled, true)) return null;

  switch (block.map) {
    case 'title': {
      const value = text(settings.title);
      if (!value) return null;
      const tag = (text(settings.tag) || 'h2').toLowerCase();
      const Heading = (/^h[1-6]$/.test(tag) ? tag : 'h2') as 'h2';
      return (
        <Heading key={idx} className="bb-bd-title">
          {value}
        </Heading>
      );
    }
    case 'text': {
      const html = text(settings.text);
      if (!html) return null;
      return (
        <div key={idx} className="bb-bd-text bb-prose" dangerouslySetInnerHTML={{__html: html}} />
      );
    }
    case 'code': {
      const html = text(settings.code) || text(settings.html);
      if (!html) return null;
      return <CodeBlock key={idx} html={html} />;
    }
    case 'banner':
      return <Banner key={idx} block={block} />;
    case 'button':
      return <Buttons key={idx} block={block} />;
    case 'separator': {
      const height = number(settings.height) ?? 1;
      return (
        <hr
          key={idx}
          className="bb-bd-separator"
          style={{
            borderTopStyle: (text(settings.style) as React.CSSProperties['borderTopStyle']) || 'solid',
            borderTopColor: text(settings.color) || 'rgba(10,37,64,0.12)',
            borderTopWidth: height,
            width: `${number(settings.width) ?? 100}%`,
            marginTop: number(settings.margin_top) ?? 0,
            marginBottom: number(settings.margin_bottom) ?? 0,
          }}
        />
      );
    }
    case 'video': {
      const src = text(settings.src) || text(settings.url);
      if (!src) return null;
      // The panel stores either an uploaded file (type "html5") or an embed URL.
      if ((text(settings.type) || '').toLowerCase() === 'html5') {
        return (
          <video
            key={idx}
            className="bb-bd-video-el"
            src={src}
            controls={isOn(settings.controls, true)}
            autoPlay={isOn(settings.autoplay)}
            loop={isOn(settings.loop)}
            muted={isOn(settings.autoplay)}
            playsInline
          />
        );
      }
      return (
        <div key={idx} className="bb-bd-video">
          <iframe
            src={src}
            title="Видео"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }
    case 'image': {
      const src = text(settings.image) || text(settings.src);
      if (!src) return null;
      const href = text(settings.link) || text(settings.href);
      const img = (
        <img src={src} alt={text(settings.alt) || ''} loading="lazy" className="bb-bd-image" />
      );
      return <div key={idx}>{href ? <LinkOrAnchor href={href}>{img}</LinkOrAnchor> : img}</div>;
    }
    default:
      if (block.map && !DATA_BLOCKS.has(block.map) && process.env.NODE_ENV !== 'production') {
        console.warn('builder: no renderer for block "%s"', block.map);
      }
      return null;
  }
}

function renderColumn(col: BuilderNode, idx: number): React.ReactNode {
  return (
    <div key={idx} className={`bb-bd-col ${colSpan(col.width)}`}>
      {(col.children ?? []).map((block, i) => renderBlock(block, i))}
    </div>
  );
}

function renderRow(row: BuilderNode, idx: number): React.ReactNode {
  return (
    <div key={idx} className="bb-bd-row" style={rowStyle(row)}>
      {(row.children ?? []).map((col, i) => renderColumn(col, i))}
    </div>
  );
}

/** Does this tree contain anything we can actually draw? */
export function builderHasContent(design: BuilderNode | null | undefined): boolean {
  if (!design) return false;
  let found = false;
  const walk = (node: BuilderNode) => {
    if (found) return;
    if (node.map && !DATA_BLOCKS.has(node.map)) found = true;
    for (const child of node.children ?? []) walk(child);
  };
  walk(design);
  return found;
}

/** Parse the JSON string the Storefront API returns in `page.body`. */
export function parseBuilderDesign(body: string | null | undefined): BuilderNode | null {
  if (!body) return null;
  const raw = body.trim();
  if (!raw.startsWith('{') && !raw.startsWith('[')) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as BuilderNode) : null;
  } catch {
    return null;
  }
}

export function BuilderDesignRenderer({design}: Props) {
  if (!design || !design.children) return null;
  return <div className="bb-bd">{design.children.map((row, i) => renderRow(row, i))}</div>;
}
