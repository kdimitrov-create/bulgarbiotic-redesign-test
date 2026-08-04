import {Link, useFetcher} from 'react-router';
import {useRef, useState, useEffect} from 'react';
import type {Product} from '@cloudcart/nitro';
import {Money} from '@cloudcart/nitro-react';
import {displayDiscountPercent} from '~/lib/active-discounts';
import {markPricing} from '~/lib/product-marks';
import {ProductMarks} from '~/components/ProductMarks';
import {useAside} from '~/components/Aside';

/**
 * "Купи" button for a carousel card. Adds to cart via a fetcher (programmatic
 * submit — no <form> element, so it works inside the card's <Link>). Opens the
 * cart drawer on success. Client: add buy + favorites buttons to the carousel.
 */
function CarouselBuyButton({merchandiseId}: {merchandiseId: string}) {
  const fetcher = useFetcher();
  const {open} = useAside();
  const isAdding = fetcher.state !== 'idle';
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) open('cart');
  }, [fetcher.state, fetcher.data, open]);
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
          {method: 'post', action: '/cart'},
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

interface FeaturedProductsProps {
  products: Product[];
}

// Bulgaria fixed-rate dual currency display (EUR transition period — legal req).
// Bulgaria adopted EUR on Jan 1 2025 — storefront returns EUR amounts.
// We display EUR as the primary price and BGN as the legally-required secondary.
const BGN_PER_EUR = 1.95583;
/** Format an EUR amount to its BGN equivalent for the dual-currency secondary line. */
function eurToBgnLabel(money: {amount: string; currencyCode?: string} | null | undefined): string {
  if (!money) return '';
  const n = parseFloat(money.amount);
  if (!isFinite(n)) return '';
  // If API returns BGN (legacy), the value is already BGN. Otherwise convert from EUR.
  const bgn = (money.currencyCode ?? 'EUR') === 'BGN' ? n : n * BGN_PER_EUR;
  return `${bgn.toFixed(2)} лв`;
}
/** Get the numeric EUR amount no matter whether API returns EUR or BGN. */
function eurAmount(money: {amount: string; currencyCode?: string} | null | undefined): number {
  if (!money) return 0;
  const n = parseFloat(money.amount);
  if (!isFinite(n)) return 0;
  return (money.currencyCode ?? 'EUR') === 'BGN' ? n / BGN_PER_EUR : n;
}

function stockStateFor(p: Product, idx: number): {kind: 'in' | 'low' | 'out'; text: string} {
  // Storefront API may not expose granular inventory counts publicly. We surface a
  // sensible default (in-stock) and reserve `low` for the second card to mirror the
  // mockup's urgency cue. Wire to real `inventory.quantity` once available.
  if (p.availableForSale === false) return {kind: 'out', text: 'Очаквано възстановяване'};
  if (idx === 1) return {kind: 'low', text: 'Скоро привършва · 7 бр.'};
  return {kind: 'in', text: 'В наличност · доставка 24ч'};
}

/**
 * Image picker for a carousel card.
 *
 * Products now carry real CloudCart CDN photos (client: original box colours).
 * Raw CDN images are 1920px, so we resize to card width (600px) to keep the
 * carousel light. Local PNGs (enhanced renders, if re-enabled) are already
 * sized and pass through untouched. See app/lib/product-images.ts.
 */
function pickImage(p: Product): string {
  const url = p.featuredImage?.url;
  if (!url) return '/noimage.svg';
  if (url.includes('cdncloudcart.com')) {
    return url.includes('?') ? `${url}&width=600` : `${url}?width=600`;
  }
  return url;
}

function shortTagline(p: Product): string {
  const raw = p.shortDescription || p.description || '';
  const txt = String(raw)
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;|🟢|🔵|🟡|🟠|🔴|💚|💙/g, ' ')
    // Client (2026-07-24): strip the store-wide "томбола за iPhone" promo that
    // is injected into every product description — cards show the real tagline.
    .replace(/Направи поръчка[^!]*iPhone[^!]*!?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return txt.length > 90 ? txt.slice(0, 88).trimEnd() + '…' : txt;
}

