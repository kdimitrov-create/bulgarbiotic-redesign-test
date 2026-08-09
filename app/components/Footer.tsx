import {Link} from 'react-router';
import type {Shop, Menu} from '@cloudcart/nitro';
import type {NavMenu, NavNode} from '~/lib/navigation';

interface FooterProps {
  shop: Shop;
  menu: Menu | null;
  /**
   * Дизайн → Навигация, group "footer". Each group there is one column here;
   * the group named „Долна лента" is the thin bar under them.
   *
   * The coded columns below stay as the fallback: if the merchant empties the
   * group, or the admin call fails, the footer still has its links.
   */
  adminFooter?: NavMenu | null;
}

/** Ordinary links only — a column's own children, without nested containers. */
function columnLinks(node: NavNode): NavNode[] {
  return (node.children ?? []).filter((c) => c.url);
}

const BOTTOM_BAR = 'долна лента';

function FooterLink({item}: {item: NavNode}) {
  if (!item.url) return null;
  const external = !item.url.startsWith('/') || item.url.startsWith('//');
  if (external) {
    return (
      <a href={item.url} target={item.blank ? '_blank' : undefined} rel="noopener noreferrer">
        {item.title}
      </a>
    );
  }
  return (
    <Link to={item.url} prefetch="intent">
      {item.title}
    </Link>
  );
}

