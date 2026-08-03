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
                    src={resize(image, 420)}
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
                {/* The photo is portrait, so it is drawn oversized and cut off.
                    The gradient does the cutting instead of a hard edge — a
                    straight crop across a product box reads as a broken image. */}
                <span className="bb-month-fade" aria-hidden="true" />
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
          padding: 0 14px 14px;
          border: 2px solid rgba(10, 37, 64, 0.12);
          border-radius: 18px;
          background: #fff;
          cursor: pointer;
          text-align: center;
          overflow: hidden;
          transition: border-color 0.15s, box-shadow 0.15s, transform 0.12s;
        }
        .bb-month:hover { border-color: var(--color-pink-2); transform: translateY(-2px); }
        .bb-month.is-selected {
          border-color: var(--color-brand-pink);
          box-shadow: 0 10px 26px -14px rgba(227, 22, 108, 0.55);
        }

        /* Inside the card now: the photo runs to the edges and the card clips
           its overflow, so a ribbon straddling the top border would be cut in
           half. Top-right, opposite the multiplier. */
        .bb-month-flag {
          position: absolute; top: 10px; right: 10px; z-index: 4;
          background: var(--color-brand-pink); color: #fff;
          font-size: 9.5px; font-weight: 800; letter-spacing: 0.06em;
          text-transform: uppercase; padding: 5px 10px; border-radius: 999px;
          white-space: nowrap; box-shadow: 0 6px 14px -6px rgba(227, 22, 108, 0.7);
        }

        /* The photo gets the whole width of the card and is cropped by the
           container; the fade below turns the crop into a soft landing. */
        .bb-month-visual {
          position: relative;
          width: calc(100% + 28px); margin: 0 -14px 4px;
          height: 132px; overflow: hidden;
          background: radial-gradient(120% 90% at 50% 0%, #fff 0%, var(--color-cream-2) 100%);
        }
        .bb-month-mult {
          position: absolute; left: 10px; top: 10px; z-index: 3;
          width: 38px; height: 38px; border-radius: 50%;
          background: var(--color-ink); color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-serif);
          font-size: 15px; font-weight: 600; letter-spacing: -0.5px;
        }
        .bb-month-img {
          position: absolute; left: 50%; top: 6px; transform: translateX(-50%);
          height: 190px; width: auto; max-width: none;
          object-fit: contain; background: transparent; border-radius: 0;
          aspect-ratio: auto;
        }
        .bb-month-fade {
          position: absolute; left: 0; right: 0; bottom: 0; height: 62px; z-index: 2;
          background: linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, #fff 78%);
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
        /* Same green as the main "Купи" button (#15803d = the "В наличност"
           green), so the two CTAs on the page behave identically on hover. */
        .bb-month-add:hover:not(:disabled) { background: #15803d; transform: translateY(-1px); }
        .bb-month-add:disabled { opacity: 0.5; cursor: not-allowed; }

        @media (max-width: 400px) {
          /* One per row here, so the photo has the full column width to fill. */
          .bb-months-grid { grid-template-columns: 1fr; }
          .bb-month-visual { height: 150px; }
          .bb-month-img { height: 215px; }
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
