/**
 * Renders CloudCart's page-builder JSON tree into React markup.
 *
 * Many CMS pages on bulgarbiotic.bg are built via the visual Page Builder
 * (NOT classic rich-text). Those pages return `content: null` but populate
 * `builderDesign` with a tree like:
 *
 *   { children: Row[] }
 *   Row    = { children: Column[], options?: { padding_top, padding_bottom, ... } }
 *   Column = { children: Block[], width?: string }   // Bootstrap-like 1-12 grid
 *   Block  = { id, map: 'text' | 'image' | 'video' | 'spacer' | ...,
 *              settings: { enabled, text, src, href, ... } }
 *
 * We render the most common block types:
 *   • text   → HTML injected with dangerouslySetInnerHTML (server-provided)
 *   • image  → <img> with optional <a> wrapper
 *   • spacer → vertical gap div
 *
 * Unknown blocks are silently skipped so we don't crash on rare types.
 */

type BuilderNode = {
  children?: BuilderNode[];
  options?: {
    padding_top?: string | number;
    padding_bottom?: string | number;
    margin_top?: string | number;
    margin_bottom?: string | number;
    type?: string;
  };
  width?: string;
  id?: string;
  map?: string;
  settings?: Record<string, unknown>;
};

interface Props {
  design: BuilderNode | null | undefined;
}

const num = (v: unknown): number | undefined => {
  if (v == null) return undefined;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return isFinite(n) ? n : undefined;
};

const str = (v: unknown): string | undefined => {
  if (typeof v === 'string' && v.length > 0) return v;
  return undefined;
};

function rowStyle(node: BuilderNode): React.CSSProperties {
  const o = node.options ?? {};
  return {
    paddingTop: num(o.padding_top),
    paddingBottom: num(o.padding_bottom),
    marginTop: num(o.margin_top),
    marginBottom: num(o.margin_bottom),
  };
}

function colSpan(width: string | undefined): string {
  // Bootstrap-style 1-12 → tailwind grid-cols-12 spans; default span-12.
  const w = num(width) ?? 12;
  return `bb-bd-col-${Math.max(1, Math.min(12, Math.round(w)))}`;
}

function renderBlock(block: BuilderNode, idx: number): React.ReactNode {
  const settings = block.settings ?? {};
  const enabled = settings.enabled ?? '1';
  if (enabled !== '1' && enabled !== 1 && enabled !== true) return null;

  switch (block.map) {
    case 'text': {
      const html = str(settings.text);
      if (!html) return null;
      return (
        <div
          key={idx}
          className="bb-bd-text bb-prose"
          dangerouslySetInnerHTML={{__html: html}}
        />
      );
    }
    case 'image': {
      const src = str(settings.image) || str(settings.src);
      if (!src) return null;
      const href = str(settings.link) || str(settings.href);
      const alt = str(settings.alt) || '';
      const img = <img src={src} alt={alt} loading="lazy" className="bb-bd-image" />;
      if (href) {
        return (
          <a key={idx} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">
            {img}
          </a>
        );
      }
      return <div key={idx}>{img}</div>;
    }
    case 'spacer':
    case 'separator': {
      const h = num(settings.height) ?? 24;
      return <div key={idx} style={{height: h}} />;
    }
    case 'video': {
      const src = str(settings.url) || str(settings.src);
      if (!src) return null;
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
    case 'html': {
      const html = str(settings.html) || str(settings.text);
      if (!html) return null;
      return (
        <div key={idx} className="bb-bd-html" dangerouslySetInnerHTML={{__html: html}} />
      );
    }
    default:
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

export function BuilderDesignRenderer({design}: Props) {
  if (!design || !design.children) return null;
  return (
    <div className="bb-bd">
      {design.children.map((row, i) => renderRow(row, i))}
    </div>
  );
}
