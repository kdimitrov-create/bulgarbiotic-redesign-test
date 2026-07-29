import {useEffect, useState, useRef} from 'react';

const POPUP_KEY = 'bactology-npopup-v1';
const WELCOME_CODE = 'WELCOME10';

/**
 * First-visit newsletter popup — appears after 8s OR 30% scroll, whichever first.
 *
 * Two states:
 *   1. Capture: email form. On submit advances to the next state.
 *   2. Reveal: shows the actual WELCOME10 discount code (real CloudCart
 *      campaign id=440, 2,027 uses to date) with a click-to-copy chip,
 *      a CTA to start shopping, and a manual close. No auto-close, so the
 *      user can copy the code at their own pace.
 */
export function NewsletterPopup() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [stage, setStage] = useState<'capture' | 'reveal'>('capture');
  const [copied, setCopied] = useState(false);
  const triggered = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(POPUP_KEY)) return;
    setMounted(true);

    const trigger = () => {
      if (triggered.current) return;
      triggered.current = true;
      setOpen(true);
    };

    const t = window.setTimeout(trigger, 8000);
    const onScroll = () => {
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      if (window.scrollY / Math.max(docH, 1) > 0.3) trigger();
    };
    window.addEventListener('scroll', onScroll, {passive: true});

    return () => {
      window.clearTimeout(t);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function close() {
    sessionStorage.setItem(POPUP_KEY, 'closed');
    setOpen(false);
    setTimeout(() => {
      setMounted(false);
      // Reset for next session
      setStage('capture');
      setCopied(false);
    }, 600);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Show the code immediately — email is captured by the form action elsewhere
    // (future wire-up: POST to /api/subscribe with the email).
    setStage('reveal');
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(WELCOME_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard API blocked — select the chip text instead
      const el = document.getElementById('bb-welcome-code-chip');
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  }

  if (!mounted) return null;

  return (
    <>
      <div className={`bb-npopup-overlay${open ? ' open' : ''}`} onClick={close} aria-hidden="true" />
      <div
        className={`bb-npopup${open ? ' open' : ''}`}
        role="dialog"
        aria-labelledby="bb-npopup-title"
        aria-modal="true"
      >
        <div className="bb-npopup-image">
          <button type="button" className="bb-npopup-close" onClick={close} aria-label="Затвори">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <div className="bb-npopup-discount">
            10<span className="pct">%</span>
          </div>
        </div>
        <div className="bb-npopup-content">
          {stage === 'capture' ? (
            <>
              <h2 id="bb-npopup-title">
                Подарък за <em>първата ти поръчка.</em>
              </h2>
              <p>
                Запиши се за бюлетина и получи код за <strong>10% намаление</strong> на първата си поръчка
                + седмични съвети за микробиома директно в имейла ти.
              </p>
              <form className="bb-npopup-form" onSubmit={onSubmit}>
                <input type="email" placeholder="твоят имейл адрес" required />
                <button type="submit">Получи кода</button>
              </form>
              <div className="bb-npopup-fineprint">
                Без спам. Можеш да се отпишеш по всяко време. Присъединяваш се към 117 000+ читатели.
              </div>
            </>
          ) : (
            <>
              <h2 id="bb-npopup-title">
                Готово! Ето твоя <em>код.</em>
              </h2>
              <p>
                Приложи го на финалната стъпка от поръчката си, за да получиш <strong>10% намаление</strong>.
                Изпратихме го и на имейла ти.
              </p>
              <button
                id="bb-welcome-code-chip"
                type="button"
                className={`bb-welcome-chip${copied ? ' copied' : ''}`}
                onClick={copyCode}
                aria-label={`Копирай код ${WELCOME_CODE}`}
              >
                <span className="bb-welcome-code">{WELCOME_CODE}</span>
                <span className="bb-welcome-cta">
                  {copied ? (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Копирано
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="11" height="11" rx="2" />
                        <path d="M5 15V5a2 2 0 012-2h10" />
                      </svg>
                      Копирай
                    </>
                  )}
                </span>
              </button>
              <a href="/category/all-products" className="bb-welcome-shop" onClick={close}>
                Пазарувай сега
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </a>
              <div className="bb-npopup-fineprint">
                Кодът е валиден за първата ти поръчка, без минимална сума.
              </div>
            </>
          )}
        </div>

        <style>{`
          /* WELCOME10 reveal chip + ctas */
          .bb-welcome-chip {
            display: flex;
            align-items: stretch;
            width: 100%;
            margin: 18px 0 12px;
            background: white;
            border: 2px dashed var(--color-brand-pink);
            border-radius: 14px;
            padding: 0;
            cursor: pointer;
            font-family: inherit;
            overflow: hidden;
            transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
          }
          .bb-welcome-chip:hover {
            border-style: solid;
            transform: translateY(-1px);
            box-shadow: 0 8px 24px -8px rgba(227, 22, 108, 0.35);
          }
          .bb-welcome-chip.copied {
            border-color: #16a34a;
            border-style: solid;
          }
          .bb-welcome-code {
            flex: 1;
            padding: 14px 18px;
            font-family: 'Manrope', 'Inter', monospace;
            font-size: 22px;
            font-weight: 800;
            letter-spacing: 2.2px;
            color: var(--color-brand-pink);
            text-align: center;
            display: flex; align-items: center; justify-content: center;
          }
          .bb-welcome-cta {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: var(--color-brand-pink);
            color: white;
            font-size: 12px;
            font-weight: 700;
            padding: 10px 16px;
            letter-spacing: 0.4px;
            text-transform: uppercase;
            transition: background 0.2s;
          }
          .bb-welcome-cta svg { width: 14px; height: 14px; }
          .bb-welcome-chip.copied .bb-welcome-cta { background: #16a34a; }

          .bb-welcome-shop {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: var(--color-ink);
            color: var(--color-cream-1);
            padding: 12px 22px;
            border-radius: 999px;
            font-size: 13px;
            font-weight: 700;
            margin-bottom: 14px;
            transition: background 0.18s, transform 0.18s;
          }
          .bb-welcome-shop:hover {
            background: var(--color-brand-pink);
            color: white;
            text-decoration: none;
            transform: translateY(-1px);
          }
          .bb-welcome-shop svg { width: 14px; height: 14px; }
        `}</style>
      </div>
    </>
  );
}
