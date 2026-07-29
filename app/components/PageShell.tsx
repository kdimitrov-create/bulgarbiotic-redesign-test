import type {ReactNode} from 'react';
import {Link} from 'react-router';
import {Breadcrumbs} from './Breadcrumbs';

interface Props {
  title: string;
  tag?: string;
  /** Short hand-written sub-title under the H1 — designed for human eyes.
   *  Do NOT pass the SEO description here (that's for the <meta> tag only).
   *  Keep ≤ 140 chars; longer text belongs in the page body. */
  lead?: string;
  /** Background image for the hero — defaults to the brand pastel gradient. */
  heroImage?: string;
  /** Breadcrumb trail above the hero. The current page is appended automatically. */
  breadcrumbs?: Array<{title: string; to?: string}>;
  children: ReactNode;
  /** Optional sidebar slot rendered on desktop next to the main column. */
  sidebar?: ReactNode;
  /**
   * Variant tweak:
   *   - "narrow"  — 720px text column (legal pages, articles)
   *   - "wide"    — full container width (landings, marketing pages)
   *   - "barebones" — wide + suppresses the default hero (when the content
   *                   provides its own custom manifesto / hero section)
   */
  variant?: 'narrow' | 'wide' | 'barebones';
}

/**
 * Reusable shell for every static / CMS page. Handles:
 *   • Breadcrumbs with the current page appended
 *   • Brand hero (gradient + optional bg image, tag pill, H1, lead)
 *   • Centered content column with prose typography
 *   • Optional right-side sidebar (only renders if provided)
 *
 * Used by /pages/$handle as the default wrapper. Custom layouts (Disneyland
 * giveaway, media press list) compose this same shell with their own children.
 */
export function PageShell({
  title,
  tag,
  lead,
  heroImage,
  breadcrumbs = [],
  children,
  sidebar,
  variant = 'narrow',
}: Props) {
  const trail = [...breadcrumbs, {title}];

  const heroStyle = heroImage
    ? {
        backgroundImage: `linear-gradient(135deg, rgba(245, 239, 227, 0.88), rgba(253, 238, 243, 0.78)), url(${heroImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : undefined;

  const showHero = variant !== 'barebones';
  const bodyVariant = variant === 'barebones' ? 'wide' : variant;

  return (
    <div className="bb-page">
      <Breadcrumbs items={trail} />

      {showHero && (
        <header className="bb-page-hero" style={heroStyle}>
          <div className="bb-page-hero-inner">
            {tag && <span className="bb-page-hero-tag">{tag}</span>}
            <h1 className="bb-page-hero-h1">{title}</h1>
            {lead && <p className="bb-page-hero-lead">{lead}</p>}
          </div>
        </header>
      )}

      <div className={`bb-page-body bb-page-body--${bodyVariant}${sidebar ? ' bb-page-body--with-aside' : ''}`}>
        <article className={`bb-page-content${bodyVariant === 'narrow' ? ' bb-prose' : ''}`}>{children}</article>
        {sidebar && <aside className="bb-page-aside">{sidebar}</aside>}
      </div>
    </div>
  );
}

/** Standalone "back to home" link used at the bottom of legal / 404 pages. */
export function PageBackLink() {
  return (
    <Link to="/" className="bb-page-back" prefetch="intent">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
      </svg>
      Обратно към началната страница
    </Link>
  );
}
