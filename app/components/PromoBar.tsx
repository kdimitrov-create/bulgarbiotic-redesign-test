import {useEffect, useState} from 'react';
import {Link} from 'react-router';
import {BUMP_CART_CONFIG} from '~/lib/bump-cart-config';

const EUR_TO_BGN = 1.95583;
const SHIP_THRESHOLD_BGN_FMT = new Intl.NumberFormat('bg-BG', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(BUMP_CART_CONFIG.totalCartAmount * EUR_TO_BGN) + ' лв';

/**
 * Sticky promo bar at the very top of every page. Cycles through live
 * campaigns every 6 seconds with a soft fade. Closable; persists dismissal
 * in sessionStorage so it doesn't pester within a session.
 *
 * Campaigns are sourced from real CloudCart data:
 *   1. /pages/pateshestvie  → Disneyland family-trip giveaway (active CMS page)
 *   2. Discount 467 "30%-may-kampaniq" → 30% auto-applied for May (6,397 uses)
 *      end date 2026-06-30, no code needed.
 *   3. Free shipping over 50 € — matches the real Speedy v2 / Sameday
 *      threshold (verified via Admin API `shippingSettings(key:)`).
 *      Same threshold used by CartDrawer's progress bar + upsell logic.
 */
type Campaign = {
  id: string;
  text: string;
  cta: string;
  to: string;
  /** Emoji or short ASCII glyph rendered before the text. */
  glyph: string;
};

const CAMPAIGNS: Campaign[] = [
  {
    id: 'disneyland-giveaway',
    glyph: '✦',
    text: 'Спечели семейна екскурзия до Дисниленд в Париж',
    cta: 'Виж как',
    to: '/page/pateshestvie',
  },
  {
    id: 'may-30',
    glyph: '◉',
    text: '-30% за май — автоматично прилагане, без код',
    cta: 'Виж промо продуктите',
    to: '/category/all-products',
  },
  {
    id: 'free-shipping-bump',
    glyph: '⬢',
    // Text + amount stay in sync with the merchant's BumpCart config —
    // bump-cart-config.ts is the single source of truth (51 € as of
    // 2026-05-21). When the merchant retunes the offer in admin, this
    // copy follows automatically.
    text: `Безплатна доставка при поръчка над ${BUMP_CART_CONFIG.totalCartAmount} € (≈ ${SHIP_THRESHOLD_BGN_FMT})`,
    cta: 'Към продуктите',
    to: '/category/all-products',
  },
];

const STORAGE_KEY = 'bb-promo-bar-v1';
const ROTATE_MS = 6000;

export function PromoBar() {
  // Default visible on SSR + first hydration tick — avoids layout shift for
  // the common case (user hasn't dismissed). Effect reads sessionStorage and
  // may hide it on the next paint if previously dismissed this session.
  const [dismissed, setDismissed] = useState(false);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === '1') setDismissed(true);
    } catch {
      /* sessionStorage blocked — keep showing */
    }
  }, []);

  useEffect(() => {
    if (dismissed || CAMPAIGNS.length < 2) return;
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % CAMPAIGNS.length);
    }, ROTATE_MS);
    return () => clearInterval(t);
  }, [dismissed]);

  function close() {
    setDismissed(true);
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* noop */
    }
  }

  if (dismissed) return null;

  return (
    <div className="bb-promo" role="region" aria-label="Активни кампании">
      <div className="bb-promo-track">
        {CAMPAIGNS.map((camp, i) => (
          <div
            key={camp.id}
            className={`bb-promo-slide${i === idx ? ' bb-promo-slide--on' : ''}`}
            aria-hidden={i !== idx}
          >
            <span className="bb-promo-glyph" aria-hidden="true">{camp.glyph}</span>
            <Link to={camp.to} className="bb-promo-text">
              <strong>{camp.text}</strong>
              <span className="bb-promo-cta">
                {camp.cta} <span aria-hidden="true">»</span>
              </span>
            </Link>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="bb-promo-close"
        onClick={close}
        aria-label="Затвори лентата"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      {/* Dot indicators (only render if there are multiple campaigns) */}
      {CAMPAIGNS.length > 1 && (
        <div className="bb-promo-dots" aria-hidden="true">
          {CAMPAIGNS.map((_, i) => (
            <span key={i} className={`bb-promo-dot${i === idx ? ' on' : ''}`} />
          ))}
        </div>
      )}

      <style>{`
        .bb-promo {
          position: relative;
          /* Client request: promo bar in their brand pink (was a soft peach
           * gradient). White text/CTA for contrast on the strong pink. */
          background: linear-gradient(95deg, #E3166C 0%, #c20d59 100%);
          color: #fff;
          font-size: 13.5px;
          font-weight: 600;
          letter-spacing: 0.2px;
          padding: 11px 56px;
          text-align: center;
          z-index: 60;
          overflow: hidden;
          box-shadow: 0 1px 0 rgba(255, 255, 255, 0.35) inset;
        }
        .bb-promo-track {
          position: relative;
          min-height: 22px;
          display: grid;
          place-items: center;
        }
        .bb-promo-slide {
          grid-column: 1 / 2;
          grid-row: 1 / 2;
          display: inline-flex;
          align-items: center;
          gap: 12px;
          opacity: 0;
          transform: translateY(6px);
          transition: opacity 0.5s ease, transform 0.5s ease;
          pointer-events: none;
          white-space: nowrap;
        }
        .bb-promo-slide--on {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }
        .bb-promo-glyph {
          font-size: 12px;
          opacity: 0.85;
          animation: bb-promo-pulse 2.4s ease-in-out infinite;
        }
        @keyframes bb-promo-pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50%      { opacity: 1;   transform: scale(1.15); }
        }
        .bb-promo-text {
          display: inline-flex;
          align-items: center;
          gap: 14px;
          color: #fff;
          text-decoration: none;
        }
        .bb-promo-text:hover { color: #fff; text-decoration: none; }
        .bb-promo-text strong { font-weight: 700; }
        .bb-promo-cta {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 12px;
          background: rgba(255, 255, 255, 0.16);
          border-radius: 999px;
          font-size: 12.5px;
          font-weight: 700;
          color: #fff;
          text-decoration: none;
          transition: background 0.18s, transform 0.18s;
          border: 1px solid rgba(255, 255, 255, 0.4);
        }
        .bb-promo-cta:hover {
          background: #fff;
          color: #E3166C;
          text-decoration: none;
          transform: translateY(-1px);
        }
        .bb-promo-close {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          width: 28px; height: 28px;
          border: 0; padding: 0;
          background: transparent;
          color: rgba(74, 26, 42, 0.55);
          border-radius: 999px;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.18s, color 0.18s;
        }
        .bb-promo-close:hover {
          background: rgba(74, 26, 42, 0.15);
          color: #4a1a2a;
        }
        .bb-promo-close svg { width: 14px; height: 14px; }

        .bb-promo-dots {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          display: inline-flex;
          gap: 5px;
        }
        .bb-promo-dot {
          width: 5px; height: 5px;
          border-radius: 999px;
          background: rgba(74, 26, 42, 0.35);
          transition: background 0.25s, transform 0.25s;
        }
        .bb-promo-dot.on {
          background: #4a1a2a;
          transform: scale(1.35);
        }

        @media (max-width: 720px) {
          .bb-promo {
            padding: 7px 32px 7px 12px;
            font-size: 11.5px;
            line-height: 1.3;
            text-align: left;
          }
          .bb-promo-track { min-height: 18px; }
          .bb-promo-slide {
            gap: 6px;
            justify-content: flex-start;
            width: 100%;
          }
          /* On mobile we hide the explicit pill CTA — the whole text becomes
           * tappable via the bare <a>, saving horizontal space so the title
           * doesn't wrap or get cropped by the close button. */
          .bb-promo-text {
            display: flex;
            align-items: center;
            gap: 0;
            width: 100%;
            min-width: 0;
          }
          .bb-promo-text strong {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            min-width: 0;
            flex: 1;
          }
          .bb-promo-cta {
            padding: 0 0 0 6px;
            margin-left: 4px;
            font-size: 11.5px;
            background: transparent;
            border: 0;
            border-left: 1px solid rgba(74, 26, 42, 0.32);
            border-radius: 0;
            flex-shrink: 0;
            color: #4a1a2a;
            text-decoration: underline;
            text-underline-offset: 2px;
          }
          .bb-promo-cta:hover {
            background: transparent;
            color: #4a1a2a;
            transform: none;
          }
          .bb-promo-close { width: 22px; height: 22px; right: 6px; }
          .bb-promo-close svg { width: 12px; height: 12px; }
          .bb-promo-dots { display: none; }
          .bb-promo-glyph { display: none; }
        }
      `}</style>
    </div>
  );
}
