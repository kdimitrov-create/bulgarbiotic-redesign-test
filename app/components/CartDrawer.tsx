import {Await, Link, useFetcher} from 'react-router';
import {Suspense, useEffect, useMemo, useRef, useState} from 'react';
import type {CartData} from '@cloudcart/nitro';
import {useAside} from './Aside';
import {getEnhancedFeatured} from '~/lib/product-images';
import {BUMP_CART_CONFIG} from '~/lib/bump-cart-config';
import {bestDiscountFor, bestDiscountForHandle} from '~/lib/active-discounts';
import {CheckoutButton} from './CheckoutButton';

export const EUR_TO_BGN = 1.95583;
// Free-shipping target = the merchant's BumpCart `totalCartAmount` setting
// (51 € on bulgarbiotic.bg as of 2026-05-21). This sits between the
// shipping providers' real thresholds — Спиди v2 starts free at ≥50 €,
// Sameday at ≥51,13 € — so 51 € is the "round" goal the merchant chose
// to pitch on the bump-cart upsell. Using the same constant everywhere
// (CartDrawer progress + CartUpsell logic) keeps the message consistent.
// To change: edit `app/lib/bump-cart-config.ts` (see file header for the
// CloudCart Admin API source query).
export const FREE_SHIPPING_THRESHOLD_EUR = BUMP_CART_CONFIG.totalCartAmount;

