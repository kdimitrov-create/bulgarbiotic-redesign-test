import {Link} from 'react-router';
import {Image} from '@cloudcart/nitro-react';
import type {Product} from '@cloudcart/nitro';

interface Props {
  /** Real Family Pack product from CloudCart (null → component hides). */
  product: Product | null;
}

/** BG legal: 1 € = 1.95583 лв (fixed conversion). */
const EUR_TO_BGN = 1.95583;

function fmt(amount: number, currency: 'BGN' | 'EUR'): string {
  return new Intl.NumberFormat('bg-BG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + (currency === 'EUR' ? ' €' : ' лв');
}

/**
 * "Bundle of the day" — promotes Family Pack on the homepage.
 *
 * Now backed by real CloudCart data via the homepage loader (passes
 * `getProduct('family-pack')`). Title, image, price and CTA all come from
 * the live catalog. The "what's in the box" bullet list is still hard-coded
 * marketing copy (the API description is a single paragraph) — easy to swap
 * to `descriptionHtml` rendering if needed.
 *
 * If the product fails to load, the section is hidden gracefully.
 */
export function BundleFeature({product}: Props) {
  if (!product) return null;

  const variant = product.variants?.nodes?.[0];
  const priceObj = variant?.price ?? product.priceRange?.minVariantPrice;
  const amount = parseFloat(priceObj?.amount ?? '0');
  const currency = (priceObj?.currencyCode ?? 'EUR') as 'BGN' | 'EUR';
  const eur = currency === 'EUR' ? amount : amount / EUR_TO_BGN;
  const bgn = currency === 'BGN' ? amount : amount * EUR_TO_BGN;

  return (
    <section className="bb-bundle">
      <div className="bb-container bb-bundle-grid reveal">
        <div>
          <div className="section-tag">Пакет на месеца</div>
          <h2 className="bb-bundle-h2">Не става само с диета и коремни преси.<br /><span className="accent">Баланса започва отвътре.</span></h2>
          <p className="bb-bundle-p">
            Красивата фигура започва със здравия микробиом. Комбинация от продукти, създадени да
            подпомагат храносмилането, да намалят усещането за подуване и да ви помогнат да се
            чувствате по-леки и комфортно всеки ден.
          </p>
          <ul className="bb-bundle-list">
            <li>Намалява подуването и дискомфорта в корема</li>
            <li>Подпомага освобождаването от задържани течности</li>
            <li>Подобрява храносмилането и редовното изхождане</li>
            <li>Подпомага метаболизма и контрола на теглото</li>
          </ul>
          <div className="bb-bundle-pricerow">
            <span className="bb-price-now">{fmt(eur, 'EUR')}</span>
            <span className="bb-price-bgn">{fmt(bgn, 'BGN')}</span>
            {product.availableForSale === false && (
              <span className="bb-out">Изчерпан временно</span>
            )}
          </div>
          <Link
            to={`/product/${product.handle}`}
            className="btn-primary magnetic"
            prefetch="intent"
          >
            {product.availableForSale === false ? 'Виж продукта' : 'Поръчай пакета'}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
        <div className="bb-bundle-image">
          {product.featuredImage?.url ? (
            <Image data={product.featuredImage} alt={product.title} />
          ) : (
            <img src="/images/generated-v2/bundle-family-feature.png" alt={product.title} />
          )}
        </div>
      </div>

      <style>{`
        .bb-bundle {
          background: linear-gradient(135deg, var(--color-cream-2) 0%, var(--color-pink-1) 100%);
          padding: 120px 0;
          position: relative; overflow: hidden;
        }
        .bb-bundle::before {
          content: ""; position: absolute; top: 10%; right: -10%;
          width: 500px; height: 500px;
          background: radial-gradient(circle, var(--color-pink-2) 0%, transparent 70%);
          filter: blur(60px); pointer-events: none;
        }
        .bb-bundle-grid {
          display: grid; grid-template-columns: 1.05fr 1fr;
          gap: 80px; align-items: center;
          position: relative; z-index: 1;
          padding: 0 36px;
        }
        @media (max-width: 980px) { .bb-bundle-grid { grid-template-columns: 1fr; gap: 40px; padding: 0 20px; } }

        .bb-bundle-h2 {
          font-size: clamp(40px, 5.4vw, 68px);
          font-weight: 800; line-height: 0.98;
          letter-spacing: -1.8px;
          color: var(--color-ink); margin-bottom: 26px;
        }
        .bb-bundle-p { font-size: 16px; line-height: 1.75; color: rgba(10, 37, 64, 0.78); max-width: 480px; margin-bottom: 24px; }
        .bb-bundle-list { list-style: none; padding: 0; margin-bottom: 32px; }
        .bb-bundle-list li { font-size: 14px; padding: 8px 0 8px 30px; position: relative; line-height: 1.6; color: rgba(10, 37, 64, 0.78); }
        .bb-bundle-list li::before {
          content: ""; position: absolute; left: 0; top: 14px;
          width: 16px; height: 16px;
          background: var(--color-brand-pink);
          border-radius: 50%;
          box-shadow: 0 0 0 4px var(--color-pink-1);
        }
        .bb-bundle-list li::after {
          content: ""; position: absolute; left: 4px; top: 18px;
          width: 8px; height: 4px;
          border-left: 2px solid white; border-bottom: 2px solid white;
          transform: rotate(-45deg);
        }
        .bb-bundle-pricerow { display: flex; align-items: baseline; gap: 14px; margin-bottom: 26px; flex-wrap: wrap; }
        .bb-price-now {
          font-size: 48px; font-weight: 500; font-style: italic;
          letter-spacing: -1.4px; color: var(--color-ink);
          font-family: var(--font-serif);
        }
        .bb-price-bgn {
          font-size: 18px; font-weight: 600;
          color: rgba(10, 37, 64, 0.55);
          letter-spacing: -0.2px;
        }
        .bb-out {
          background: rgba(10, 37, 64, 0.75); color: white;
          padding: 5px 12px; font-size: 11px; font-weight: 800;
          letter-spacing: 1px; border-radius: 6px;
          text-transform: uppercase;
        }

        .bb-bundle-image {
          aspect-ratio: 1/1;
          border-radius: 28px;
          overflow: hidden;
          box-shadow: 0 40px 80px -20px rgba(10, 37, 64, 0.2);
          transform: rotate(-2deg);
          transition: transform 0.5s ease;
        }
        .bb-bundle-image:hover { transform: rotate(0deg) scale(1.02); }
        .bb-bundle-image img { width: 100%; height: 100%; object-fit: cover; }
      `}</style>
    </section>
  );
}
