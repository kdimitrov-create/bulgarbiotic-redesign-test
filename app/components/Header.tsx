import {NavLink, Link, Await} from 'react-router';
import {Suspense, useEffect, useRef, useState} from 'react';
import type {Shop, Menu, CartData} from '@cloudcart/nitro';
import {useAside} from './Aside';
import {SearchOverlay} from './SearchOverlay';
import {MegaMenu} from './MegaMenu';

interface HeaderProps {
  shop: Shop;
  menu: Menu | null;
  cart: Promise<CartData | null>;
}

const FALLBACK_MENU = [
  {title: 'Продукти', url: '/category/all-products'},
  {title: 'Промоции', url: '/selection/sale'},
  {title: 'Beauty серия', url: '/page/kosa-koja-i-nokti'},
  {title: 'Bactology Pets', url: '/product/bactology-pets'},
  {title: 'Наука', url: '/page/naukata-zad-bulgar-biotic'},
  {title: 'Блог', url: '/blog'},
];

export function Header({shop, menu, cart}: HeaderProps) {
  const baseItems = (menu?.items ?? FALLBACK_MENU) as Array<{title: string; url: string}>;
  // Inject the "Абонирай се за бюлетин" promo CTA just before the "Блог" item
  // (client request). It's a styled pink button, not a CloudCart menu entry.
  const blogIdx = baseItems.findIndex((i) => i.url === '/blog' || i.title.toLowerCase().includes('блог'));
  const newsletterNav = {title: 'Абонирай се за бюлетин', url: '/page/abomanmet-za-byuletin'};
  const items = blogIdx >= 0
    ? [...baseItems.slice(0, blogIdx), newsletterNav, ...baseItems.slice(blogIdx)]
    : [...baseItems, newsletterNav];
  const {open} = useAside();
  const headerRef = useRef<HTMLElement>(null);
  const cartBtnRef = useRef<HTMLButtonElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const megaCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Open mega-menu instantly; cancel any pending close. */
  const openMega = () => {
    if (megaCloseTimer.current) {
      clearTimeout(megaCloseTimer.current);
      megaCloseTimer.current = null;
    }
    setMegaOpen(true);
  };

  /** Close after a small grace period so the user can move from nav link
   *  into the menu panel without it closing under their cursor. */
  const scheduleCloseMega = () => {
    if (megaCloseTimer.current) clearTimeout(megaCloseTimer.current);
    megaCloseTimer.current = setTimeout(() => setMegaOpen(false), 160);
  };

  /** Close immediately (used on ESC + nav click). */
  const closeMega = () => {
    if (megaCloseTimer.current) {
      clearTimeout(megaCloseTimer.current);
      megaCloseTimer.current = null;
    }
    setMegaOpen(false);
  };

  // ESC closes the mega-menu
  useEffect(() => {
    if (!megaOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMega();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [megaOpen]);

  // Lock body scroll while mobile drawer is open + ESC closes.
  // Also flip a body class so other fixed elements (sticky cart, FAB,
  // cookie banner, promo bar) can hide themselves while the nav is open
  // — otherwise they bleed through and clutter the drawer surface.
  useEffect(() => {
    if (!mobileOpen) return;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('bb-drawer-open');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('bb-drawer-open');
      window.removeEventListener('keydown', onKey);
    };
  }, [mobileOpen]);

  // Sticky shrink on scroll
  useEffect(() => {
    const onScroll = () => {
      headerRef.current?.classList.toggle('shrunk', window.scrollY > 30);
    };
    window.addEventListener('scroll', onScroll, {passive: true});
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Magnetic cart button
  useEffect(() => {
    const btn = cartBtnRef.current;
    if (!btn) return;
    const onMove = (e: MouseEvent) => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      btn.style.transform = `translate(${x * 0.18}px, ${y * 0.18}px)`;
    };
    const onLeave = () => {
      btn.style.transform = '';
    };
    btn.addEventListener('mousemove', onMove);
    btn.addEventListener('mouseleave', onLeave);
    return () => {
      btn.removeEventListener('mousemove', onMove);
      btn.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return (
    <header ref={headerRef} className="bb-header">
      <div className="bb-container bb-header-inner">
        {/* Mobile-only hamburger pinned to the LEFT edge of the header — this
         * matches the elegant "burger / logo-center / search+cart" pattern
         * pioneered by clean beauty brands (nlbeauty.bg, glossier.com etc).
         * On desktop the same hamburger lives inside .bb-header-actions and
         * this left slot is hidden. */}
        <button
          type="button"
          className="bb-nav-toggle bb-nav-toggle--left"
          onClick={() => setMobileOpen(true)}
          aria-label="Меню"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
          </svg>
        </button>
        <Link to="/" className="bb-logo-link" aria-label={shop.name}>
          <img className="bb-logo" src="/logo.svg" alt={shop.name} />
        </Link>

        <nav className="bb-nav">
          {items.map((item) => {
            // The "Продукти" item is enhanced with a hover mega-menu.
            // Treat any nav item that targets /category/all-products (or
            // legacy /products) as the trigger.
            const isProductsTrigger =
              item.url === '/category/all-products' ||
              item.url === '/products' ||
              item.title.toLowerCase().includes('продукти');
            if (isProductsTrigger) {
              return (
                <span
                  key={item.title}
                  className="bb-nav-mega-wrap"
                  onMouseEnter={openMega}
                  onMouseLeave={scheduleCloseMega}
                  onFocus={openMega}
                  onBlur={scheduleCloseMega}
                >
                  <NavLink
                    to={item.url}
                    className={({isActive}) => `bb-nav-link bb-nav-link--mega ${isActive || megaOpen ? 'active' : ''}`}
                    prefetch="intent"
                    aria-haspopup="true"
                    aria-expanded={megaOpen}
                  >
                    {item.title}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="bb-nav-chevron" aria-hidden="true">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </NavLink>
                </span>
              );
            }
            const isNewsletter = item.url === '/page/abomanmet-za-byuletin';
            const isPromo =
              !isNewsletter &&
              (item.url === '/selection/sale' || item.title.toLowerCase().includes('промоции'));
            return (
              <NavLink
                key={item.title}
                to={item.url}
                className={({isActive}) =>
                  `bb-nav-link${isPromo ? ' bb-nav-link--promo' : ''}${isNewsletter ? ' bb-nav-link--newsletter' : ''}${isActive ? ' active' : ''}`
                }
                prefetch="intent"
              >
                {item.title}
              </NavLink>
            );
          })}
        </nav>

        <div className="bb-header-actions">
          <button
            type="button"
            className="bb-nav-toggle"
            onClick={() => setMobileOpen(true)}
            aria-label="Меню"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </svg>
          </button>
          <button
            type="button"
            className="bb-icon-btn bb-icon-search"
            onClick={() => setSearchOpen(true)}
            aria-label="Търсене"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="M15.5 15.5l4 4" />
            </svg>
          </button>
          <div className="bb-icon-pair">
            <NavLink to="/account" className="bb-icon-btn bb-icon-account" aria-label="Профил">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <circle cx="12" cy="9" r="3.4" />
                <path d="M5.5 19.5c1.4-3.2 3.9-4.8 6.5-4.8s5.1 1.6 6.5 4.8" />
              </svg>
            </NavLink>
            <button
              ref={cartBtnRef}
              type="button"
              className="bb-icon-btn bb-icon-cart"
              onClick={() => open('cart')}
              aria-label="Отвори количка"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5.5 8h13l-1.2 10.5a1.6 1.6 0 01-1.6 1.5H8.3a1.6 1.6 0 01-1.6-1.5L5.5 8z" />
                <path d="M9 8a3 3 0 016 0" />
              </svg>
              <Suspense>
                <Await resolve={cart}>
                  {(resolvedCart) =>
                    resolvedCart && resolvedCart.totalQuantity > 0 ? (
                      <span className="bb-cart-count">{resolvedCart.totalQuantity}</span>
                    ) : null
                  }
                </Await>
              </Suspense>
            </button>
          </div>
        </div>
      </div>

      {/* Mega-menu drops under the header on hover. The wrapping area extends
          down so the cursor can move from nav link → panel without flicker. */}
      <div
        className="bb-mega-area"
        onMouseEnter={openMega}
        onMouseLeave={scheduleCloseMega}
      >
        <MegaMenu open={megaOpen} onNav={closeMega} />
      </div>

      {/* Subtle page dim while menu is open (desktop only) */}
      <div
        className={`bb-megamenu-backdrop${megaOpen ? ' bb-megamenu-backdrop--open' : ''}`}
        onClick={closeMega}
        aria-hidden="true"
      />

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Mobile slide-out drawer */}
      <div
        className={`bb-mobile-overlay${mobileOpen ? ' open' : ''}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />
      <aside className={`bb-mobile-drawer${mobileOpen ? ' open' : ''}`} aria-label="Навигация">
        <div className="bb-mobile-head">
          <img src="/logo.svg" alt={shop.name} />
          <button
            type="button"
            className="bb-mobile-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Затвори"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <nav className="bb-mobile-nav">
          {items.map((item) => (
            <Link
              key={item.title}
              to={item.url}
              prefetch="intent"
              onClick={() => setMobileOpen(false)}
            >
              {item.title}
            </Link>
          ))}
          <Link to="/account" onClick={() => setMobileOpen(false)}>
            Профил
          </Link>
          <Link to="/page/about-us#contact" onClick={() => setMobileOpen(false)}>
            Контакти
          </Link>
        </nav>
        <div className="bb-mobile-foot">
          <a href="tel:+359882754163" className="bb-mobile-call">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
            </svg>
            +359 88 275 4163
          </a>
        </div>
      </aside>

      <style>{`
        .bb-header {
          position: sticky; top: 0; z-index: 50;
          background: rgba(250, 246, 236, 0.85);
          backdrop-filter: blur(20px) saturate(150%);
          -webkit-backdrop-filter: blur(20px) saturate(150%);
          border-bottom: 1px solid rgba(10, 37, 64, 0.1);
          transition: padding 0.3s ease;
        }
        .bb-header-inner {
          display: grid;
          /* Desktop: logo-left | nav-center | actions-right.
           * Mobile (overridden below): burger-left | logo-center | actions-right. */
          grid-template-columns: 1fr auto 1fr;
          grid-template-areas: "logo nav actions";
          align-items: center;
          padding: 22px 36px;
          gap: 32px;
          transition: padding 0.3s ease;
        }
        .bb-header.shrunk .bb-header-inner { padding: 12px 36px; }
        /* Left-edge burger is desktop-hidden; it lives in actions on desktop. */
        .bb-nav-toggle--left { display: none !important; grid-area: burger; }
        .bb-logo-link { grid-area: logo; }
        .bb-nav { grid-area: nav; }
        .bb-header-actions { grid-area: actions; }
        @media (max-width: 1100px) {
          /* Tablet + mobile: swap layout to burger-center-actions */
          .bb-header-inner {
            grid-template-columns: auto 1fr auto;
            grid-template-areas: "burger logo actions";
          }
          .bb-nav-toggle--left { display: flex !important; }
          .bb-logo-link { justify-self: center; }
        }
        @media (max-width: 720px) {
          .bb-header-inner { padding: 12px 16px; gap: 8px; }
          .bb-header.shrunk .bb-header-inner { padding: 10px 16px; }
        }
        .bb-logo-link { display: flex; align-items: center; }
        .bb-logo {
          height: 56px; width: auto;
          transition: height 0.3s ease;
        }
        .bb-header.shrunk .bb-logo { height: 40px; }
        @media (max-width: 720px) {
          .bb-logo { height: 42px; }
          .bb-header.shrunk .bb-logo { height: 36px; }
        }

        .bb-nav { display: flex; gap: 30px; justify-content: center; font-size: 14px; font-weight: 600; letter-spacing: 0.2px; }
        @media (max-width: 1100px) { .bb-nav { display: none; } }
        .bb-nav-link {
          color: var(--color-ink);
          padding: 6px 0;
          position: relative;
          transition: color 0.2s;
        }
        .bb-nav-link::after {
          content: ""; position: absolute; left: 50%; right: 50%; bottom: 0;
          height: 2px; background: var(--color-brand-pink);
          transition: left 0.3s ease, right 0.3s ease;
        }
        .bb-nav-link:hover, .bb-nav-link.active { color: var(--color-brand-pink); }
        .bb-nav-link:hover::after, .bb-nav-link.active::after { left: 0; right: 0; }
        /* Client: "Промоции" pink by default so it stands out as promo. */
        .bb-nav-link--promo { color: var(--color-brand-pink); font-weight: 700; }
        /* Client: "Абонирай се за бюлетин" as a pink CTA pill before "Блог". */
        .bb-nav-link--newsletter {
          background: var(--color-brand-pink); color: #fff;
          padding: 7px 15px; border-radius: 999px; font-weight: 700;
        }
        .bb-nav-link--newsletter::after { display: none; }
        .bb-nav-link--newsletter:hover { background: #c20d59; color: #fff; }
        /* Keep the CTA pill unchanged (white label on pink) even when its page
           is active — the generic ".active → pink text" rule would otherwise
           hide the label on the pink background. Color only, so hover still
           darkens the background. */
        .bb-nav-link--newsletter.active { color: #fff; }

        .bb-header-actions { display: flex; gap: 14px; align-items: center; justify-content: flex-end; }
        .bb-icon-btn {
          width: 48px; height: 48px;
          border-radius: 999px;
          display: flex; align-items: center; justify-content: center;
          color: var(--color-ink);
          background: transparent;
          border: 1px solid transparent;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s, transform 0.2s, color 0.2s;
          position: relative;
          padding: 0;
        }
        .bb-icon-btn:hover {
          background: var(--color-pink-1);
          border-color: rgba(227, 22, 108, 0.18);
          color: var(--color-brand-pink);
          transform: scale(1.05);
        }
        .bb-icon-btn svg { width: 22px; height: 22px; }
        @media (max-width: 720px) {
          .bb-icon-btn { width: 44px; height: 44px; }
          .bb-icon-btn svg { width: 20px; height: 20px; }
        }

        /* Account + cart paired group (closer together visually) */
        .bb-icon-pair {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.55);
          border: 1px solid rgba(10, 37, 64, 0.08);
        }
        .bb-icon-pair .bb-icon-btn:hover {
          background: white;
        }
        .bb-icon-cart {
          background: var(--color-ink) !important;
          color: var(--color-cream-1);
        }
        .bb-icon-cart:hover {
          background: var(--color-brand-pink) !important;
          color: white;
          border-color: transparent;
        }

        .bb-cart-count {
          position: absolute;
          top: -2px; right: -2px;
          background: var(--color-brand-pink); color: white;
          font-size: 10px; font-weight: 800;
          padding: 2px 6px; border-radius: 999px;
          min-width: 18px; text-align: center;
          box-shadow: 0 0 0 2px var(--color-cream-1);
          line-height: 1;
        }

        /* Mobile hamburger toggle.
         * Two copies exist in the JSX: one inside .bb-header-actions (used
         * on desktop only when nav doesn't fit) and one floated to the LEFT
         * of the header (the mobile-first burger pinned to the start of the
         * row). At any viewport only ONE is visible, never both. */
        .bb-nav-toggle {
          display: none;
          width: 44px; height: 44px;
          border-radius: 999px;
          background: transparent; color: var(--color-ink);
          align-items: center; justify-content: center;
          border: none; cursor: pointer;
          transition: background 0.2s;
        }
        .bb-nav-toggle:hover { background: var(--color-pink-1); }
        .bb-nav-toggle svg { width: 20px; height: 20px; }
        /* Hide the in-actions hamburger on mobile (the left one takes over).
         * Keep it visible on desktop only when nav also disappears. */
        @media (max-width: 1100px) and (min-width: 1101px) { .bb-header-actions .bb-nav-toggle { display: flex; } }
        /* Account icon — desktop only. On mobile it lives in the side drawer
         * so the right-edge cluster stays at two items (search + cart) for
         * thumb reach. */
        @media (max-width: 720px) {
          .bb-icon-account { display: none; }
          .bb-header-actions .bb-nav-toggle { display: none; }
          .bb-icon-pair { background: transparent; border: 0; padding: 0; }
        }

        /* Slide-out drawer */
        .bb-mobile-overlay {
          position: fixed; inset: 0;
          background: rgba(10, 37, 64, 0.55);
          backdrop-filter: blur(4px);
          z-index: 150;
          opacity: 0; visibility: hidden;
          transition: opacity 0.4s, visibility 0.4s;
        }
        .bb-mobile-overlay.open { opacity: 1; visibility: visible; }

        .bb-mobile-drawer {
          position: fixed; top: 0; left: 0;
          /* Full-width on phones (no awkward sliver of the page peeking
           * through). On tablets/desktop keep a comfortable max so the
           * drawer doesn't span the entire screen. */
          width: 100vw;
          max-width: 420px;
          height: 100vh;
          background: var(--color-cream-1);
          z-index: 151;
          transform: translateX(-110%);
          transition: transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
          display: flex; flex-direction: column;
          box-shadow: 20px 0 60px -10px rgba(0, 0, 0, 0.3);
        }
        .bb-mobile-drawer.open { transform: translateX(0); }
        .bb-mobile-head {
          padding: 22px 24px;
          border-bottom: 1px solid rgba(10, 37, 64, 0.1);
          display: flex; align-items: center; justify-content: space-between;
        }
        .bb-mobile-head img { height: 36px; }
        .bb-mobile-close {
          width: 36px; height: 36px; border-radius: 999px;
          background: white; border: 1px solid rgba(10, 37, 64, 0.1);
          color: var(--color-ink);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.2s;
        }
        .bb-mobile-close:hover { background: var(--color-ink); color: var(--color-cream-1); }
        .bb-mobile-close svg { width: 14px; height: 14px; }
        .bb-mobile-nav { padding: 18px 24px; flex: 1; overflow-y: auto; }
        .bb-mobile-nav a {
          display: block; padding: 14px 0;
          font-size: 17px; font-weight: 700;
          color: var(--color-ink);
          border-bottom: 1px solid rgba(10, 37, 64, 0.1);
          transition: color 0.2s, padding 0.2s;
        }
        .bb-mobile-nav a:hover { color: var(--color-brand-pink); padding-left: 6px; }
        .bb-mobile-foot { padding: 18px 24px; border-top: 1px solid rgba(10, 37, 64, 0.1); }
        .bb-mobile-call {
          display: inline-flex; align-items: center; gap: 8px;
          background: var(--color-ink); color: var(--color-cream-1);
          padding: 9px 18px; border-radius: 999px;
          font-size: 12px; font-weight: 700;
        }
        .bb-mobile-call svg { width: 13px; height: 13px; }
      `}</style>
    </header>
  );
}
