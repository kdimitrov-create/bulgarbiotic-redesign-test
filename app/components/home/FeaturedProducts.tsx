import {Link} from 'react-router';
import type {Product} from '@cloudcart/nitro';
import {ProductRail} from '~/components/home/ProductRail';

/**
 * "Продукти на фокус" — the two-column section head plus the product rail.
 *
 * The cards and the rail itself live in `ProductRail`, shared with the page
 * builder's showcase widget.
 */
export function FeaturedProducts({products}: {products: Product[]}) {
  return (
    <section className="bb-featured">
      <div className="bb-container">
        <div className="bb-section-head reveal">
          <div>
            <div className="section-tag">Всекидневна подкрепа</div>
            <h2 className="section-h2">Здравето започва в <span className="accent">микробиома.</span><br />Грижата започва с <span className="accent">превенция.</span></h2>
          </div>
          <div>
            <p className="bb-section-sub">Формули с научно доказани щамове за устойчива поддръжка на храносмилането, имунитета и женското здраве.</p>
            <Link to="/category/all-products" className="bb-text-link">
              Виж всички 25+ продукта
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
            </Link>
          </div>
        </div>

        <ProductRail products={products} />
      </div>

      <style>{`
        .bb-featured { background: var(--color-cream-1); padding: 110px 0; position: relative; }
        .bb-section-head {
          display: grid; grid-template-columns: 1.5fr 1fr;
          gap: 50px; align-items: end; margin-bottom: 52px;
          padding: 0 36px;
        }
        @media (max-width: 880px) { .bb-section-head { grid-template-columns: 1fr; gap: 24px; padding: 0 20px; } }
        .bb-section-sub { font-size: 15px; color: rgba(10, 37, 64, 0.78); line-height: 1.7; max-width: 380px; margin-bottom: 18px; }
        .bb-text-link { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; color: var(--color-ink); border-bottom: 1.5px solid var(--color-ink); padding-bottom: 3px; transition: color 0.2s, border-color 0.2s; }
        .bb-text-link:hover { color: var(--color-brand-pink); border-color: var(--color-brand-pink); }
      `}</style>
    </section>
  );
}
