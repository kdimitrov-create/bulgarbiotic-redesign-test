import {useEffect, useRef, useState} from 'react';
import {useRouteLoaderData} from 'react-router';
import {LONGEVITY_PROMO_CODE, sameCode} from '~/lib/longevity-promo';

/** Затворен с ×: не се показва седмица. Ключът носи кода, за да излезе
 *  отново, когато кампанията смени кода. */
const DISMISS_KEY = `bb-longevity-promo-closed-${LONGEVITY_PROMO_CODE.toUpperCase()}`;
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Същата граница, на която хедърът минава в мобилен вид. */
const DESKTOP = '(min-width: 881px)';

/** Изчакване след влизане, за да не скача в лицето още при зареждането. */
const DELAY_MS = 4000;

/**
 * `?promo=preview` показва попъпа веднага, дори да е бил затварян - за
 * проверка на живо. Не пише нищо в паметта на браузъра.
 */
const PREVIEW_PARAM = 'promo';

function recentlyDismissed(now: number): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return at > 0 && now - at < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

/**
 * Малкият попъп с кода на Longevity: на десктоп в левия ъгъл на хедъра, на
 * телефон точно под него. Показва се на всички посетители, на всички страници.
 */
export function LongevityPromo() {
  const rootData = useRouteLoaderData<{live?: {announcedCodes?: string[]} | null}>('root');
  const announced = rootData?.live?.announcedCodes;
  // Няма ли данни от панела (админът не отговаря), приемаме, че кодът действа:
  // правилото е без краен срок. Има ли данни и кодът го няма - угасва.
  const codeLive = announced ? announced.some((c) => sameCode(c, LONGEVITY_PROMO_CODE)) : true;

  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [top, setTop] = useState<number | null>(null);
  const preview = useRef(false);

  useEffect(() => {
    const now = Date.now();
    const params = new URLSearchParams(window.location.search);
    preview.current = params.get(PREVIEW_PARAM) === 'preview';

    if (!preview.current) {
      if (!codeLive) return;
      if (recentlyDismissed(now)) return;
    }

    const timer = window.setTimeout(() => setOpen(true), preview.current ? 300 : DELAY_MS);
    return () => window.clearTimeout(timer);
    // Решава се веднъж на посещение, при първото зареждане.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Спрат ли кода в панела, докато човек разглежда - скрива се на следващата навигация.
  useEffect(() => {
    if (!codeLive && !preview.current) setOpen(false);
  }, [codeLive]);

  // На десктоп стои В полето на хедъра, центриран по височина; на телефон -
  // точно под него. Хедърът е sticky и се свива при скрол, а промо лентата
  // над него излиза от екрана - затова се мери, а не се пише число.
  useEffect(() => {
    if (!open) return;
    const header = document.querySelector('.bb-header');
    let frame = 0;
    const measure = () => {
      frame = 0;
      const rect = header?.getBoundingClientRect();
      const bottom = rect?.bottom ?? 0;
      if (rect && window.matchMedia(DESKTOP).matches) {
        // средата на хедъра; самият попъп се центрира с translateY(-50%)
        setTop(Math.round(Math.max(0, rect.top) + (bottom - Math.max(0, rect.top)) / 2));
      } else {
        setTop(Math.max(0, Math.round(bottom)) + 10);
      }
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', schedule, {passive: true});
    window.addEventListener('resize', schedule);
    const observer = header && 'ResizeObserver' in window ? new ResizeObserver(schedule) : null;
    if (header) observer?.observe(header);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      observer?.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [open]);

  if (!open || top === null) return null;

  const close = () => {
    setOpen(false);
    if (preview.current) return;
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* частен режим - ще се покаже пак при следващото зареждане */
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(LONGEVITY_PROMO_CODE);
    } catch {
      // Стар браузър или отказан достъп: маркираме кода, за да се копира на ръка.
      const el = document.getElementById('bb-lpromo-code');
      if (el) window.getSelection()?.selectAllChildren(el);
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  };

  return (
    <aside className="bb-lpromo" style={{top}} role="complementary" aria-label="Промо код за серията Longevity">
      <button type="button" className="bb-lpromo-close" onClick={close} aria-label="Затвори">
        ×
      </button>
      <p className="bb-lpromo-title">
        <span className="bb-lpromo-badge">−30%</span> на серията Longevity
      </p>
      <div className="bb-lpromo-row">
        <code id="bb-lpromo-code" className="bb-lpromo-code">
          {LONGEVITY_PROMO_CODE}
        </code>
        <button type="button" className="bb-lpromo-copy" onClick={copy}>
          {copied ? 'Копирано ✓' : 'Копирай'}
        </button>
      </div>

      <style>{`
        .bb-lpromo {
          position: fixed;
          left: 16px;
          /* Под хедъра (z 50), за да минава мега менюто отгоре, но над
             залепващите ленти в страниците (z 20). */
          z-index: 40;
          width: 244px;
          max-width: calc(100vw - 32px);
          padding: 12px 14px 12px;
          background: var(--color-cream-1, #faf6ec);
          color: var(--color-ink, #0a2540);
          border: 1px solid rgba(10, 37, 64, 0.1);
          border-left: 3px solid var(--color-brand-pink, #e3166c);
          border-radius: 12px;
          box-shadow: 0 10px 28px -12px rgba(10, 37, 64, 0.35);
          font-size: 13px;
          line-height: 1.35;
          animation: bb-lpromo-in 0.35s ease-out;
        }
        @keyframes bb-lpromo-in {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .bb-lpromo { animation: none; }
        }
        body.bb-drawer-open .bb-lpromo { display: none; }
        .bb-lpromo-close {
          position: absolute;
          top: 4px;
          right: 6px;
          width: 26px;
          height: 26px;
          border: 0;
          background: transparent;
          color: inherit;
          opacity: 0.55;
          font-size: 18px;
          line-height: 1;
          cursor: pointer;
        }
        .bb-lpromo-close:hover { opacity: 1; }
        .bb-lpromo-title {
          margin: 0 22px 8px 0;
          font-weight: 700;
          font-size: 14px;
        }
        .bb-lpromo-badge { color: var(--color-brand-pink, #e3166c); }
        .bb-lpromo-row { display: flex; gap: 8px; align-items: stretch; }
        .bb-lpromo-code {
          flex: 1;
          padding: 6px 8px;
          border: 1px dashed var(--color-brand-blue, #0267a0);
          border-radius: 8px;
          background: #fff;
          color: var(--color-brand-blue, #0267a0);
          font-family: inherit;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-align: center;
          user-select: all;
        }
        .bb-lpromo-copy {
          padding: 6px 10px;
          border: 0;
          border-radius: 8px;
          background: var(--color-brand-blue, #0267a0);
          color: #fff;
          font-weight: 600;
          font-size: 12px;
          cursor: pointer;
          white-space: nowrap;
        }
        .bb-lpromo-copy:hover { filter: brightness(1.08); }
        /* Десктоп: компактна лента в полето на хедъра, над него (z 50). */
        @media ${DESKTOP} {
          .bb-lpromo {
            z-index: 55;
            width: auto;
            padding: 8px 14px;
            transform: translateY(-50%);
            animation-name: bb-lpromo-in-desk;
          }
          .bb-lpromo-title { margin: 0 26px 6px 0; white-space: nowrap; }
          .bb-lpromo-code { padding: 4px 10px; }
          .bb-lpromo-copy { padding: 4px 10px; }
        }
        @keyframes bb-lpromo-in-desk {
          from { opacity: 0; transform: translateY(calc(-50% - 6px)); }
          to { opacity: 1; transform: translateY(-50%); }
        }
        @media (max-width: 480px) {
          .bb-lpromo { left: 12px; width: 220px; padding: 10px 12px; }
        }
      `}</style>
    </aside>
  );
}
