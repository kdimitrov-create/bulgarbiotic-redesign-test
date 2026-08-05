import {useEffect, useState} from 'react';

interface Section {
  id: string;
  label: string;
}

interface Props {
  sections?: Section[];
}

/**
 * Order and wording set by the client (2026-08-05). "Описание" used to point
 * at the tabbed block far down the page instead of the description itself —
 * it now lands on the description, and "Ползи" / "Съставки" jump to the exact
 * spots that cover them.
 */
const DEFAULT_SECTIONS: Section[] = [
  {id: 'description', label: 'Описание'},
  {id: 'benefits', label: 'Ползи'},
  {id: 'ingredients', label: 'Съставки'},
  {id: 'usage', label: 'Начин на употреба'},
  {id: 'faq', label: 'Често задавани въпроси'},
  {id: 'reviews', label: 'Отзиви'},
];

/**
 * The merchant writes the description in the admin panel, so its "Състав"
 * heading carries no id — and not every product even has one (Femin does,
 * Пакет Beauty does not). Tag the first heading that announces it so
 * "Съставки" has somewhere to land; products without one lose the link.
 */
function ensureIngredientsAnchor() {
  if (document.getElementById('ingredients')) return;
  const root = document.getElementById('description');
  if (!root) return;
  for (const el of Array.from(root.querySelectorAll('h1,h2,h3,h4,h5,h6,strong,b'))) {
    const text = (el.textContent ?? '').trim();
    // Short line starting with "Състав" — a heading, not a sentence that
    // happens to mention the word.
    if (text.length <= 80 && /^състав/i.test(text)) {
      const target = (el.closest('p') ?? el) as HTMLElement;
      target.id = 'ingredients';
      return;
    }
  }
}

/**
 * Sticky horizontal anchor nav that appears AFTER the user scrolls past the
 * main buy box — gives them a TOC-style jump to deep sections without
 * scrolling back up. Highlights the active section via IntersectionObserver.
 *
 * Lives directly under the hero (above the long-form sections). Each link
 * scrolls smoothly to a `<section id="...">` further down the PDP.
 */
