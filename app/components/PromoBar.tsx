import {useEffect, useState} from 'react';
import {Link} from 'react-router';
import {freeShippingTargetEur} from './CartDrawer';
import {liveModule} from '~/lib/theme-modules';

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

function campaigns(): Campaign[] {
  return [
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
    // Сумата е същата, която количката показва в лентата за доставка: първо
    // правилото от панела, иначе настройката на BumpCart. Функция, а не
    // константа, защото правилото пристига през root loader-а.
    text: `Безплатна доставка при поръчка над ${freeShippingTargetEur()} €`,
    cta: 'Към продуктите',
    to: '/category/all-products',
    },
  ];
}


/**
 * Всеки абзац в модула „Promo Bar" е едно съобщение от въртележката - точно
 * това произвежда редакторът в панела ред по ред.
 *
 * Каквото не е списък от абзаци, остава едно цяло съобщение.
 */
function splitOwnSlides(html: string): string[] {
  const raw = (html || '').trim();
  if (!raw) return [];
  // The lookahead keeps a <pre> block from being read as a paragraph.
  const open = /<p(?=[\s>])[^>]*>/i;
  const paragraphs = raw.match(/<p(?=[\s>])[^>]*>[\s\S]*?<\/p>/gi);
  if (!paragraphs || paragraphs.length < 2) return [raw];
  const slides = paragraphs
    .map((p) => p.replace(open, '').replace(/<\/p>\s*$/i, '').trim())
    .filter((p) => p.replace(/<[^>]+>/g, '').trim().length > 0);
  return slides.length ? slides : [raw];
}

/**
 * Съдържанието от админа, разглобено до частите, с които е нарисувана лентата
 * в този дизайн: знак отпред, текст и връзка накрая.
 *
 * Защо не се налива направо: панелът пази HTML, писан за старата тема - със
 * свои `<a>`, свои удебелявания и понякога свои стилове. Досега точно този HTML
 * влизаше суров в лентата и тя изглеждаше като чуждо парче в новия дизайн.
 * Клиентът поиска обратното: съдържанието да е от панела, видът да е нашият.
 */
type OwnSlide = {glyph: string; text: string; cta: string; to: string};

/** Първият знак, ако абзацът започва със символ, а не с буква или цифра. */
const LEADING_GLYPH = /^\s*([^\p{L}\p{N}\s<])\s*/u;

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function parseOwnSlide(html: string): OwnSlide {
  // Връзката накрая става бутонът „Виж …", както при рисуваните съобщения.
  const link = html.match(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
  const to = link ? link[1] : '';
  const cta = link ? stripTags(link[2]).replace(/\s*[»→>]+\s*$/, '').trim() : '';

  let text = stripTags(link ? html.replace(link[0], ' ') : html);
  let glyph = '';
  const lead = text.match(LEADING_GLYPH);
  if (lead) {
    glyph = lead[1];
    text = text.slice(lead[0].length);
  }
  return {glyph, text: text.trim(), cta, to};
}

const STORAGE_KEY = 'bb-promo-bar-v1';
const ROTATE_MS = 6000;

export function PromoBar() {
  // The merchant's own bar wins when they have switched it on in
  // Дизайн → Модули → "Promo Bar": it carries HTML, an optional button and a
  // date window, and it replaces the designed campaigns entirely. Without it,
  // the three curated messages below keep rotating.
  const own = liveModule('htmlLine');
  const ownSlides = splitOwnSlides(
    typeof own?.settings?.text === 'string' ? own.settings.text : '',
  );

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

  // Изчислява се при рендиране, защото прагът за безплатна доставка идва през
  // root loader-а и не се знае, докато модулът се зарежда.
  const fallbackCampaigns = campaigns();
  const slideCount = ownSlides.length || fallbackCampaigns.length;
  useEffect(() => {
    if (dismissed || slideCount < 2) return;
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % slideCount);
    }, ROTATE_MS);
    return () => clearInterval(t);
  }, [dismissed, slideCount]);

  function close() {
    setDismissed(true);
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* noop */
    }
  }

  if (dismissed) return null;

  const button = own?.settings?.button ?? {};
  const showButton =
    ownSlides.length > 0 &&
    (String(button.enabled ?? '').toLowerCase() === 'true' || button.enabled === true) &&
    Boolean(button.link);

  return (
    <div className="bb-promo" role="region" aria-label="Активни кампании">
      <div className="bb-promo-track">
        {ownSlides.map((html, i) => {
          const slide = parseOwnSlide(html);
          const to = slide.to || (showButton ? button.link : '');
          const cta = slide.cta || (showButton ? button.text || 'Виж повече' : '');
          const body = (
            <>
              <strong>{slide.text}</strong>
              {cta ? (
                <span className="bb-promo-cta">
                  {cta} <span aria-hidden="true">»</span>
                </span>
              ) : null}
            </>
          );
          const external = /^https?:\/\//i.test(to);
          return (
            <div
              key={`own-${i}`}
              className={`bb-promo-slide${i === idx % ownSlides.length ? ' bb-promo-slide--on' : ''}`}
              aria-hidden={i !== idx % ownSlides.length}
            >
              {slide.glyph ? (
                <span className="bb-promo-glyph" aria-hidden="true">{slide.glyph}</span>
              ) : null}
              {to ? (
                external ? (
                  <a href={to} className="bb-promo-text" rel="noopener noreferrer">{body}</a>
                ) : (
                  <Link to={to} className="bb-promo-text">{body}</Link>
                )
              ) : (
                <span className="bb-promo-text">{body}</span>
              )}
            </div>
          );
        })}
        {ownSlides.length === 0 &&
          fallbackCampaigns.map((camp, i) => (
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
      {fallbackCampaigns.length > 1 && (
        <div className="bb-promo-dots" aria-hidden="true">
          {fallbackCampaigns.map((_, i) => (
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
