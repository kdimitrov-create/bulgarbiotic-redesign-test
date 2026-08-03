import {monthlyPackages} from '~/lib/quantity-packages';
import {AddToCartButton} from '~/components/AddToCartButton';

const EUR_TO_BGN = 1.95583;

const fmt = (n: number, currency: 'EUR' | 'BGN') =>
  new Intl.NumberFormat('bg-BG', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(n) +
  (currency === 'EUR' ? ' €' : ' лв.');

/**
 * Месечни пакети — the merchant's quantity discounts, presented the way the
 * official store presents them: a course of treatment, not "buy 4 pieces".
 *
 * The single item is deliberately NOT one of the cards — that is what the
 * quantity control underneath already is. These are the multi-month options.
 *
 * Each card both selects (sets the buy-box quantity) and can add straight to
 * the cart, so a shopper who has decided does not have to scroll back down.
 *
 * Renders nothing when the product has no quantity rule in the admin panel.
 */
export function MonthlyPackages({
  product,
  variant,
  singlePriceEur,
  quantity,
  onSelect,
}: {
  product: any;
  variant: any;
  /** The price of one item as the page already shows it, promotions included. */
  singlePriceEur: number;
  quantity: number;
  onSelect: (quantity: number) => void;
}) {
  const packages = monthlyPackages(product?.id, singlePriceEur).filter((p) => p.months > 1);
  if (!packages.length) return null;

  const best = packages.reduce((a, b) => (b.savingPct > a.savingPct ? b : a));
  const longest = packages[packages.length - 1].months;
  const image = product?.featuredImage?.url as string | undefined;

  return (
    <div className="bb-months" aria-label="Месечни пакети">
      <div className="bb-months-head">
        <span className="bb-months-title">Избери твоя курс</span>
        <span className="bb-months-hint">Пробиотиците действат при редовен прием</span>
      </div>

      <div className="bb-months-grid" role="radiogroup" aria-label="Продължителност на приема">
        {packages.map((pkg) => {
          const selected = quantity === pkg.months;
          return (
            <div
              key={pkg.months}
              role="radio"
              tabIndex={0}
              aria-checked={selected}
              className={`bb-month${selected ? ' is-selected' : ''}`}
              onClick={() => onSelect(pkg.months)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(pkg.months);
                }
              }}
            >
              {pkg.savingPct > 0 && pkg.months === best.months && (
                <span className="bb-month-flag">Най-изгодно</span>
              )}

              <div className="bb-month-visual">
                <span className="bb-month-mult">{pkg.months}×</span>
                {image ? (
                  <img
                    src={resize(image, 220)}
                    alt=""
                    aria-hidden="true"
                    // Eager: this sits in the buy box, above the fold.
                    loading="eager"
                    className="bb-month-img"
                    onError={(e) => {
                      const base = image.split('?')[0];
                      if (e.currentTarget.src !== base) e.currentTarget.src = base;
                    }}
                  />
                ) : null}
              </div>

              <span className="bb-month-name">{pkg.months}-месечен пакет</span>
              <span className="bb-month-sub">
                {pkg.months} опаковки · {pkg.months === longest ? 'пълен курс' : 'кратка терапия'}
              </span>

              <span className="bb-month-permonth">
                {fmt(pkg.unitPrice, 'EUR')} <em>/месец</em>
              </span>
              <span className="bb-month-total">
                Общо: <strong>{fmt(pkg.total, 'EUR')}</strong> / {fmt(pkg.total * EUR_TO_BGN, 'BGN')}
              </span>
              {pkg.saving > 0 && (
                <span className="bb-month-save">Спестяваш {fmt(pkg.saving, 'EUR')}</span>
              )}

              {variant?.id && (
                <AddToCartButton
                  merchandiseId={variant.id}
                  quantity={pkg.months}
                  disabled={!variant.availableForSale}
                  className="bb-month-add"
                >
                  Добави
                </AddToCartButton>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        .bb-months { margin: 20px 0 8px; }
        .bb-months-head {
          display: flex; align-items: baseline; justify-content: space-between;
          gap: 10px; flex-wrap: wrap; margin-bottom: 12px;
        }
        .bb-months-title {
          font-size: 13px; font-weight: 800; letter-spacing: 0.05em;
          text-transform: uppercase; color: var(--color-ink);
        }
        .bb-months-hint { font-size: 12px; color: rgba(10, 37, 64, 0.55); }

        .bb-months-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
        }

        .bb-month {
          position: relative;
          display: flex; flex-direction: column; align-items: center; gap: 3px;
          padding: 18px 14px 14px;
          border: 2px solid rgba(10, 37, 64, 0.12);
          border-radius: 18px;
          background: #fff;
          cursor: pointer;
          text-align: center;
          transition: border-color 0.15s, box-shadow 0.15s, transform 0.12s;
        }
        .bb-month:hover { border-color: var(--color-pink-2); transform: translateY(-2px); }
        .bb-month.is-selected {
          border-color: var(--color-brand-pink);
          box-shadow: 0 10px 26px -14px rgba(227, 22, 108, 0.55);
        }

        /* The ribbon overlaps the top edge, so the card carries extra headroom. */
        .bb-month-flag {
          position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
          background: var(--color-brand-pink); color: #fff;
          font-size: 10px; font-weight: 800; letter-spacing: 0.06em;
          text-transform: uppercase; padding: 5px 12px; border-radius: 999px;
          white-space: nowrap; box-shadow: 0 6px 14px -6px rgba(227, 22, 108, 0.7);
        }

        .bb-month-visual {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          margin-bottom: 6px; min-height: 74px;
        }
        .bb-month-mult {
          font-family: var(--font-serif);
          font-size: 26px; font-weight: 600; letter-spacing: -1px;
          color: var(--color-ink); line-height: 1;
        }
        .bb-month-img {
          width: 74px; height: 74px; object-fit: contain;
          background: transparent; border-radius: 0;
        }

        .bb-month-name { font-size: 14.5px; font-weight: 800; color: var(--color-ink); }
        .bb-month-sub { font-size: 11.5px; color: rgba(10, 37, 64, 0.55); margin-bottom: 8px; }

        .bb-month-permonth {
          font-family: var(--font-serif);
          font-size: 22px; font-weight: 600; letter-spacing: -0.6px;
          color: var(--color-brand-pink); line-height: 1.1;
        }
        .bb-month-permonth em { font-style: normal; font-size: 13px; font-weight: 700; }
        .bb-month-total { font-size: 12px; color: rgba(10, 37, 64, 0.62); margin-top: 3px; }
        .bb-month-total strong { color: var(--color-ink); font-weight: 800; }
        .bb-month-save {
          margin-top: 5px; font-size: 11.5px; font-weight: 800;
          color: var(--color-brand-pink);
        }

        /* AddToCartButton wraps its button in a form, which would otherwise
           shrink to its content and leave the CTA half-width. */
        .bb-month form { width: 100%; }
        .bb-month-add {
          margin-top: 12px; width: 100%;
          border: none; border-radius: 12px; cursor: pointer;
          background: var(--color-brand-pink); color: #fff;
          font-family: var(--font-sans);
          font-size: 13.5px; font-weight: 800; letter-spacing: 0.02em;
          padding: 11px 14px;
          transition: background 0.18s, transform 0.12s;
        }
        .bb-month-add:hover:not(:disabled) { background: var(--color-ink); transform: translateY(-1px); }
        .bb-month-add:disabled { opacity: 0.5; cursor: not-allowed; }

        @media (max-width: 400px) {
          .bb-months-grid { grid-template-columns: 1fr; }
          .bb-month-visual { min-height: 62px; }
          .bb-month-img { width: 62px; height: 62px; }
        }
      `}</style>
    </div>
  );
}

/**
 * CloudCart product images are 1920px originals — asking for the size we draw
 * keeps the card cheap. Arbitrary sizes can 404, hence the onError fallback
 * to the plain URL at every call site.
 */
function resize(url: string, px: number): string {
  const base = url.split('?')[0];
  return `${base}?width=${px}&height=${px}`;
}