export function Footer({shop, adminFooter}: FooterProps) {
  const groups = (adminFooter?.items ?? []).filter((g) => columnLinks(g).length);
  const columns = groups.filter((g) => g.title.trim().toLowerCase() !== BOTTOM_BAR);
  const bottom = groups.find((g) => g.title.trim().toLowerCase() === BOTTOM_BAR);
  // „Долна лента" is the sign that this group was built for this footer. A shop
  // whose footer group still holds the classic theme's two columns keeps the
  // coded ones instead of rendering a footer it was never designed for.
  const fromPanel = columns.length > 0 && !!bottom;
  return (
    <footer className="bb-footer">
      <div className="bb-container">
        <div className="bb-footer-top">
          {/* Column 1: Brand + Newsletter */}
          <div>
            <img className="bb-ft-logo" src="/logo.svg" alt={shop.name} />
            <p className="bb-ft-tag">
              Български пробиотици с автентичен Lactobacillus bulgaricus. Малки партиди, проследим
              произход, доказани резултати.
            </p>
            <div className="bb-ft-news-block">
              <div className="bb-ft-news-label">Бюлетин</div>
              <div className="bb-ft-news-sub">
                Седмични съвети за микробиома и ексклузивни оферти. Без спам.
              </div>
              <form className="bb-ft-news-input" onSubmit={(e) => e.preventDefault()}>
                <input type="email" placeholder="имейл адрес" />
                <button type="submit">Абонирай се</button>
              </form>
            </div>
          </div>

          {/* Columns 2-4: the merchant's own, one per group in the panel. */}
          {fromPanel
            ? columns.map((col) => (
                <div className="bb-ft-col" key={col.id}>
                  <h4>{col.title}</h4>
                  {columnLinks(col).map((item) => (
                    <FooterLink key={item.id} item={item} />
                  ))}
                </div>
              ))
            : (
              <>
                <div className="bb-ft-col">
                  <h4>Магазин</h4>
                  <Link to="/category/all-products">Всички продукти</Link>
                  <Link to="/category/perli">Перли</Link>
                  <Link to="/category/packages">Пакети</Link>
                  <Link to="/category/probiotik-za-jeni">За жени</Link>
                  <Link to="/category/probiotik-za-deca">За деца</Link>
                  <Link to="/selection/sale">Промоции</Link>
                </div>
                <div className="bb-ft-col">
                  <h4>Bactology</h4>
                  <Link to="/page/about-us">За нас</Link>
                  <Link to="/page/events">Събития</Link>
                  <Link to="/page/mediite-za-nas">Медиите за нас</Link>
                  <Link to="/page/naukata-zad-bulgar-biotic">Науката</Link>
                  <Link to="/blog">Блог</Link>
                  <Link to="/page/about-us#contact">Контакти</Link>
                </div>
                <div className="bb-ft-col">
                  <h4>Помощ</h4>
                  <Link to="/page/shipping">Доставка</Link>
                  <Link to="/page/payment">Плащане</Link>
                  <Link to="/page/vrashtane-na-produkt">Връщане на продукт</Link>
                  <Link to="/page/formulyar-za-otkaz">Формуляр за отказ</Link>
                  <Link to="/page/politika-otnosno-biskvitkite">Бисквитки</Link>
                </div>
              </>
            )}

          {/* Column 5: Свържи се + payments */}
          <div className="bb-ft-col bb-ft-contact">
            <h4>Свържи се</h4>
            <div className="bb-ft-row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
              </svg>
              <div>
                <div className="bb-ft-label">Телефон</div>
                <a className="bb-ft-val" href="tel:+359882754163">+359 88 275 4163</a>
              </div>
            </div>
            <div className="bb-ft-row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <div>
                <div className="bb-ft-label">Имейл</div>
                <a className="bb-ft-val" href="mailto:office@bulgarbiotic.bg">office@bulgarbiotic.bg</a>
              </div>
            </div>
            <div className="bb-ft-row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <div>
                <div className="bb-ft-label">Работно време</div>
                <div className="bb-ft-val">Пон – Пет · 9:00 – 18:00</div>
              </div>
            </div>
            <div className="bb-ft-pay-label">Начини на плащане</div>
            <div className="bb-ft-payments">
              <span className="bb-ft-pay" title="Дебитни и кредитни карти">
                <svg viewBox="0 0 56 40">
                  <rect x="2" y="3" width="52" height="34" rx="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  <rect x="2" y="10" width="52" height="6" fill="currentColor" opacity="0.18" />
                  <rect x="7" y="22" width="9" height="7" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2" />
                  <line x1="11.5" y1="22" x2="11.5" y2="29" stroke="currentColor" strokeWidth="0.7" opacity="0.6" />
                  <line x1="7" y1="25.5" x2="16" y2="25.5" stroke="currentColor" strokeWidth="0.7" opacity="0.6" />
                  <circle cx="42" cy="26" r="4" fill="#E3166C" opacity="0.85" />
                  <circle cx="48" cy="26" r="4" fill="#0267A0" opacity="0.85" />
                </svg>
              </span>
              <span className="bb-ft-pay" title="Безконтактно плащане">
                <svg viewBox="0 0 56 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="6" y="6" width="22" height="28" rx="3" />
                  <path d="M16 16v8" strokeWidth="2" />
                  <path d="M34 11c5 4 5 14 0 18" opacity="0.85" />
                  <path d="M40 7c8 6 8 20 0 26" opacity="0.6" />
                  <path d="M46 3c11 8 11 26 0 34" opacity="0.35" />
                </svg>
              </span>
              <span className="bb-ft-pay" title="Мобилно / дигитално плащане">
                <svg viewBox="0 0 56 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="18" y="3" width="20" height="34" rx="3" />
                  <line x1="18" y1="30" x2="38" y2="30" opacity="0.6" />
                  <circle cx="28" cy="33.5" r="0.8" fill="currentColor" />
                  <rect x="22" y="9" width="12" height="14" rx="1.5" strokeWidth="1.2" opacity="0.85" />
                  <path d="M25 16l2.5 2.5L32 13" stroke="#E3166C" strokeWidth="1.8" />
                </svg>
              </span>
              <span className="bb-ft-pay" title="Наложен платеж">
                <svg viewBox="0 0 56 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 12l16-6 16 6v12a2 2 0 01-1.1 1.8L24 32a2 2 0 01-2 0L7.1 25.8A2 2 0 016 24V12z" />
                  <path d="M6 12l16 6 16-6" opacity="0.6" />
                  <line x1="22" y1="18" x2="22" y2="32" opacity="0.6" />
                  <rect x="34" y="22" width="18" height="12" rx="1.5" fill="rgba(245,239,227,0.06)" stroke="currentColor" strokeWidth="1.4" />
                  <text x="43" y="30" textAnchor="middle" fontFamily="Manrope" fontWeight="800" fontSize="3.5" fill="#E3166C" stroke="none">лв</text>
                </svg>
              </span>
              <span className="bb-ft-pay" title="Банков превод">
                <svg viewBox="0 0 56 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 14l20-7 20 7" />
                  <line x1="6" y1="14" x2="50" y2="14" />
                  <line x1="11" y1="14" x2="11" y2="28" />
                  <line x1="20" y1="14" x2="20" y2="28" />
                  <line x1="36" y1="14" x2="36" y2="28" />
                  <line x1="45" y1="14" x2="45" y2="28" />
                  <line x1="5" y1="30" x2="51" y2="30" />
                  <path d="M22 36h12m0 0l-3-2.5M34 36l-3 2.5" stroke="#E3166C" strokeWidth="1.6" />
                </svg>
              </span>
            </div>
          </div>
        </div>

        <div className="bb-ft-bottom">
          <div className="bb-ft-meta">
            <span>© {new Date().getFullYear()} BulgarBiotic Ltd.</span>
            {fromPanel && bottom ? (
              columnLinks(bottom).map((item) => <FooterLink key={item.id} item={item} />)
            ) : (
              <>
                <Link to="/page/terms-policy">Общи условия</Link>
                <Link to="/page/privacy-policy">Поверителност</Link>
                <Link to="/page/politika-otnosno-biskvitkite">Бисквитки</Link>
              </>
            )}
          </div>
          <div className="bb-ft-stamp"><span className="bb-ft-stamp-dot"></span>Произведено в България · от 2019</div>
          <div className="bb-ft-socials">
            <a href="https://instagram.com/bulgarbiotic" aria-label="Instagram">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17" cy="7" r="0.9" fill="currentColor" />
              </svg>
            </a>
            <a href="#" aria-label="Facebook">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 21v-7.5h2.5l.5-3h-3V8.5c0-.9.4-1.5 1.6-1.5h1.4V4.3c-.3 0-1.4-.2-2.6-.2-2.6 0-4.4 1.6-4.4 4.4v2.5h-3v3h3V21" />
              </svg>
            </a>
            <a href="#" aria-label="YouTube">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2.5" y="6" width="19" height="12" rx="3" />
                <path d="M10.5 9.5L14.5 12L10.5 14.5z" fill="currentColor" />
              </svg>
            </a>
            <a href="#" aria-label="TikTok">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 4v11.5a3 3 0 11-3-3" />
                <path d="M14 4c.5 2.5 2.5 4 5 4" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      <style>{`
        .bb-footer {
          background: var(--color-ink);
          color: var(--color-cream-1);
          padding: 90px 0 32px;
          position: relative;
        }
        .bb-footer::before {
          content: ""; position: absolute; top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--color-brand-pink), var(--color-brand-blue), transparent);
          opacity: 0.6;
        }
        .bb-footer-top {
          display: grid;
          grid-template-columns: 1.6fr 1fr 1fr 1fr 1.2fr;
          gap: 50px;
          padding-bottom: 56px;
          border-bottom: 1px solid rgba(245,239,227,0.12);
        }
        @media (max-width: 1100px) { .bb-footer-top { grid-template-columns: 1.5fr 1fr 1fr; gap: 40px; } }
        /* Mobile: brand block full-width on top, then nav cols 2-up with
         * smaller text + tighter padding so labels never crop at the viewport
         * edge. Contact column drops to its own row below the nav.
         * minmax(0, 1fr) is required — plain 1fr resolves to min-content
         * width when the brand block has long unbreakable content, which
         * collapses the second column to a sliver. */
        @media (max-width: 720px) {
          .bb-footer-top {
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
            gap: 26px 16px;
            padding-bottom: 36px;
          }
          .bb-footer-top > *:first-child { grid-column: 1 / -1; }
          .bb-ft-contact { grid-column: 1 / -1; }
          .bb-ft-col h4 { font-size: 11.5px !important; letter-spacing: 1.4px !important; }
          .bb-ft-col a { font-size: 13.5px !important; }
        }

        .bb-ft-logo { height: 56px; filter: brightness(0) invert(1); margin-bottom: 22px; }
        .bb-ft-tag { font-size: 13px; opacity: 0.6; line-height: 1.75; max-width: 320px; margin-bottom: 24px; }

        .bb-ft-news-block { margin-top: 6px; max-width: 320px; }
        .bb-ft-news-label { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; font-weight: 800; opacity: 0.55; margin-bottom: 8px; color: var(--color-pink-3); }
        .bb-ft-news-sub { font-size: 12px; line-height: 1.55; opacity: 0.55; margin-bottom: 12px; }
        .bb-ft-news-input {
          display: flex;
          background: rgba(245,239,227,0.05);
          border: 1px solid rgba(245,239,227,0.15);
          border-radius: 999px;
          padding: 4px 4px 4px 18px;
          align-items: center;
          max-width: 320px;
          transition: border-color 0.2s;
        }
        .bb-ft-news-input:focus-within { border-color: var(--color-brand-pink); }
        .bb-ft-news-input input {
          background: none; border: none; outline: none;
          color: var(--color-cream-1); font-family: inherit; font-size: 13px;
          flex: 1; padding: 10px 0;
        }
        .bb-ft-news-input input::placeholder { color: rgba(245,239,227,0.4); }
        .bb-ft-news-input button {
          background: var(--color-brand-pink); color: white;
          padding: 8px 16px; border-radius: 999px;
          font-size: 11px; font-weight: 800; letter-spacing: 0.4px;
          border: none; cursor: pointer; font-family: inherit;
          transition: background 0.2s;
        }
        .bb-ft-news-input button:hover { background: var(--color-brand-pink-dark); }

        .bb-ft-col h4 {
          font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
          font-weight: 800; opacity: 0.55; margin-bottom: 22px;
          color: var(--color-pink-3);
        }
        .bb-ft-col a {
          display: block; font-size: 14px; opacity: 0.78;
          padding: 5px 0; transition: opacity 0.2s, color 0.2s, transform 0.2s;
        }
        .bb-ft-col a:hover { opacity: 1; color: var(--color-pink-3); transform: translateX(3px); }

        .bb-ft-contact { font-size: 13px; opacity: 0.78; line-height: 1.85; }
        .bb-ft-row { display: flex; align-items: flex-start; gap: 10px; padding: 4px 0; }
        .bb-ft-row svg { width: 14px; height: 14px; flex-shrink: 0; margin-top: 4px; opacity: 0.7; }
        .bb-ft-row a { color: inherit; transition: color 0.2s; }
        .bb-ft-row a:hover { color: var(--color-pink-3); }
        .bb-ft-label { font-size: 10px; letter-spacing: 1.6px; text-transform: uppercase; opacity: 0.5; font-weight: 700; }
        .bb-ft-val { font-weight: 600; opacity: 1; }

        .bb-ft-pay-label {
          font-size: 9px; color: rgba(245,239,227,0.5);
          letter-spacing: 1.6px; text-transform: uppercase; font-weight: 800;
          margin-top: 18px; margin-bottom: 8px;
        }
        .bb-ft-payments {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 8px;
          max-width: 320px;
        }
        .bb-ft-pay {
          aspect-ratio: 7/5;
          background: rgba(245,239,227,0.06);
          border: 1px solid rgba(245,239,227,0.12);
          border-radius: 7px;
          display: flex; align-items: center; justify-content: center;
          color: var(--color-cream-1);
          transition: all 0.25s ease;
          overflow: hidden;
        }
        .bb-ft-pay:hover {
          background: rgba(245,239,227,0.12);
          border-color: var(--color-pink-3);
          transform: translateY(-2px);
        }
        .bb-ft-pay svg { width: 70%; height: auto; display: block; }

        .bb-ft-bottom {
          padding-top: 28px;
          display: flex; justify-content: space-between;
          align-items: center;
          font-size: 12px; opacity: 0.55;
          flex-wrap: wrap; gap: 18px;
        }
        .bb-ft-meta { display: flex; gap: 18px; flex-wrap: wrap; align-items: center; }
        .bb-ft-meta a { transition: color 0.2s; }
        .bb-ft-meta a:hover { color: var(--color-pink-3); opacity: 1; }
        .bb-ft-stamp {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px 10px;
          border: 1px solid rgba(245,239,227,0.15);
          border-radius: 999px;
          font-size: 10px; letter-spacing: 1.4px; font-weight: 800;
        }
        .bb-ft-stamp-dot { width: 6px; height: 6px; background: var(--color-brand-pink); border-radius: 50%; }
        .bb-ft-socials { display: flex; gap: 8px; }
        .bb-ft-socials a {
          width: 36px; height: 36px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 999px;
          background: rgba(245,239,227,0.05);
          border: 1px solid rgba(245,239,227,0.1);
          transition: all 0.2s;
          color: var(--color-cream-1);
        }
        .bb-ft-socials a:hover {
          background: var(--color-brand-pink); border-color: var(--color-brand-pink);
          opacity: 1; transform: translateY(-2px);
        }
        .bb-ft-socials svg { width: 14px; height: 14px; }
      `}</style>
    </footer>
  );
}