export const fmtEur = (amount: number) =>
  new Intl.NumberFormat('bg-BG', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(amount) + ' €';
export const fmtBgn = (amount: number) =>
  new Intl.NumberFormat('bg-BG', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(amount) + ' лв';

/** Convert any money object {amount, currencyCode} into both EUR + BGN. */
export function bothCurrencies(money: {amount: string; currencyCode?: string} | null | undefined) {
  if (!money) return {eur: 0, bgn: 0};
  const amount = parseFloat(money.amount);
  if (!isFinite(amount)) return {eur: 0, bgn: 0};
  const currency = (money.currencyCode ?? 'EUR') as 'EUR' | 'BGN';
  const eur = currency === 'EUR' ? amount : amount / EUR_TO_BGN;
  const bgn = currency === 'BGN' ? amount : amount * EUR_TO_BGN;
  return {eur, bgn};
}

export function CartDrawer({cart}: {cart: Promise<CartData | null>}) {
  return (
    <Suspense
      fallback={
        <div className="bb-cd-loading">
          <div className="bb-cd-spinner" />
          <p>Зареждане на кошницата…</p>
        </div>
      }
    >
      <Await resolve={cart}>
        {(resolvedCart) => <CartDrawerInner cart={resolvedCart} />}
      </Await>
    </Suspense>
  );
}

function CartDrawerInner({cart}: {cart: CartData | null}) {
  const {close} = useAside();
  const lines = cart?.lines?.nodes ?? [];
  const isEmpty = !cart || cart.totalQuantity === 0;

  // Storefront cart.cost is always MSRP — it doesn't fold in CloudCart's
  // order-level auto-discounts. We recompute the line-level + grand
  // total on the client using the real merchant discount mirror so the
  // drawer's numbers match the PDP / sale page / final checkout.
  const rawSubtotal = bothCurrencies(cart?.cost?.subtotalAmount);
  const rawTotal = bothCurrencies(cart?.cost?.totalAmount);
  let totalDiscountEur = 0;
  for (const l of lines as any[]) {
    const lineEur = bothCurrencies(l.cost?.totalAmount).eur;
    const handle = l.merchandise?.product?.handle as string | undefined;
    const d = bestDiscountForHandle(handle);
    if (d && d.percent > 0) {
      totalDiscountEur += lineEur * (d.percent / 100);
    }
  }
  const subtotal = {
    eur: Math.max(0, rawSubtotal.eur - totalDiscountEur),
    bgn: Math.max(0, rawSubtotal.bgn - totalDiscountEur * EUR_TO_BGN),
  };
  const total = {
    eur: Math.max(0, rawTotal.eur - totalDiscountEur),
    bgn: Math.max(0, rawTotal.bgn - totalDiscountEur * EUR_TO_BGN),
  };
  // Threshold + progress live in EUR because the store's base currency
  // is EUR (verified via generalSettings.currency). The Bulgarian-lev
  // value is shown alongside as a convenience.
  const remainingEur = Math.max(0, FREE_SHIPPING_THRESHOLD_EUR - subtotal.eur);
  const remainingBgn = remainingEur * EUR_TO_BGN;
  const shippingPct = Math.min(100, (subtotal.eur / FREE_SHIPPING_THRESHOLD_EUR) * 100);
  const isFreeShip = remainingEur <= 0.005; // tolerate sub-cent rounding

  return (
    <div className="bb-cd">
      <div className="bb-cd-head">
        <h3>
          Твоята кошница
          {cart && cart.totalQuantity > 0 && (
            <span className="bb-cd-count">· {cart.totalQuantity}</span>
          )}
        </h3>
      </div>

      {!isEmpty && (
        <div className="bb-cd-shipping">
          <div className="bb-cd-shipping-text">
            {isFreeShip ? (
              <>
                <span className="bb-cd-shipping-icon" aria-hidden="true">✓</span>
                Поздравления — <strong>безплатна доставка</strong> е включена!
              </>
            ) : (
              <>
                Поръчай за още <strong className="accent">{fmtEur(remainingEur)}</strong> <span className="bb-cd-shipping-bgn">({fmtBgn(remainingBgn)})</span> и доставката е безплатна
              </>
            )}
          </div>
          <div className="bb-cd-shipping-track">
            <div className="bb-cd-shipping-fill" style={{width: `${shippingPct}%`}} />
          </div>
        </div>
      )}

      {isEmpty ? (
        <div className="bb-cd-empty">
          <div className="bb-cd-empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5.5 8h13l-1.2 10.5a1.6 1.6 0 01-1.6 1.5H8.3a1.6 1.6 0 01-1.6-1.5L5.5 8z" />
              <path d="M9 8a3 3 0 016 0" />
            </svg>
          </div>
          <p className="bb-cd-empty-h">Кошницата ти е празна</p>
          <p className="bb-cd-empty-p">Добави продукти и започни своето пътуване към микробиомния баланс.</p>
          <Link to="/category/all-products" onClick={close} className="bb-cd-empty-cta">
            Виж продуктите
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
      ) : (
        <>
          {/* Shared scroll area — wraps both the cart lines AND the
              upsell carousel so they share the same flex:1 / overflow:auto
              region. Without this wrapper, items were getting squeezed to
              a 32px strip because the upsell card (~385px tall) and the
              footer (~435px) sat as siblings claiming their own height,
              leaving no room for items. Now everything between the
              progress bar and the footer scrolls as one. */}
          <div className="bb-cd-scroll">
            <ul className="bb-cd-items">
              {lines.map((line) => (
                <CartLineRow key={line.id} line={line} onProductClick={close} />
              ))}
            </ul>

            {/* Bump cart — only show upsell when there's still room to
                grow toward the free-shipping threshold. Skip it once the
                customer already qualifies, to avoid pestering people who've
                cleared the bar. */}
            {!isFreeShip && (
              <CartUpsell
                remainingEur={remainingEur}
                remainingBgn={remainingBgn}
                cartHandles={lines
                  .map((l: any) => l.merchandise?.product?.handle as string | undefined)
                  .filter(Boolean) as string[]}
                onAdded={() => { /* no-op — fetcher reload handles UI */ }}
              />
            )}
          </div>

          <div className="bb-cd-foot">
            {/* Single-line grand total — shipping already communicated
                up top by the progress bar, VAT note moved to subtitle.
                Drops 3 separate rows → 1 row + 1 subtitle. */}
            <div className="bb-cd-grand">
              <div className="bb-cd-grand-lbl-col">
                <div className="bb-cd-grand-lbl">Крайна сума</div>
                {totalDiscountEur > 0 && (
                  <div className="bb-cd-grand-savings">
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Спестяваш <strong>{fmtEur(totalDiscountEur)}</strong>
                  </div>
                )}
                <div className="bb-cd-grand-note">
                  Таксите и доставката се изчисляват на следващата стъпка
                </div>
              </div>
              <div className="bb-cd-grand-val-col">
                {totalDiscountEur > 0 && (
                  <div className="bb-cd-grand-msrp" aria-label={`Стара цена ${fmtEur(rawTotal.eur)}`}>
                    {fmtEur(rawTotal.eur)}
                  </div>
                )}
                <div className="bb-cd-grand-val">{fmtEur(total.eur)}</div>
                <div className="bb-cd-grand-bgn">{fmtBgn(total.bgn)}</div>
              </div>
            </div>
            <CheckoutButton cart={cart} className="bb-cd-checkout" />

            <CartTrustStrip />
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Trust strip under the checkout button — shows the actually-active
 * payment and courier methods on bulgarbiotic.bg. Drives trust by
 * reassuring the customer that the methods they know are supported
 * before they commit to checkout.
 *
 * Data is REAL (sourced via CloudCart Admin API
 * `applications(filter: { group: "payment"|"shipping", is_installed: true })`
 * and the providers' `isActive: true` flag). Refresh by re-querying
 * if the merchant installs/uninstalls apps.
 *
 * Last verified: 2026-05-21
 *   Payment (active): cod (Наложен платеж) · fibank (Visa / MC via bank)
 *   Shipping (active): econt · speedy (dpdbulgaria) · boxnow · sameday
 */
export function CartTrustStrip() {
  return (
    <div className="bb-cd-trust" aria-label="Начини на плащане и доставка">
      {/* Single compact row — pay icons + courier badges + SSL lock.
       * Replaces the previous 3-row layout (labelled groups + separate
       * note) which ate ~80px of vertical real estate. */}
      <div className="bb-cd-trust-row">
        <span className="bb-cd-trust-icon" title="Visa" aria-label="Visa">
          <svg viewBox="0 0 48 16" width="32" height="12" fill="none" aria-hidden="true">
            <text x="0" y="13" fontFamily="Arial, sans-serif" fontSize="14" fontWeight="900" fill="#1A1F71" letterSpacing="-0.5">VISA</text>
          </svg>
        </span>
        <span className="bb-cd-trust-icon" title="Mastercard" aria-label="Mastercard">
          <svg viewBox="0 0 32 20" width="24" height="16" aria-hidden="true">
            <circle cx="12" cy="10" r="8" fill="#EB001B" />
            <circle cx="20" cy="10" r="8" fill="#F79E1B" />
            <path d="M16 4.5a8 8 0 010 11" fill="#FF5F00" />
          </svg>
        </span>
        {/* Apple Pay / Google Pay — client request. Clean inline marks matching
            the existing Visa/Mastercard style (self-contained, no external asset). */}
        <span className="bb-cd-trust-icon" title="Apple Pay" aria-label="Apple Pay">
          <svg viewBox="0 0 40 16" width="30" height="12" aria-hidden="true">
            <path d="M9.5 5.4c-.5-.6-1.3-1-2-1-.9 0-1.3.4-2 .4s-1.2-.4-2-.4c-1.4 0-2.7 1.2-2.7 3.3 0 1.3.5 2.7 1.1 3.6.5.7.9 1.1 1.6 1.1.6 0 .9-.4 1.7-.4s1 .4 1.7.4c.7 0 1.1-.5 1.6-1.2.4-.6.6-1.1.6-1.2-1.5-.6-1.5-2.6-.1-3.4z M8 3.2c.4-.5.6-1.1.5-1.7-.6 0-1.2.3-1.6.8-.3.4-.6 1-.5 1.6.6 0 1.2-.3 1.6-.7z" fill="#000" />
            <text x="13" y="12.5" fontFamily="-apple-system, Segoe UI, Arial, sans-serif" fontSize="12" fontWeight="600" fill="#000">Pay</text>
          </svg>
        </span>
        <span className="bb-cd-trust-icon" title="Google Pay" aria-label="Google Pay">
          <svg viewBox="0 0 44 16" width="34" height="12" aria-hidden="true">
            <text x="0" y="12.5" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="700" fill="#4285F4">G</text>
            <text x="9" y="12.5" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="500" fill="#5F6368">Pay</text>
          </svg>
        </span>
        <span className="bb-cd-trust-divider" aria-hidden="true" />
        <span className="bb-cd-trust-courier" title="Еконт">Еконт</span>
        <span className="bb-cd-trust-courier" title="Спиди">Спиди</span>
        <span className="bb-cd-trust-courier" title="BOX NOW">BOX NOW</span>
        <span className="bb-cd-trust-courier bb-cd-trust-courier--hide-sm" title="Sameday">Sameday</span>
        <span className="bb-cd-trust-divider" aria-hidden="true" />
        <span className="bb-cd-trust-lock" aria-label="Сигурно плащане">
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          SSL
        </span>
      </div>
    </div>
  );
}

/** Single cart-line row with image, title, price (dual currency),
 *  −/+ quantity, and remove button. */
function CartLineRow({line, onProductClick}: {line: any; onProductClick: () => void}) {
  const update = useFetcher({key: `update-${line.id}`});
  const remove = useFetcher({key: `remove-${line.id}`});

  // Optimistic UI: while a mutation is in flight, hide the row when removing
  // or use the pending quantity instead of the server value.
  if (remove.state !== 'idle') return null;
  const pendingQty = update.formData ? Number(update.formData.get('quantity')) : null;
  const qty = pendingQty ?? line.quantity;
  if (qty <= 0) return null;

  const m = line.merchandise;
  const handle = m.product?.handle as string | undefined;
  const title = m.product?.title || m.title || 'Продукт';

  // 3-tier image fallback: AI-enhanced → real CloudCart CDN → no-image SVG.
  // Many cart line merchandise objects ship without image.url; the enhanced
  // map covers our top SKUs.
  const enhanced = handle ? getEnhancedFeatured(handle) : null;
  const realImg = m.image?.url || m.product?.featuredImage?.url;
  const img = enhanced || realImg || '/noimage.svg';

  const variantTitle = m.title && m.title !== 'Default Title' ? m.title : null;
  // CloudCart cart.cost is always MSRP (Storefront API doesn't fold in
  // order-level auto-discounts). Apply the live merchant-configured
  // discount (mirrored from Admin API in active-discounts.ts) on top
  // so PDP, cart line, and checkout all display the same number.
  const msrp = bothCurrencies(line.cost?.totalAmount);
  const discount = bestDiscountForHandle(handle);
  const hasDiscount = !!discount && discount.percent > 0;
  const saleEur = hasDiscount ? msrp.eur * (1 - discount.percent / 100) : msrp.eur;
  const saleBgn = hasDiscount ? msrp.bgn * (1 - discount.percent / 100) : msrp.bgn;
  const savingsEur = hasDiscount ? msrp.eur - saleEur : 0;

  return (
    <li className="bb-cd-item">
      <Link
        to={handle ? `/product/${handle}` : '#'}
        onClick={onProductClick}
        className="bb-cd-item-imglink"
        prefetch="intent"
      >
        <img src={img} alt={m.image?.altText || title} loading="lazy" />
      </Link>
      <div className="bb-cd-item-info">
        <Link
          to={handle ? `/product/${handle}` : '#'}
          onClick={onProductClick}
          className="bb-cd-item-name"
          prefetch="intent"
        >
          {title}
        </Link>
        {variantTitle && <div className="bb-cd-item-meta">{variantTitle}</div>}

        <div className="bb-cd-item-row">
          {/* −/+ stepper */}
          <div className="bb-cd-qty">
            <update.Form method="post" action="/cart" className="bb-cd-qty-form">
              <input type="hidden" name="action" value="UPDATE_CART" />
              <input type="hidden" name="lineId" value={line.id} />
              <input type="hidden" name="quantity" value={Math.max(0, qty - 1)} />
              <button
                type="submit"
                disabled={qty <= 1 || update.state !== 'idle'}
                aria-label="Намали количеството"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </update.Form>
            <span className="bb-cd-qty-num">{qty}</span>
            <update.Form method="post" action="/cart" className="bb-cd-qty-form">
              <input type="hidden" name="action" value="UPDATE_CART" />
              <input type="hidden" name="lineId" value={line.id} />
              <input type="hidden" name="quantity" value={qty + 1} />
              <button
                type="submit"
                disabled={update.state !== 'idle'}
                aria-label="Увеличи количеството"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <line x1="12" y1="5" x2="12" y2="19" />
                </svg>
              </button>
            </update.Form>
          </div>

          {/* Remove */}
          <remove.Form method="post" action="/cart">
            <input type="hidden" name="action" value="REMOVE_FROM_CART" />
            <input type="hidden" name="lineId" value={line.id} />
            <button type="submit" className="bb-cd-remove" aria-label={`Премахни ${title}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1.2 13.5a1.6 1.6 0 01-1.6 1.5H7.8a1.6 1.6 0 01-1.6-1.5L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
              </svg>
            </button>
          </remove.Form>
        </div>
      </div>

      <div className="bb-cd-item-price">
        <div className="bb-cd-item-price-eur">{fmtEur(saleEur)}</div>
        <div className="bb-cd-item-price-bgn">{fmtBgn(saleBgn)}</div>
        {hasDiscount && (
          <>
            <div className="bb-cd-item-price-msrp">
              <span className="bb-cd-item-price-msrp-eur">{fmtEur(msrp.eur)}</span>
              <span className="bb-cd-item-price-msrp-bgn">{fmtBgn(msrp.bgn)}</span>
            </div>
            {/* Per-item "Спестяваш …" removed per client request (kept only the
                strikethrough MSRP above; savings still shown on the grand total). */}
          </>
        )}
      </div>
    </li>
  );
}

interface UpsellSuggestion {
  id: string;
  handle: string;
  title: string;
  image: string | null;
  merchandiseId: string;
  availableForSale: boolean;
  price: {amount: string; currencyCode: string};
}

interface UpsellSettings {
  title: string;
  totalCartAmount: number;
  percent: number;
}

/**
 * "Bump cart" upsell — wires the merchant's BumpCart application
 * configuration (mirrored in `app/lib/bump-cart-config.ts`) into the
 * cart drawer.
 *
 * What the API returns:
 *   • `settings` — title template, threshold, discount percent (live
 *     from BumpCart config, not hardcoded by us)
 *   • `suggestions` — products from the merchant-configured categories
 *     (#1 Пробиотици, #8 Пакети), sorted per merchant's `sortBy`
 *
 * What this component does:
 *   1. Substitutes `{$remaining}` in the title with the live gap-to-
 *      threshold value
 *   2. Excludes products already in the cart (dedup)
 *   3. Picks 2 products that fit the gap with minimum overshoot
 *   4. Displays the merchant's discount percent as a "Save X%" badge
 *      on each card
 *
 * "Добави +" uses the existing /cart action so the cart re-fetches and
 * the progress bar updates automatically.
 */
function CartUpsell({
  remainingEur,
  remainingBgn,
  cartHandles,
  onAdded,
}: {
  remainingEur: number;
  remainingBgn: number;
  cartHandles: string[];
  onAdded: () => void;
}) {
  const fetcher = useFetcher<{
    settings: UpsellSettings;
    suggestions: UpsellSuggestion[];
  }>({key: 'cart-upsell-pool'});

  // Re-fetch whenever cart contents change so the co-purchase algo
  // sees the latest cart context. Encoded into query string so each
  // cart state gets its own edge cache bucket.
  const upsellUrl = useMemo(() => {
    const qs = new URLSearchParams();
    if (cartHandles.length) qs.set('inCart', cartHandles.join(','));
    if (remainingEur > 0) qs.set('remainingEur', remainingEur.toFixed(2));
    return `/api/cart-upsell${qs.toString() ? `?${qs.toString()}` : ''}`;
  }, [cartHandles.join('|'), remainingEur]);

  useEffect(() => {
    if (fetcher.state === 'idle') {
      fetcher.load(upsellUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upsellUrl]);

  const settings = fetcher.data?.settings;

  // Server returns a ranked list (co-purchase first, popularity
  // fallback). We just take the top N — no further re-ranking on the
  // client beyond a sanity dedup against the live cart.
  const picks = useMemo(() => {
    const pool = fetcher.data?.suggestions ?? [];
    return pool.filter((p) => p.availableForSale).slice(0, 4);
  }, [fetcher.data]);

  // Nothing to suggest yet — render nothing rather than an awkward shell
  if (picks.length === 0) return null;

  // Substitute {$remaining} in merchant title with the live amount.
  // Merchant copy: "Остават ви {$remaining} до безплатна доставка!"
  const headline = (settings?.title ?? 'Добави това и получаваш безплатна доставка')
    .replace('{$remaining}', `${fmtEur(remainingEur)} (~${fmtBgn(remainingBgn)})`);
  const discountPercent = settings?.percent ?? 0;

  return (
    <div className="bb-cd-upsell">
      <div className="bb-cd-upsell-head">
        <div className="bb-cd-upsell-head-row">
          <div className="bb-cd-upsell-head-eyebrow">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polygon points="12 2 15 8.5 22 9.3 17 14 18.2 21 12 17.8 5.8 21 7 14 2 9.3 9 8.5 12 2" />
            </svg>
            <span>Не забравяй да добавиш</span>
          </div>
          <span className="bb-cd-upsell-count">{picks.length} продукта</span>
        </div>
        <div className="bb-cd-upsell-head-title">{headline}</div>
      </div>
      <UpsellCarousel picks={picks} discountPercent={discountPercent} onAdded={onAdded} />
    </div>
  );
}

/**
 * Horizontal-scroll carousel with desktop arrows + right-edge gradient
 * mask. The mask + dot indicator make it obvious there's more to scroll
 * (previously the cropped 4th card looked ambiguous — "is that on
 * purpose or did the layout break?"). Arrows fire smooth-scroll by
 * one card-width each click.
 */
function UpsellCarousel({
  picks,
  discountPercent,
  onAdded,
}: {
  picks: UpsellSuggestion[];
  discountPercent: number;
  onAdded: () => void;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<'start' | 'middle' | 'end' | 'static'>('static');

  // Recompute scroll-edge state on mount, resize, and on scroll —
  // determines which arrows + edge fades to show.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const update = () => {
      const overflow = el.scrollWidth - el.clientWidth;
      if (overflow <= 16) { setPos('static'); return; }
      // Tolerance is generous (24px) to account for the carousel's
      // padding-left and scroll-snap mandatory rounding — scroll-snap
      // can land the first card at scrollLeft ≈ padding, not strictly 0.
      const atStart = el.scrollLeft <= 24;
      const atEnd = el.scrollLeft >= overflow - 24;
      setPos(atStart ? 'start' : atEnd ? 'end' : 'middle');
    };
    update();
    el.addEventListener('scroll', update, {passive: true});
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [picks.length]);

  function scrollByCard(dir: -1 | 1) {
    const el = scrollerRef.current;
    if (!el) return;
    // Step = first card width + the gap between cards.
    const firstCard = el.querySelector('.bb-cd-upsell-card') as HTMLElement | null;
    const cardW = firstCard?.offsetWidth ?? 140;
    const gap = 10;
    el.scrollBy({left: (cardW + gap) * dir, behavior: 'smooth'});
  }

  return (
    <div className={`bb-cd-upsell-carousel-wrap bb-cd-upsell-carousel-wrap--${pos}`}>
      {pos !== 'static' && pos !== 'start' && (
        <button
          type="button"
          className="bb-cd-upsell-arrow bb-cd-upsell-arrow--left"
          onClick={() => scrollByCard(-1)}
          aria-label="Назад"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}
      {pos !== 'static' && pos !== 'end' && (
        <button
          type="button"
          className="bb-cd-upsell-arrow bb-cd-upsell-arrow--right"
          onClick={() => scrollByCard(1)}
          aria-label="Напред"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}
      <div className="bb-cd-upsell-carousel" ref={scrollerRef}>
        {picks.map((p) => (
          <UpsellCard key={p.id} suggestion={p} discountPercent={discountPercent} onAdded={onAdded} />
        ))}
      </div>
    </div>
  );
}

function UpsellCard({suggestion, onAdded}: {suggestion: UpsellSuggestion; discountPercent: number; onAdded: () => void}) {
  const add = useFetcher({key: `upsell-add-${suggestion.id}`});
  const isAdding = add.state !== 'idle';
  const enhanced = getEnhancedFeatured(suggestion.handle);
  const img = enhanced || suggestion.image || '/noimage.svg';
  const msrp = bothCurrencies(suggestion.price);
  // Real auto-discount from CloudCart Admin mirror — keeps the price
  // displayed here CONSISTENT with what the cart line + checkout show
  // after the customer clicks "Купи". Without this, the suggestion
  // would show MSRP, the customer would click, and the cart line
  // would suddenly drop ~20–35% — a worse mismatch than the old synth.
  const discount = bestDiscountFor(suggestion.id);
  const hasDiscount = !!discount && discount.percent > 0;
  const saleEur = hasDiscount ? msrp.eur * (1 - discount.percent / 100) : msrp.eur;
  const saleBgn = hasDiscount ? msrp.bgn * (1 - discount.percent / 100) : msrp.bgn;

  useEffect(() => {
    if (add.state === 'idle' && add.data) {
      onAdded();
    }
  }, [add.state, add.data, onAdded]);

  return (
    <div className="bb-cd-upsell-card">
      <Link to={`/product/${suggestion.handle}`} className="bb-cd-upsell-img" prefetch="intent">
        <img src={img} alt={suggestion.title} loading="lazy" />
        {hasDiscount && <span className="bb-cd-upsell-badge">−{discount.percent}%</span>}
      </Link>
      <div className="bb-cd-upsell-info">
        <Link to={`/product/${suggestion.handle}`} className="bb-cd-upsell-title" prefetch="intent">
          {suggestion.title}
        </Link>
        <div className="bb-cd-upsell-price">
          <span className="bb-cd-upsell-price-eur">{fmtEur(saleEur)}</span>
          {hasDiscount && (
            <span className="bb-cd-upsell-price-msrp">{fmtEur(msrp.eur)}</span>
          )}
        </div>
        {/* BGN row — ALWAYS visible (Bulgarian dual-currency display
            is a legal requirement, not a "show when on sale" option). */}
        <div className="bb-cd-upsell-price-bgn-row">
          {fmtBgn(saleBgn)}
          {hasDiscount && (
            <span className="bb-cd-upsell-price-msrp-bgn"> · {fmtBgn(msrp.bgn)}</span>
          )}
        </div>
        <add.Form method="post" action="/cart" className="bb-cd-upsell-add-form">
          <input type="hidden" name="action" value="ADD_TO_CART" />
          <input type="hidden" name="merchandiseId" value={suggestion.merchandiseId} />
          <input type="hidden" name="quantity" value="1" />
          <button
            type="submit"
            className="bb-cd-upsell-add"
            disabled={isAdding}
            aria-label={`Добави ${suggestion.title}`}
          >
            {isAdding ? (
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="bb-cd-upsell-spin" aria-hidden="true">
                <path d="M12 3a9 9 0 11-6.3 2.6" />
              </svg>
            ) : (
              'Добави'
            )}
          </button>
        </add.Form>
      </div>
    </div>
  );
}
