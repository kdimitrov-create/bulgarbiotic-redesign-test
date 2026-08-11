import {useState} from 'react';
import {Link, useSearchParams, useNavigate} from 'react-router';
import type {Filter} from '@cloudcart/nitro';
import {ProductFilters} from './ProductFilters';
import {ProbioticFinderModal} from './ProbioticFinderModal';

interface Props {
  filters?: Filter[];
  totalCount?: number | null;
  /** Optional list of CloudCart collections to surface in the discovery nav. */
  collections?: Array<{id: string; title: string; handle: string; productsCount?: number | null}>;
}

/** Quick filter pills — toggle a single URL param like ?onSale=true. */
const QUICK_FILTERS: Array<{key: string; value: string; label: string}> = [
  {key: 'onSale',     value: 'true', label: 'Само промоции'},
  {key: 'isFeatured', value: 'true', label: 'Бестселъри'},
  {key: 'isNew',      value: 'true', label: 'Ново'},
  {key: 'available',  value: 'true', label: 'В наличност'},
];

/** Curated "Find by need" nav — points to existing collections + landing
 *  pages. Keeps the listing's sidebar useful even when API facets are sparse. */
const DISCOVERY_NAV: Array<{label: string; to: string; icon: JSX.Element}> = [
  {
    label: 'За жени',
    to: '/category/probiotik-za-jeni',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="6.5" r="3" />
        <path d="M12 9.5v10M9 14h6" />
      </svg>
    ),
  },
  {
    label: 'За деца',
    to: '/category/probiotik-za-deca',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="7" r="2.8" />
        <path d="M7.5 19c1-3 2.5-4.2 4.5-4.2s3.5 1.2 4.5 4.2" />
        <path d="M9.5 22h5" />
      </svg>
    ),
  },
  {
    label: 'За бременни',
    to: '/page/probiotik-za-bremenni',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="9" r="5" />
        <path d="M12 14v6M9 18h6" />
      </svg>
    ),
  },
  {
    label: 'Красота',
    to: '/page/kosa-koja-i-nokti',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l2.4 5 5.6.6-4 4 1 5.4L12 15l-5 3 1-5.4-4-4 5.6-.6z" />
      </svg>
    ),
  },
  {
    label: 'Перли с шоколад',
    to: '/category/perli',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="14" r="3.4" />
        <circle cx="16" cy="14" r="3.4" />
        <circle cx="12.5" cy="8" r="3.4" />
      </svg>
    ),
  },
  {
    label: 'За домашни любимци',
    to: '/product/bactology-pets',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="17" rx="4.2" ry="3.1" />
        <ellipse cx="5.6" cy="11" rx="1.5" ry="2.1" />
        <ellipse cx="18.4" cy="11" rx="1.5" ry="2.1" />
        <ellipse cx="9" cy="6.8" rx="1.5" ry="2.1" />
        <ellipse cx="15" cy="6.8" rx="1.5" ry="2.1" />
      </svg>
    ),
  },
  {
    label: 'Пакети с отстъпка',
    to: '/category/packages',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 8l9-5 9 5v8l-9 5-9-5z" />
        <path d="M3 8l9 5 9-5M12 13v8" />
      </svg>
    ),
  },
];

/**
 * Enhanced listing sidebar — replaces the previous "just filters" panel.
 *
 * Structure (top → bottom):
 *   1. Quiz CTA card   — "Не знаеш кой? Намери за 30 сек" → opens FinderModal
 *   2. Quick filters   — pill chips that toggle ?onSale, ?isFeatured, etc.
 *   3. Discovery nav   — curated icon links to top categories + landing pages
 *   4. API filters     — dynamic facets from CloudCart (price, vendor, etc.)
 *   5. Trust block     — free shipping / 24-48h / 30-day returns
 *
 * Tested entry points: /products, /collections/$handle
 */
export function ListingAside({filters = [], totalCount, collections}: Props) {
  const [quizOpen, setQuizOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  function toggleQuick(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (params.get(key) === value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete('cursor');
    params.delete('direction');
    navigate(`?${params.toString()}`, {preventScrollReset: true});
  }

  const collectionNav = collections && collections.length > 0
    ? collections.filter((c) => (c.productsCount ?? 0) > 0).slice(0, 6)
    : null;

  return (
    <>
      <div className="bb-aside-stack">
        {/* 1. Quiz CTA */}
        <div className="bb-aside-quiz">
          <div className="bb-aside-quiz-title">Не знаеш кой ти трябва?</div>
          <div className="bb-aside-quiz-sub">
            2 въпроса — реална препоръка от каталога ни за 30 секунди.
          </div>
          <button
            type="button"
            className="bb-aside-quiz-btn"
            onClick={() => setQuizOpen(true)}
          >
            Намери за мен
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>

        {/* 2. Quick filter chips */}
        <div>
          <h4 className="bb-aside-section-h">Бързи филтри</h4>
          <div className="bb-aside-quick">
            {QUICK_FILTERS.map((f) => {
              const active = searchParams.get(f.key) === f.value;
              return (
                <button
                  key={f.key}
                  type="button"
                  className={`bb-aside-quick-chip${active ? ' active' : ''}`}
                  onClick={() => toggleQuick(f.key, f.value)}
                  aria-pressed={active}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Discovery nav */}
        <div>
          <h4 className="bb-aside-section-h">Намери по нужда</h4>
          <nav className="bb-aside-nav" aria-label="Категории">
            {DISCOVERY_NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="bb-aside-nav-item"
                prefetch="intent"
              >
                <span className="bb-aside-nav-icon" aria-hidden="true">{item.icon}</span>
                <span className="bb-aside-nav-label">{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* Optional: real collections from API */}
        {collectionNav && collectionNav.length > 0 && (
          <div>
            <h4 className="bb-aside-section-h">Категории</h4>
            <nav className="bb-aside-nav">
              {collectionNav.map((c) => (
                <Link
                  key={c.id}
                  to={`/category/${c.handle}`}
                  className="bb-aside-nav-item"
                  prefetch="intent"
                >
                  <span className="bb-aside-nav-label">{c.title}</span>
                  {c.productsCount != null && (
                    <span className="bb-aside-nav-count">{c.productsCount}</span>
                  )}
                </Link>
              ))}
            </nav>
          </div>
        )}

        {/* 4. API filters (price + vendor + dynamic facets) */}
        <div>
          <h4 className="bb-aside-section-h">Уточни</h4>
          <ProductFilters filters={filters} totalCount={totalCount} hideSort />
        </div>

        {/* 5. Trust block */}
        <div className="bb-aside-trust">
          <div className="bb-aside-trust-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="6" width="14" height="12" rx="2" />
              <path d="M17 10h3l1.5 3v5h-4.5" />
              <circle cx="7" cy="20" r="2" />
              <circle cx="17.5" cy="20" r="2" />
            </svg>
            <span>Безплатна доставка над 50 €</span>
          </div>
          <div className="bb-aside-trust-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3.5 2" />
            </svg>
            <span>Доставка за 24-48 часа</span>
          </div>
          <div className="bb-aside-trust-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l8 4v5c0 5-3.5 8.5-8 9.5C7.5 20.5 4 17 4 12V7l8-4z" />
              <path d="M9 12.5l2 2 4.5-4.5" />
            </svg>
            <span>30 дни гаранция за връщане</span>
          </div>
        </div>
      </div>

      <ProbioticFinderModal open={quizOpen} onClose={() => setQuizOpen(false)} />
    </>
  );
}
