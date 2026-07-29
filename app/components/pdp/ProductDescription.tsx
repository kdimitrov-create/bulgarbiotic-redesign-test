import {useState, useEffect, useRef, type ReactNode} from 'react';
import {RichText} from '@cloudcart/nitro-react';
import {MedicalStudies} from '../MedicalStudies';
import {parseProductDescription} from '~/lib/parse-product-description';
import {PRODUCT_DESCRIPTIONS} from '~/lib/product-descriptions';

/**
 * Product description — standalone section rendered HIGH on the PDP (client
 * reorder: "описанието най-горе"). Extracted from the old ProductTabs
 * "Описание" tab so it is always visible (not hidden behind a tab) and behaves
 * the same on desktop & mobile. Long CMS copy still collapses with a
 * "Прочети цялото описание" toggle (client 5b — read more).
 */
const proseClass =
  'prose prose-sm prose-gray max-w-none [&_p]:my-3 [&_ul]:my-3 [&_li]:my-1 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:font-bold [&_h3]:mt-4';

/**
 * Pull the first embedded video (YouTube/Vimeo iframe) out of the CMS
 * description HTML so it survives when we replace the description text with a
 * per-product override (the video sits directly above the text). Returns a
 * responsive wrapper, or null if the CMS description has no video.
 */
function extractVideoHtml(html?: string): string | null {
  if (!html) return null;
  // Matches YouTube/Vimeo embeds AND CloudCart's self-hosted .mp4 iframes.
  const m = html.match(
    /<iframe\b[^>]*(?:youtube|youtu\.be|vimeo|\.mp4|\/video\/)[^>]*>[\s\S]*?<\/iframe>/i,
  );
  return m ? `<div class="bb-desc-video">${m[0]}</div>` : null;
}

export function ProductDescription({
  descriptionHtml,
  heroImageUrl,
  heroTitle,
  handle,
}: {
  descriptionHtml?: string;
  heroImageUrl?: string;
  heroTitle?: string;
  handle?: string;
}) {
  // Client (2026-07): per-product description override from the Google Doc.
  // When present, it replaces the CloudCart CMS description TEXT in this section
  // — but we keep the product VIDEO that was embedded in the CMS description
  // (it sits directly above the text), extracting it so it survives the swap.
  const override = handle ? PRODUCT_DESCRIPTIONS[handle] : undefined;
  const overrideVideo = override ? extractVideoHtml(descriptionHtml) : null;
  if (!override && !descriptionHtml) return null;
  const parsed = override ? null : parseProductDescription(descriptionHtml!);

  return (
    <section id="description" className="bb-pdp-tabs-wrap">
      <div className="bb-pdp-tabs">
        {heroImageUrl && (
          <div className="bb-desc-hero">
            <img src={heroImageUrl} alt={heroTitle || 'Bactology'} loading="lazy" />
            {heroTitle && (
              <div className="bb-desc-hero-caption">
                <span className="bb-desc-hero-tag">За продукта</span>
                <h2 className="bb-desc-hero-title">{heroTitle}</h2>
              </div>
            )}
          </div>
        )}
        {override ? (
          <CollapsibleDescription>
            {overrideVideo && <div dangerouslySetInnerHTML={{__html: overrideVideo}} />}
            <div className={proseClass} dangerouslySetInnerHTML={{__html: override}} />
          </CollapsibleDescription>
        ) : (
          <>
            {parsed!.before && (
              <CollapsibleDescription>
                <RichText data={parsed!.before} className={proseClass} />
              </CollapsibleDescription>
            )}
            {parsed!.studies.length > 0 && (
              <MedicalStudies
                title={parsed!.studiesTitle}
                subtitle={parsed!.studiesSubtitle}
                studies={parsed!.studies}
              />
            )}
            {parsed!.after && (
              <CollapsibleDescription>
                <RichText data={parsed!.after} className={proseClass} />
              </CollapsibleDescription>
            )}
          </>
        )}
      </div>
    </section>
  );
}

/**
 * Collapses long CMS descriptions to a smart preview with a "Прочети цялото
 * описание" toggle (client 5b). Clamp anchors to the first video (if any) or a
 * fallback height so several paragraphs are visible before the fade.
 */
function CollapsibleDescription({children}: {children: ReactNode}) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [clampPx, setClampPx] = useState<number | null>(null);
  const FALLBACK_CLAMP = 1200;
  const POST_VIDEO_BUFFER = 700;
  const MIN_HIDDEN_EXTRA = 200;

  useEffect(() => {
    if (!innerRef.current) return;
    const measure = () => {
      const root = innerRef.current;
      if (!root) return;
      const total = root.scrollHeight;
      const firstIframe = root.querySelector<HTMLIFrameElement>(
        'iframe[src*="youtube"], iframe[src*="youtu.be"], iframe[src*="vimeo"]',
      );
      let threshold = FALLBACK_CLAMP;
      if (firstIframe) {
        const rootTop = root.getBoundingClientRect().top;
        const iframeRect = firstIframe.getBoundingClientRect();
        const iframeBottomFromRoot = iframeRect.bottom - rootTop;
        threshold = Math.round(iframeBottomFromRoot + POST_VIDEO_BUFFER);
      }
      if (total <= threshold + MIN_HIDDEN_EXTRA) {
        setClampPx(null);
      } else {
        setClampPx(threshold);
      }
    };
    measure();
    const t1 = setTimeout(measure, 600);
    const t2 = setTimeout(measure, 1800);
    window.addEventListener('resize', measure);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', measure);
    };
  }, [children]);

  const needsClamp = clampPx !== null;

  return (
    <div className="bb-coll">
      <div
        ref={innerRef}
        className={`bb-coll-body${needsClamp && !open ? ' bb-coll-clamped' : ''}`}
        style={needsClamp && !open ? {maxHeight: clampPx} : undefined}
      >
        {children}
      </div>
      {needsClamp && (
        <button
          type="button"
          className="bb-coll-toggle"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          {open ? 'Покажи по-малко' : 'Прочети цялото описание'}
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s'}}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      )}
    </div>
  );
}