function categoryLabel(p: Product): string {
  // Lightweight category cue derived from the handle so the eyebrow text feels
  // tailored without needing a dedicated catalog field.
  const h = p.handle;
  if (h.includes('femin')) return 'ЗА ЖЕНИ · ROSA DAMASCENA';
  if (h.includes('colongic')) return 'ЗА ЧЕРВАТА · DAILY';
  if (h.includes('anti-stress')) return 'ЗА АНТИ-СТРЕС';
  if (h.includes('babies') || h.includes('deca')) return 'ЗА БЕБЕТА И ДЕЦА · 0+ МЕС';
  if (h.includes('gastro')) return 'ХРАНОСМИЛАНЕ';
  if (h.includes('pets')) return 'ЗА ДОМАШНИ ЛЮБИМЦИ';
  if (h.includes('bremenni')) return 'ЗА БРЕМЕННИ';
  if (h.includes('smart-start')) return 'ЗА ИМУНИТЕТ';
  if (h.includes('family-pack') || h.includes('paket')) return 'ПАКЕТ';
  return 'BACTOLOGY';
}

export function FeaturedProducts({products}: FeaturedProductsProps) {
  const items = (products || []).slice(0, 10);
  const isEmpty = items.length === 0;

  // Horizontal slider — the rail now holds up to 10 products, so it scrolls
  // instead of wrapping. Arrows nudge it by ~one card width; native scroll /
  // swipe handles the rest.
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (delta: number) => {
    scrollRef.current?.scrollBy({left: delta, behavior: 'smooth'});
  };

  // Subscription toggles per product handle. Default the second card to ON so users
  // see what an active subscription looks like (matches mockup behaviour).
  const [subs, setSubs] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    items.forEach((p, i) => {
      initial[p.handle] = i === 1;
    });
    return initial;
  });

  function toggleSub(e: React.MouseEvent, handle: string) {
    e.preventDefault();
    e.stopPropagation();
    setSubs((s) => ({...s, [handle]: !s[handle]}));
  }

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

        {isEmpty ? (
          <div className="bb-pgrid-empty reveal">
            <p>Зареждане на продукти от каталога…</p>
          </div>
        ) : (
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
              const hasDiscount = !!effectiveMsrp;
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
                          <span className={`bb-pcard-price${hasDiscount ? ' bb-pcard-price--sale' : ''}`}>
                            <Money data={effectivePrice as any} />
                          </span>
                          {hasDiscount && effectiveMsrp && (
                            <span className="bb-pcard-msrp">
                              <Money data={effectiveMsrp as any} />
                            </span>
                          )}
                        </div>
                        <div className="bb-pcard-eur">
                          {hasDiscount && effectiveMsrp && (
                            <span className="bb-pcard-eur-old">
                              {eurToBgnLabel(effectiveMsrp as any)}
                            </span>
                          )}
                          {eurToBgnLabel(effectivePrice as any)}
                        </div>
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
          </>
        )}
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

        /* Horizontal product slider — flex row of fixed-width cards with
         * native scroll-snap. Arrows nudge by ~one card; swipe/scroll do the rest. */
        .bb-pgrid {
          display: flex; gap: 18px;
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
          .bb-pcard-tagline { font-size: 12.5px; min-height: 0; -webkit-line-clamp: 2; display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 10px; }
          .bb-sub-toggle { padding: 10px 12px !important; }
          .bb-sub-detail { font-size: 11px !important; }
        }

        .bb-pgrid-empty {
          padding: 80px 36px; text-align: center;
          color: rgba(10,37,64,0.5); font-size: 14px; font-weight: 600;
        }

        .bb-pcard {
          background: white;
          border-radius: 22px;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          position: relative;
          border: 1px solid rgba(10, 37, 64, 0.1);
          color: var(--color-ink);
          display: block;
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

        .bb-pcard-body { padding: 22px 22px 24px; }
        .bb-pcard-cat {
          font-size: 10px; letter-spacing: 1.4px; text-transform: uppercase;
          color: var(--color-brand-pink); font-weight: 800; margin-bottom: 6px;
        }
        .bb-pcard-name {
          font-size: 18px; font-weight: 800; letter-spacing: -0.5px;
          line-height: 1.2; margin-bottom: 6px; color: var(--color-ink);
          min-height: 44px;
        }
        .bb-pcard-tagline { font-size: 13px; color: rgba(10, 37, 64, 0.78); line-height: 1.5; margin-bottom: 14px; min-height: 38px; }
        /* Stock indicator row */
        .bb-stock-row {
          display: flex; align-items: center; gap: 6px;
          margin-bottom: 10px;
          font-size: 11px; font-weight: 700; letter-spacing: 0.2px;
        }
        .bb-stock-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .bb-stock-in { color: #2E7B47; }
        .bb-stock-in .bb-stock-dot { background: #5BB67A; box-shadow: 0 0 0 3px rgba(91, 182, 122, 0.2); }
        .bb-stock-low { color: #B05E13; }
        .bb-stock-low .bb-stock-dot { background: #E8973C; box-shadow: 0 0 0 3px rgba(232, 151, 60, 0.2); }
        .bb-stock-out { color: rgba(10,37,64,0.55); }
        .bb-stock-out .bb-stock-dot { background: rgba(10,37,64,0.3); }

        /* Subscription savings widget — toggle pill */
        .bb-sub-toggle {
          width: 100%;
          background: var(--color-blue-1);
          border: 1px dashed var(--color-brand-blue);
          border-radius: 10px;
          padding: 10px 12px;
          margin-bottom: 12px;
          cursor: pointer;
          display: flex; align-items: center; gap: 10px;
          transition: background 0.2s, border-color 0.2s;
          font-family: inherit; color: inherit; text-align: left;
        }
        .bb-sub-toggle:hover { background: var(--color-blue-2); }
        .bb-sub-toggle.active { background: var(--color-brand-blue); color: var(--color-cream-1); border-style: solid; }
        .bb-sub-toggle.active .bb-sub-label { color: var(--color-cream-1); }
        .bb-sub-toggle.active .bb-sub-disc { background: var(--color-cream-1); color: var(--color-brand-blue); }
        .bb-sub-check {
          width: 16px; height: 16px;
          border-radius: 999px;
          border: 1.5px solid var(--color-brand-blue);
          background: white;
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
        }
        .bb-sub-toggle.active .bb-sub-check { background: var(--color-cream-1); border-color: var(--color-cream-1); }
        .bb-sub-toggle.active .bb-sub-check::after {
          content: ""; width: 8px; height: 8px;
          background: var(--color-brand-blue); border-radius: 999px; display: block;
        }
        .bb-sub-text { flex: 1; font-size: 11px; line-height: 1.3; display: flex; flex-direction: column; }
        .bb-sub-label { font-weight: 700; color: var(--color-brand-blue); }
        .bb-sub-detail { opacity: 0.75; margin-top: 1px; font-weight: 600; }
        .bb-sub-disc {
          background: var(--color-brand-blue); color: white;
          padding: 3px 8px; border-radius: 4px;
          font-size: 10px; font-weight: 800; letter-spacing: 0.4px;
        }

        .bb-pcard-bottom { display: flex; justify-content: space-between; align-items: flex-end; gap: 8px; }
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
        /* -XX% pill next to msrp price */
        .bb-pcard-pct {
          display: inline-flex;
          font-size: 10.5px; font-weight: 800; letter-spacing: 0.3px;
          padding: 3px 8px;
          background: var(--color-brand-pink);
          color: white;
          border-radius: 999px;
          box-shadow: 0 4px 10px -4px rgba(227, 22, 108, 0.6);
        }
        .bb-pcard-eur {
          font-size: 11px; color: rgba(10,37,64,0.55); font-weight: 600;
          letter-spacing: 0.2px;
        }
        .bb-pcard-eur-old { text-decoration: line-through; opacity: 0.6; margin-right: 4px; }
        .bb-pcard-rating { font-size: 12px; color: rgba(10, 37, 64, 0.65); display: flex; align-items: center; gap: 4px; font-weight: 700; }
        .bb-pcard-rating-soft { opacity: 0.5; }
        .bb-stars { color: #F5A623; letter-spacing: -0.5px; font-size: 13px; }

        /* Favorites button — top-right of the card, over the image (client). */
        .bb-pcard-fav { position: absolute; top: 14px; right: 14px; z-index: 4; display: inline-flex; }
        /* "Купи" button — full-width pink CTA at the bottom of the card (client). */
        .bb-pcard-buy {
          width: 100%; margin-top: 14px;
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
    </section>
  );
}
