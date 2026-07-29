import {useEffect, useRef, useState} from 'react';
import {Link, useFetcher, useNavigate} from 'react-router';
import {Image, Money} from '@cloudcart/nitro-react';

type Props = {
  open: boolean;
  onClose: () => void;
};

const QUICK_PICKS: Array<{label: string; to: string}> = [
  {label: 'Femin', to: '/product/bactology-probiotik-za-jeni-femin'},
  {label: 'Anti Stress', to: '/product/bactology-anti-stress'},
  {label: 'Бебета & Деца', to: '/product/probiotik-za-bebe-deca-i-podrastvashti-babies-and-kids'},
  {label: 'Family Pack', to: '/product/family-pack'},
  {label: 'Перли', to: '/category/perli'},
  {label: 'Pets', to: '/product/bactology-pets'},
];

/**
 * Floating search modal that opens above the current page without losing
 * context. Instant suggestions are fetched via `/api/search-suggest`.
 * ENTER (or "Виж всички резултати") submits to /search?q=… for full results.
 *
 * Closes on: ESC, click outside, "X" button, navigation.
 */
export function SearchOverlay({open, onClose}: Props) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const fetcher = useFetcher<{products: any[]}>();
  const navigate = useNavigate();

  // Focus input + lock body scroll while open
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    // Tiny delay so the focus lands after the fade-in
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  // Reset when closing
  useEffect(() => {
    if (!open) {
      setValue('');
      clearTimeout(debounceRef.current);
    }
  }, [open]);

  function onChange(next: string) {
    setValue(next);
    clearTimeout(debounceRef.current);
    if (next.trim().length < 2) return;
    debounceRef.current = setTimeout(() => {
      fetcher.load(`/api/search-suggest?q=${encodeURIComponent(next.trim())}`);
    }, 250);
  }

  function submit(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    onClose();
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  const products = fetcher.data?.products ?? [];
  const isSearching = fetcher.state === 'loading';
  const trimmed = value.trim();
  const showSuggestions = trimmed.length >= 2;

  if (!open) return null;

  return (
    <div className="bb-search-overlay" role="dialog" aria-modal="true" aria-label="Търсене">
      <button
        type="button"
        className="bb-search-backdrop"
        onClick={onClose}
        aria-label="Затвори търсенето"
      />

      <div className="bb-search-panel">
        <form
          className="bb-search-input-row"
          onSubmit={(e) => {
            e.preventDefault();
            submit(value);
          }}
        >
          <svg className="bb-search-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="M15.5 15.5l4 4" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Търси продукт, серия или състояние…"
            autoComplete="off"
            className="bb-search-input"
          />
          {value && (
            <button
              type="button"
              className="bb-search-clear"
              onClick={() => {
                setValue('');
                inputRef.current?.focus();
              }}
              aria-label="Изчисти"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          )}
          <button
            type="button"
            className="bb-search-close"
            onClick={onClose}
            aria-label="Затвори"
          >
            <kbd>esc</kbd>
          </button>
        </form>

        {!showSuggestions && (
          <div className="bb-search-empty">
            <div className="bb-search-hint">Бързи преки пътища</div>
            <div className="bb-search-chips">
              {QUICK_PICKS.map((q) => (
                <Link
                  key={q.to}
                  to={q.to}
                  prefetch="intent"
                  onClick={onClose}
                  className="bb-search-chip"
                >
                  {q.label}
                </Link>
              ))}
            </div>
            <div className="bb-search-tip">
              Натисни <kbd>Enter</kbd> за пълни резултати, <kbd>Esc</kbd> за затваряне.
            </div>
          </div>
        )}

        {showSuggestions && (
          <div className="bb-search-results">
            {isSearching && products.length === 0 && (
              <div className="bb-search-state">
                <span className="bb-search-spinner" /> Търсене на „{trimmed}“…
              </div>
            )}

            {!isSearching && products.length === 0 && (
              <div className="bb-search-state">
                Няма резултати за <strong>„{trimmed}“</strong>.{' '}
                <button type="button" className="bb-search-link" onClick={() => submit(trimmed)}>
                  Пробвай разширено търсене →
                </button>
              </div>
            )}

            {products.length > 0 && (
              <>
                <ul className="bb-search-list">
                  {products.slice(0, 6).map((p: any) => (
                    <li key={p.id}>
                      <Link
                        to={`/product/${p.handle}`}
                        prefetch="intent"
                        onClick={onClose}
                        className="bb-search-row"
                      >
                        <div className="bb-search-thumb">
                          {p.featuredImage?.url ? (
                            <Image data={p.featuredImage} alt={p.title} />
                          ) : (
                            <img src="/noimage.svg" alt={p.title} />
                          )}
                        </div>
                        <div className="bb-search-meta">
                          <div className="bb-search-name">{p.title}</div>
                          {p.vendor && <div className="bb-search-vendor">{p.vendor}</div>}
                        </div>
                        <div className="bb-search-price">
                          {p.priceRange?.minVariantPrice && (
                            <Money data={p.priceRange.minVariantPrice} />
                          )}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="bb-search-all"
                  onClick={() => submit(trimmed)}
                >
                  Виж всички резултати за „{trimmed}“ →
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <style>{`
        .bb-search-overlay {
          position: fixed; inset: 0;
          z-index: 200;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: clamp(48px, 10vh, 120px);
          animation: bb-search-fade 0.18s ease-out;
        }
        @keyframes bb-search-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .bb-search-backdrop {
          position: absolute; inset: 0;
          background: rgba(10, 37, 64, 0.55);
          backdrop-filter: blur(8px) saturate(160%);
          -webkit-backdrop-filter: blur(8px) saturate(160%);
          border: 0; padding: 0; cursor: pointer;
        }
        .bb-search-panel {
          position: relative;
          width: min(720px, calc(100vw - 32px));
          max-height: calc(100vh - 140px);
          background: var(--color-cream-1);
          border-radius: 18px;
          box-shadow: 0 30px 80px -10px rgba(10, 37, 64, 0.35), 0 8px 24px -8px rgba(10, 37, 64, 0.2);
          overflow: hidden;
          display: flex; flex-direction: column;
          animation: bb-search-pop 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        @keyframes bb-search-pop {
          from { transform: translateY(-12px) scale(0.985); opacity: 0; }
          to   { transform: translateY(0)     scale(1);     opacity: 1; }
        }
        .bb-search-input-row {
          display: flex; align-items: center; gap: 8px;
          padding: 16px 16px;
          border-bottom: 1px solid rgba(10, 37, 64, 0.08);
        }
        .bb-search-glyph {
          width: 22px; height: 22px;
          color: rgba(10, 37, 64, 0.55);
          flex-shrink: 0;
          margin-left: 4px;
        }
        .bb-search-input {
          flex: 1;
          background: transparent; border: 0; outline: 0;
          font-family: inherit;
          font-size: 17px; font-weight: 500;
          color: var(--color-ink);
          padding: 6px 4px;
        }
        .bb-search-input::placeholder { color: rgba(10, 37, 64, 0.4); font-weight: 400; }
        .bb-search-clear, .bb-search-close {
          background: transparent; border: 0;
          color: rgba(10, 37, 64, 0.55);
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .bb-search-clear {
          width: 30px; height: 30px;
          border-radius: 999px;
          transition: background 0.15s, color 0.15s;
        }
        .bb-search-clear:hover { background: var(--color-pink-1); color: var(--color-brand-pink); }
        .bb-search-clear svg { width: 16px; height: 16px; }
        .bb-search-close {
          padding: 6px 10px;
          border-radius: 8px;
          background: rgba(10, 37, 64, 0.06);
          font-size: 11px;
        }
        .bb-search-close:hover { background: rgba(10, 37, 64, 0.12); }
        .bb-search-close kbd {
          font-family: inherit;
          font-size: 11px; font-weight: 700;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          color: rgba(10, 37, 64, 0.7);
        }

        .bb-search-empty {
          padding: 20px 22px 24px;
        }
        .bb-search-hint {
          font-size: 11px; font-weight: 700;
          letter-spacing: 1.4px; text-transform: uppercase;
          color: rgba(10, 37, 64, 0.5);
          margin-bottom: 12px;
        }
        .bb-search-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
        .bb-search-chip {
          display: inline-flex; align-items: center;
          padding: 8px 14px;
          background: white;
          border: 1px solid rgba(10, 37, 64, 0.1);
          border-radius: 999px;
          font-size: 13px; font-weight: 600;
          color: var(--color-ink);
          transition: all 0.15s;
        }
        .bb-search-chip:hover {
          background: var(--color-brand-pink); color: white;
          border-color: var(--color-brand-pink);
          text-decoration: none;
          transform: translateY(-1px);
        }
        .bb-search-tip {
          font-size: 12px; color: rgba(10, 37, 64, 0.5);
        }
        .bb-search-tip kbd {
          display: inline-block;
          padding: 1px 6px;
          background: rgba(10, 37, 64, 0.08);
          border-radius: 4px;
          font-family: inherit;
          font-size: 11px; font-weight: 700;
          margin: 0 2px;
        }

        .bb-search-results { overflow-y: auto; flex: 1; }
        .bb-search-state {
          padding: 28px 22px;
          font-size: 14px;
          color: rgba(10, 37, 64, 0.7);
          display: flex; align-items: center; gap: 10px;
        }
        .bb-search-link {
          background: transparent; border: 0; padding: 0;
          color: var(--color-brand-pink); font: inherit;
          cursor: pointer; text-decoration: underline;
        }
        .bb-search-spinner {
          width: 14px; height: 14px;
          border: 2px solid rgba(10, 37, 64, 0.18);
          border-top-color: var(--color-brand-pink);
          border-radius: 999px;
          display: inline-block;
          animation: bb-spin 0.7s linear infinite;
        }
        @keyframes bb-spin { to { transform: rotate(360deg); } }

        .bb-search-list { list-style: none; margin: 0; padding: 8px; }
        .bb-search-row {
          display: grid;
          grid-template-columns: 56px 1fr auto;
          gap: 14px;
          align-items: center;
          padding: 10px 12px;
          border-radius: 12px;
          color: var(--color-ink);
          transition: background 0.15s;
        }
        .bb-search-row:hover {
          background: white;
          text-decoration: none;
        }
        .bb-search-thumb {
          width: 56px; height: 56px;
          border-radius: 10px;
          background: white;
          overflow: hidden;
          display: flex; align-items: center; justify-content: center;
        }
        .bb-search-thumb img { width: 100%; height: 100%; object-fit: contain; }
        .bb-search-meta { min-width: 0; }
        .bb-search-name {
          font-size: 14px; font-weight: 600;
          line-height: 1.3;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        .bb-search-vendor {
          font-size: 11px; font-weight: 600;
          letter-spacing: 0.6px; text-transform: uppercase;
          color: rgba(10, 37, 64, 0.5);
          margin-top: 2px;
        }
        .bb-search-price {
          font-size: 14px; font-weight: 700;
          color: var(--color-ink);
          white-space: nowrap;
        }

        .bb-search-all {
          width: 100%;
          padding: 14px 20px;
          background: var(--color-ink);
          color: var(--color-cream-1);
          border: 0;
          font: inherit; font-weight: 700; font-size: 13px;
          letter-spacing: 0.3px;
          cursor: pointer;
          transition: background 0.18s;
        }
        .bb-search-all:hover { background: var(--color-brand-pink); }

        @media (max-width: 540px) {
          .bb-search-panel {
            border-radius: 14px;
            width: calc(100vw - 16px);
          }
          .bb-search-input { font-size: 16px; }
          .bb-search-close { display: none; }
          .bb-search-row { grid-template-columns: 48px 1fr auto; gap: 10px; }
          .bb-search-thumb { width: 48px; height: 48px; }
        }
      `}</style>
    </div>
  );
}
