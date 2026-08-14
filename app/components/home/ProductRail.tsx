import {Link, useFetcher} from 'react-router';
import {useEffect, useRef} from 'react';
import type {Product} from '@cloudcart/nitro';
import {Money} from '@cloudcart/nitro-react';
import {displayDiscountPercent} from '~/lib/active-discounts';
import {markPricing, markDiscount} from '~/lib/product-marks';
import {DiscountCountdown} from '~/components/DiscountCountdown';
import {ProductMarks} from '~/components/ProductMarks';

import {SHOW_BGN, EUR_TO_BGN} from '~/lib/currency';
import {CART_ACTION} from '~/lib/cart-action';
import {useOpenCartOnAdd} from '~/lib/use-open-cart-on-add';
/**
 * The horizontal product slider used on the homepage — and by the page
 * builder's "Продуктова витрина" widget, so a showcase the merchant assembles
 * in the panel gets exactly these cards instead of a second, drifting design.
 *
 * Headings live outside: the homepage section supplies its own two-column head,
 * a builder row supplies a Заглавие/Текст block. This is only the rail.
 */

/**
 * "Купи" button for a card. Adds to cart via a fetcher (programmatic submit —
 * no <form> element, so it works inside the card's <Link>). Opens the cart
 * drawer on success. Client: add buy + favorites buttons to the carousel.
 */
function CarouselBuyButton({merchandiseId}: {merchandiseId: string}) {
  const fetcher = useFetcher();
  const isAdding = fetcher.state !== 'idle';

  // Чекмеджето се отваря при всяко успешно добавяне, откъдето и да идва.
  useOpenCartOnAdd(fetcher);
  // Чекмеджето вече не изскача: клиентът остава на страницата и получава
  // зелено потвърждение. Прехвърлянето към платформата е в CartSync.
  return (
    <button
      type="button"
      className="bb-pcard-buy"
      disabled={isAdding}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        fetcher.submit(
          {action: 'ADD_TO_CART', merchandiseId, quantity: '1'},
          {method: 'post', action: CART_ACTION},
        );
      }}
    >
      {isAdding ? (
        'Добавям…'
      ) : (
        <>
          Добави
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5.5 8h13l-1.2 10.5a1.6 1.6 0 01-1.6 1.5H8.3a1.6 1.6 0 01-1.6-1.5L5.5 8z" />
            <path d="M9 8a3 3 0 016 0" />
          </svg>
        </>
      )}
    </button>
  );
}

// Bulgaria fixed-rate dual currency display (EUR transition period — legal req).
// Bulgaria adopted EUR on Jan 1 2025 — storefront returns EUR amounts.
// We display EUR as the primary price and BGN as the legally-required secondary.
/** Format an EUR amount to its BGN equivalent for the dual-currency secondary line. */
function eurToBgnLabel(money: {amount: string; currencyCode?: string} | null | undefined): string {
  if (!money) return '';
  const n = parseFloat(money.amount);
  if (!isFinite(n)) return '';
  // If API returns BGN (legacy), the value is already BGN. Otherwise convert from EUR.
  const bgn = (money.currencyCode ?? 'EUR') === 'BGN' ? n : n * EUR_TO_BGN;
  return `${bgn.toFixed(2)} лв`;
}

/**
 * Image picker for a card.
 *
 * Products carry real CloudCart CDN photos (client: original box colours).
 * Raw CDN images are 1920px, so we resize to card width (600px) to keep the
 * rail light. Local PNGs are already sized and pass through untouched.
 */
function pickImage(p: Product): string {
  const url = p.featuredImage?.url;
  if (!url) return '/noimage.svg';
  if (url.includes('cdncloudcart.com')) {
    return url.includes('?') ? `${url}&width=600` : `${url}?width=600`;
  }
  return url;
}