export function SectionAnchorNav({sections = DEFAULT_SECTIONS}: Props = {}) {
  const [active, setActive] = useState<string>('');
  const [stuck, setStuck] = useState<boolean>(false);
  // Not every product has every section — "Съставки" only exists when the
  // merchant's description actually carries a Състав heading, and a product
  // with no reviews renders no reviews block. A link that scrolls nowhere is
  // worse than no link, so anything without a target is dropped once mounted.
  const [present, setPresent] = useState<string[] | null>(null);

  useEffect(() => {
    ensureIngredientsAnchor();
    setPresent(sections.filter((s) => document.getElementById(s.id)).map((s) => s.id));
  }, [sections]);

  const visibleSections = present ? sections.filter((s) => present.includes(s.id)) : sections;

  // Track which section is in viewport to highlight the matching tab
  useEffect(() => {
    const validIds = sections.map((s) => s.id);
    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the topmost entry that's currently intersecting
        const visible = entries
          .filter((e) => e.isIntersecting && validIds.includes(e.target.id))
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActive(visible[0].target.id);
      },
      {rootMargin: '-30% 0px -60% 0px', threshold: 0},
    );
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sections]);

  // Pin / un-pin shadow toggle on scroll.
  // Also: flip body class `bb-pdp-tabs-active` when the user reaches the
  // ProductTabs section, so the global CSS can hide THIS strip and let the
  // tab strip (Описание / Употреба / …) take over the sticky-top slot.
  // Only one of the two sticky strips should hold the top at any time —
  // otherwise they stack and steal vertical space.
  //
  // ALSO: dynamically measure the main .bb-header height so the anchor
  // nav's sticky `top` always sits 6px below it, with NO overlap and NO
  // visible gap, regardless of header shrink state. Static `top: 70px`
  // (matching shrunk header ~64px) doesn't survive when the shrink class
  // gets overridden by other utility styles, so we set the offset via
  // inline style as CSS custom property.
  useEffect(() => {
    const updateOffset = () => {
      const header = document.querySelector<HTMLElement>('.bb-header');
      const h = header ? Math.round(header.getBoundingClientRect().height) : 64;
      // Set on documentElement so CSS can read `var(--bb-header-h)`
      document.documentElement.style.setProperty('--bb-header-h', `${h}px`);
    };
    const onScroll = () => {
      const y = window.scrollY;
      setStuck(y > 480);
      updateOffset();
      const tabs = document.getElementById('tabs');
      if (tabs) {
        const r = tabs.getBoundingClientRect();
        // Tabs are "active" once they start arriving at the sticky offset.
        // 110px buffer gives a clean handoff window between the two sticky
        // strips so they never both occupy the top simultaneously.
        const tabsActive = r.top < 110;
        document.body.classList.toggle('bb-pdp-tabs-active', tabsActive);
      }
    };
    window.addEventListener('scroll', onScroll, {passive: true});
    window.addEventListener('resize', updateOffset);
    updateOffset();
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', updateOffset);
      document.body.classList.remove('bb-pdp-tabs-active');
    };
  }, []);

  function jumpTo(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    const navHeight = 56;
    const headerHeight = 96; // approx sticky header
    const top = el.getBoundingClientRect().top + window.scrollY - navHeight - headerHeight;
    window.scrollTo({top, behavior: 'smooth'});
  }

  return (
    <nav className={`bb-anchor-nav${stuck ? ' bb-anchor-nav--stuck' : ''}`} aria-label="Бърза навигация">
      <div className="bb-anchor-nav-inner">
        {visibleSections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            onClick={(e) => jumpTo(e, s.id)}
            className={`bb-anchor-link${active === s.id ? ' active' : ''}`}
          >
            {s.label}
          </a>
        ))}
      </div>

      <style>{`
        /* Sticky in-page section navigator. Sits just under the main header
         * on PDPs so the user can jump between hero modules (Viz / Rezultati
         * / Upotreba / Sravnenie / Opisanie / Otzivi) without scrolling.
         *
         * Visual treatment:
         * - Solid white pill bar (not transparent) so labels read on every
         *   background section beneath.
         * - Inactive labels at 0.78 opacity (was 0.6 — too washed).
         * - Active label = pink-accented dark pill (brand-aligned).
         * - On hover, inactive items get a faint cream tile + ink color.
         */
        .bb-anchor-nav {
          position: sticky;
          /* Sits 6px below the actual main .bb-header. The header's height
           * varies (shrunk vs unshrunk, mobile vs desktop), so a JS effect
           * in this component writes the live header height into the CSS
           * custom property --bb-header-h on documentElement. Falls back
           * to 70px (matching shrunk desktop header) when JS hasn't run. */
          top: calc(var(--bb-header-h, 70px) + 6px);
          z-index: 30;
          background: rgba(255, 255, 255, 0.96);
          backdrop-filter: blur(20px) saturate(160%);
          -webkit-backdrop-filter: blur(20px) saturate(160%);
          border-top: 1px solid rgba(10, 37, 64, 0.06);
          border-bottom: 1px solid rgba(10, 37, 64, 0.08);
          margin: 24px -20px 0;
          padding: 0 20px;
          transition: box-shadow 0.22s, background 0.22s;
          -webkit-mask-image: linear-gradient(90deg, #000 0, #000 calc(100% - 28px), transparent 100%);
                  mask-image: linear-gradient(90deg, #000 0, #000 calc(100% - 28px), transparent 100%);
        }
        @media (min-width: 768px) {
          .bb-anchor-nav {
            margin: 32px -32px 0;
            padding: 0 32px;
            -webkit-mask-image: none;
                    mask-image: none;
            border-radius: 14px;
            border: 1px solid rgba(10, 37, 64, 0.08);
            box-shadow: 0 4px 16px -8px rgba(10, 37, 64, 0.12);
          }
        }
        .bb-anchor-nav--stuck {
          box-shadow: 0 8px 20px -12px rgba(10, 37, 64, 0.22);
        }
        @media (min-width: 768px) {
          .bb-anchor-nav--stuck {
            box-shadow: 0 12px 28px -14px rgba(10, 37, 64, 0.28);
          }
        }
        .bb-anchor-nav-inner {
          display: flex;
          gap: 4px;
          overflow-x: auto;
          scrollbar-width: none;
          padding: 8px 0;
          padding-right: 32px;
          max-width: 1240px;
          margin: 0 auto;
        }
        @media (min-width: 768px) {
          .bb-anchor-nav-inner { padding-right: 0; gap: 6px; }
        }
        .bb-anchor-nav-inner::-webkit-scrollbar { display: none; }
        .bb-anchor-link {
          display: inline-flex;
          align-items: center;
          padding: 9px 18px;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.2px;
          color: rgba(10, 37, 64, 0.78);
          text-decoration: none;
          border-radius: 999px;
          white-space: nowrap;
          transition: background 0.18s, color 0.18s, transform 0.18s;
          border: 1.5px solid transparent;
          position: relative;
        }
        .bb-anchor-link:hover {
          color: var(--color-ink);
          background: rgba(10, 37, 64, 0.06);
          text-decoration: none;
        }
        .bb-anchor-link.active {
          background: var(--color-ink);
          color: var(--color-cream-1);
          text-decoration: none;
          box-shadow: 0 4px 12px -4px rgba(10, 37, 64, 0.35);
        }
        /* Subtle pink accent dot inside the active pill — brand cue without
         * full pink background (cleaner than fully pink CTA which competes
         * with the buy button). */
        .bb-anchor-link.active::before {
          content: "";
          width: 6px;
          height: 6px;
          margin-right: 8px;
          background: var(--color-brand-pink);
          border-radius: 999px;
          flex-shrink: 0;
        }
        .bb-anchor-link.active:hover {
          background: var(--color-brand-pink);
        }
        .bb-anchor-link.active:hover::before {
          background: white;
        }
      `}</style>
    </nav>
  );
}
