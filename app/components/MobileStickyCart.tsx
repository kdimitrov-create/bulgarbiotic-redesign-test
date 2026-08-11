import {useEffect, useRef, useState} from 'react';
import {AddToCartButton} from './AddToCartButton';
import {markPricing} from '~/lib/product-marks';

import {SHOW_BGN} from '~/lib/currency';
interface Props {
  product: {
    title: string;
    handle?: string;
    id?: string;
    discount?: any;
    variants?: any;
    featuredImage?: {url?: string; altText?: string | null} | null;
  };
  variant: {id: string; price: {amount: string; currencyCode?: string}; availableForSale?: boolean};
}

const EUR_TO_BGN = 1.95583;
const fmtEur = (n: number) =>
  new Intl.NumberFormat('bg-BG', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(n) + ' €';
const fmtBgn = (n: number) =>
  new Intl.NumberFormat('bg-BG', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(n) + ' лв';

/**
 * Sticky add-to-cart bar shown on ALL viewports once the main add-to-cart
 * scrolls out of view. Lets users buy from anywhere on the PDP without
 * scrolling back up.
 *
 * — Mobile (≤880px): full-width bar pinned to the bottom edge.
 * — Desktop (≥881px): centered max-width 880px pill with rounded top corners
 *   and a small product thumbnail (looks like a floating action bar).
 *
 * Visibility is governed by an IntersectionObserver attached to the main
 * .bb-pdp-add button. When the main CTA is on-screen, the sticky bar hides.
 */
export function MobileStickyCart({product, variant}: Props) {
  const [visible, setVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Visibility strategy:
    //   1. Primary: IntersectionObserver on the main .bb-pdp-add button —
    //      fast, native, fires only when intersection changes.
    //   2. Fallback: a passive scroll listener that checks the same rect
    //      each frame. Belt-and-braces — covers edge cases where the
    //      observer doesn't fire initial state (some Chromium SSR builds,
    //      Strict-Mode double-mount races, retargeting after HMR).
    //
    // findTarget retries for ~1s in case the main CTA mounts after us.
    let cancelled = false;
    let target: Element | null = null;

    const updateFromRect = () => {
      if (!target) return;
      const r = target.getBoundingClientRect();
      const inView = r.bottom > 40 && r.top < window.innerHeight;
      setVisible(!inView);
    };

    const attach = () => {
      if (cancelled || !target) return;
      observerRef.current = new IntersectionObserver(
        ([entry]) => setVisible(!entry.isIntersecting),
        {threshold: 0, rootMargin: '0px 0px -40px 0px'},
      );
      observerRef.current.observe(target);
      window.addEventListener('scroll', updateFromRect, {passive: true});
      window.addEventListener('resize', updateFromRect);
      // Initial sync — Observer + scroll listener race; this guarantees one
      // correct state read before any user interaction.
      updateFromRect();
    };

    const findTarget = (attempt = 0) => {
      if (cancelled) return;
      target = document.querySelector('.bb-pdp-add');
      if (target) {
        attach();
      } else if (attempt < 10) {
        setTimeout(() => findTarget(attempt + 1), 100);
      }
    };
    findTarget();

    return () => {
      cancelled = true;
      observerRef.current?.disconnect();
      window.removeEventListener('scroll', updateFromRect);
      window.removeEventListener('resize', updateFromRect);
    };
  }, []);

  // Toggle body class so the layout reserves space for the sticky bar
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('bb-pdp-sticky-active', visible);
    return () => document.body.classList.remove('bb-pdp-sticky-active');
  }, [visible]);

  // Same price pair as the buy box above — read from CloudCart, never computed.
  const shared = markPricing(product as any);
  const livePrice = variant.price ?? shared.price;
  const msrpPrice = variant.compareAtPrice ?? shared.compareAtPrice;

  const amount = parseFloat(livePrice.amount);
  const currency = (livePrice.currencyCode ?? 'EUR') as 'EUR' | 'BGN';
  const eur = currency === 'EUR' ? amount : amount / EUR_TO_BGN;
  const bgn = currency === 'BGN' ? amount : amount * EUR_TO_BGN;
  const msrpEur = msrpPrice
    ? (msrpPrice.currencyCode ?? 'EUR') === 'EUR'
        ? parseFloat(msrpPrice.amount)
        : parseFloat(msrpPrice.amount) / EUR_TO_BGN
    : 0;

  return (
    <div className={`bb-pdp-sticky${visible ? ' visible' : ''}`} aria-hidden={!visible}>
      <div className="bb-pdp-sticky-info">
        {product.featuredImage?.url && (
          <img
            className="bb-pdp-sticky-thumb"
            src={product.featuredImage.url}
            alt={product.featuredImage.altText || product.title}
          />
        )}
        <div className="bb-pdp-sticky-text">
          <div className="bb-pdp-sticky-title">{product.title}</div>
          <div className="bb-pdp-sticky-price">
            <span className={msrpPrice ? 'bb-pdp-sticky-eur--sale' : undefined}>{fmtEur(eur)}</span>
            {msrpPrice && (
              <span className="bb-pdp-sticky-old">{fmtEur(msrpEur)}</span>
            )}
            {SHOW_BGN && <span className="bb-pdp-sticky-bgn">{fmtBgn(bgn)}</span>}
          </div>
        </div>
      </div>
      <AddToCartButton
        merchandiseId={variant.id}
        disabled={variant.availableForSale === false}
        className="bb-pdp-sticky-btn"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5.5 8h13l-1.2 10.5a1.6 1.6 0 01-1.6 1.5H8.3a1.6 1.6 0 01-1.6-1.5L5.5 8z" />
          <path d="M9 8a3 3 0 016 0" />
        </svg>
        {variant.availableForSale === false ? 'Изчерпан' : 'Купи'}
      </AddToCartButton>
    </div>
  );
}