export function ProductRail({
  products,
  limit = 10}: {
  products: Product[];
  limit?: number;
}) {
  const items = (products || []).slice(0, limit);

  // Arrows nudge the rail by ~one card width; native scroll / swipe do the rest.
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (delta: number) => {
    scrollRef.current?.scrollBy({left: delta, behavior: 'smooth'});
  };

  if (!items.length) {
    return (
      <div className="bb-pgrid-empty reveal">
        <p>Зареждане на продукти от каталога…</p>
      </div>
    );
  }

  return (
    <>
      <div ref={scrollRef} className="bb-pgrid reveal">
        {items.map((p, i) => {
          const rating = p.reviewSummary;
          // Resolve effective sale + msrp exactly like the category ProductCard
          // (variant.compareAtPrice → product.discount.msrpPrice → synthesised),
          // so on-sale products turn the price pink — same as the PDP.
          const {price: effectivePrice, compareAtPrice: effectiveMsrp} = markPricing(p);
          const effectivePct = displayDiscountPercent(
            null,
            parseFloat(effectivePrice?.amount ?? '0'),
            parseFloat(effectiveMsrp?.amount ?? '0'),
          );
          // `Money` throws when a price has no currency, and a throw here takes
          // the whole page down with a 500 — so a price missing one is simply
          // not drawn.
          const hasDiscount = !!effectiveMsrp?.currencyCode;
          const showPrice = !!effectivePrice?.currencyCode;
          // „Скрий цената на отстъпката" от панела - зачертаната цена пада,
          // намалената остава.
          const showMsrp = hasDiscount && markDiscount(p)?.hidePrice !== true;
          return (
            <Link
              key={p.id}
              to={`/product/${p.handle}`}
              className="bb-pcard"
              prefetch="intent"
            >
              {/* „Любими“ е изключено в модула „Продуктов каталог“ (клиент 2026-08-04). */}
              <div className="bb-pcard-image">
                <img
                  src={pickImage(p)}
                  alt={p.featuredImage?.altText || p.title}
                  loading={i < 2 ? 'eager' : 'lazy'}
                  onError={(e) => {
                    const base = p.featuredImage?.url;
                    if (base && e.currentTarget.src !== base) e.currentTarget.src = base;
                  }}
                />
                <div className="bb-pcard-overlay">
                  <div className="bb-pcard-quick">Бърз преглед →</div>
                </div>
                {/* Same badges, from the same source, as every other listing. */}
                <ProductMarks product={p} discountPct={hasDiscount ? effectivePct : 0} size="sm" />
              </div>
              <div className="bb-pcard-body">
                {/* Client (2026-07): home carousel cards carry the SAME info
                    as the category listing cards — title, rating, price, then
                    the "Купи" + "в любими" buttons. */}
                <h3 className="bb-pcard-name">{p.title}</h3>

                <div className="bb-pcard-bottom">
                  <div className="bb-pcard-pricewrap">
                    <div className="bb-pcard-price-row">
                      {showPrice && (
                        <span className={`bb-pcard-price${hasDiscount ? ' bb-pcard-price--sale' : ''}`}>
                          <Money data={effectivePrice as any} />
                        </span>
                      )}
                      {showMsrp && effectiveMsrp && (
                        <span className="bb-pcard-msrp">
                          <Money data={effectiveMsrp as any} />
                        </span>
                      )}
                    </div>
                    {SHOW_BGN && (
                      <div className="bb-pcard-eur">
                        {showMsrp && effectiveMsrp && (
                          <span className="bb-pcard-eur-old">
                            {eurToBgnLabel(effectiveMsrp as any)}
                          </span>
                        )}
                        {eurToBgnLabel(effectivePrice as any)}
                      </div>
                    )}
                    <DiscountCountdown product={p} surface="listing" />
                  </div>
                  {rating && rating.totalCount > 0 ? (
                    <div className="bb-pcard-rating" title={`${rating.totalCount} ревюта`}>
                      <span className="bb-stars" aria-hidden>★★★★★</span>
                      {rating.averageRating.toFixed(1)}
                    </div>
                  ) : (
                    <div className="bb-pcard-rating bb-pcard-rating-soft">
                      <span className="bb-stars" aria-hidden>★★★★★</span>
                      <span>нов</span>
                    </div>
                  )}
                </div>

                {(p as any).variants?.nodes?.[0]?.id && (
                  <CarouselBuyButton merchandiseId={(p as any).variants.nodes[0].id} />
                )}
              </div>
            </Link>
          );
        })}
      </div>
      <div className="bb-featured-controls reveal">
        <span className="bb-featured-hint">Плъзни за още →</span>
        <div className="bb-featured-arrows">
          <button type="button" className="bb-fc-arrow" onClick={() => scroll(-360)} aria-label="Предишни продукти">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <button type="button" className="bb-fc-arrow" onClick={() => scroll(360)} aria-label="Следващи продукти">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>
      </div>

      <style>{`
        /* Horizontal product slider — flex row of fixed-width cards with
         * native scroll-snap. Arrows nudge by ~one card; swipe/scroll do the rest. */
        .bb-pgrid {
          display: flex; gap: 18px;
          /* Картите се изравняват по най-високата, за да не стърчат дъната. */
          align-items: stretch;
          padding: 4px 36px 10px;
          overflow-x: auto; overflow-y: hidden;
          scroll-snap-type: x mandatory;
          scroll-padding-left: 36px;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .bb-pgrid::-webkit-scrollbar { display: none; }
        .bb-pgrid > .bb-pcard { flex: 0 0 300px; scroll-snap-align: start; }
        @media (max-width: 600px) {
          .bb-pgrid { gap: 14px; padding: 4px 16px 10px; scroll-padding-left: 16px; }
          .bb-pgrid > .bb-pcard { flex: 0 0 82%; }
        }

        /* Slider controls — swipe hint + prev/next arrows, right-aligned. */
        .bb-featured-controls {
          display: flex; align-items: center; justify-content: flex-end;
          gap: 16px; padding: 14px 36px 0;
        }
        @media (max-width: 600px) { .bb-featured-controls { padding: 12px 16px 0; } }
        .bb-featured-hint { font-size: 12px; font-weight: 700; color: rgba(10, 37, 64, 0.5); letter-spacing: 0.3px; }
        .bb-featured-arrows { display: flex; gap: 10px; }
        .bb-fc-arrow {
          width: 42px; height: 42px; border-radius: 999px;
          background: white; border: 1px solid rgba(10, 37, 64, 0.12);
          color: var(--color-ink);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.2s;
        }
        .bb-fc-arrow:hover { background: var(--color-ink); color: var(--color-cream-1); border-color: var(--color-ink); }
        .bb-fc-arrow svg { width: 15px; height: 15px; }
        /* On phones the card content (image + rich body) is too tall as a
         * full-width single column — users have to scroll ~700px per card.
         * Cap image aspect and tighten body padding to halve card height. */
        @media (max-width: 600px) {
          .bb-pcard-image { aspect-ratio: 4/3; }
          .bb-pcard-body { padding: 16px 16px 18px; }
          .bb-pcard-name { font-size: 16px; min-height: 0; margin-bottom: 4px; }
        }

        .bb-pgrid-empty {
          padding: 80px 36px; text-align: center;
          color: rgba(10,37,64,0.5); font-size: 14px; font-weight: 600;
        }

        .bb-pcard {
          background: white;
          border-radius: 22px;
          overflow: hidden;
          /* Колона, за да може тялото да порасне и бутонът да падне най-долу.
             Заглавията са с различна дължина: без това „Добави" стои на
             различна височина във всяка карта (клиент 2026-08-09). */
          display: flex;
          flex-direction: column;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          position: relative;
          border: 1px solid rgba(10, 37, 64, 0.1);
          color: var(--color-ink);
          /* Тук стоеше второ display: block, което отменяше колоната отгоре -
             и заради него margin-top: auto на долния блок не вършеше нищо, а
             „Добави" пак стоеше на различна височина във всяка карта. */
        }
        .bb-pcard:hover {
          transform: translateY(-6px);
          box-shadow: 0 28px 56px -16px rgba(10, 37, 64, 0.18);
          border-color: var(--color-pink-2);
        }
        /* The card's own badge styles are gone: badges now come from
           ProductMarks, styled once in app.css so this carousel cannot drift
           away from the category grid again. */

        .bb-pcard-image { aspect-ratio: 1/1; background: var(--color-cream-2); position: relative; overflow: hidden; }
        .bb-pcard-image img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.7s cubic-bezier(0.4, 0, 0.2, 1); }
        .bb-pcard:hover .bb-pcard-image img { transform: scale(1.06); }
        .bb-pcard-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(180deg, transparent 60%, rgba(10, 37, 64, 0.5) 100%);
          opacity: 0;
          transition: opacity 0.3s;
          display: flex; align-items: flex-end; justify-content: center;
          padding: 18px;
        }
        .bb-pcard:hover .bb-pcard-overlay { opacity: 1; }
        .bb-pcard-quick {
          background: white; color: var(--color-ink);
          padding: 10px 20px; border-radius: 999px;
          font-size: 12px; font-weight: 800; letter-spacing: 0.3px;
          transform: translateY(8px); transition: transform 0.3s;
        }
        .bb-pcard:hover .bb-pcard-quick { transform: translateY(0); }

        .bb-pcard-body {
          padding: 22px 22px 24px;
          display: flex; flex-direction: column; flex: 1;
        }
        .bb-pcard-name {
          font-size: 18px; font-weight: 800; letter-spacing: -0.5px;
          line-height: 1.2; margin-bottom: 6px; color: var(--color-ink);
          /* Два запазени реда за подравняване, но заглавието НЕ се реже: по-дългото
             продължава на трети ред, а разликата се поема от празнината под него,
             защото цената и бутонът са долепени за дъното (bb-pcard-bottom). */
          min-height: 44px;
          overflow-wrap: anywhere;
        }

        /* Цената и оценката се долепват до бутона, а празното остава над тях. */
        .bb-pcard-bottom { display: flex; justify-content: space-between; align-items: flex-end; gap: 8px; margin-top: auto; }
        .bb-pcard-pricewrap { display: flex; flex-direction: column; gap: 3px; }
        .bb-pcard-price-row { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
        /* Match the category listing / PDP price: elegant serif, weight 600
           (client request — same font as the product page & product listing). */
        .bb-pcard-price {
          font-family: var(--font-serif); font-style: normal;
          font-size: 20px; font-weight: 600; letter-spacing: -0.4px;
          color: var(--color-ink);
          line-height: 1;
        }
        /* Sale state — turn the live price pink so the savings register fast */
        .bb-pcard-price--sale { color: var(--color-brand-pink); }
        .bb-pcard-msrp {
          font-size: 13px; font-weight: 600;
          color: rgba(10,37,64,0.45);
          text-decoration: line-through;
          text-decoration-thickness: 1.5px;
          text-decoration-color: rgba(227, 22, 108, 0.55);
        }
        .bb-pcard-eur {
          font-size: 11px; color: rgba(10,37,64,0.55); font-weight: 600;
          letter-spacing: 0.2px;
        }
        .bb-pcard-eur-old { text-decoration: line-through; opacity: 0.6; margin-right: 4px; }
        .bb-pcard-rating { font-size: 12px; color: rgba(10, 37, 64, 0.65); display: flex; align-items: center; gap: 4px; font-weight: 700; }
        .bb-pcard-rating-soft { opacity: 0.5; }
        .bb-stars { color: #F5A623; letter-spacing: -0.5px; font-size: 13px; }

        /* "Купи" button — full-width pink CTA at the bottom of the card (client). */
        .bb-pcard-buy {
          width: 100%; margin-top: 14px; flex: none;
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 12px 16px; border: none; border-radius: 12px;
          background: var(--color-brand-pink); color: #fff;
          font-family: inherit; font-size: 14px; font-weight: 800; letter-spacing: 0.2px;
          cursor: pointer; transition: background 0.18s, transform 0.12s;
        }
        .bb-pcard-buy:hover:not(:disabled) { background: #c20d59; }
        .bb-pcard-buy:active:not(:disabled) { transform: scale(0.985); }
        .bb-pcard-buy:disabled { opacity: 0.7; cursor: default; }
      `}</style>
    </>
  );
}
