import {Link, useFetcher} from 'react-router';
import type {CartData} from '@cloudcart/nitro';
import {getEnhancedFeatured} from '~/lib/product-images';
import {CheckoutButton} from './CheckoutButton';
import {PromoCode} from './PromoCode';
import {fallbackToPlaceholder} from './CartDrawer';
import {CartOffersStrip} from './CartOffers';
import {markPricingForLine} from '~/lib/product-marks';
import {adjustmentLines, money, subtotalLine, totalLine, type CartSummary} from '~/lib/cart-summary';
import {displayDiscountPercent} from '~/lib/active-discounts';
import {numericId} from '~/lib/analytics';
import {SHOW_BGN} from '~/lib/currency';
import {
  EUR_TO_BGN,
  freeShippingTargetEur,
  fmtEur,
  fmtBgn,
  bothCurrencies,
  CartTrustStrip,
} from './CartDrawer';
import {CART_ACTION} from '~/lib/cart-action';

/**
 * Full cart PAGE (/cart) — the drawer's design language in a two-column
 * page layout: lines on the left, a sticky summary card on the right.
 *
 * Pricing logic is imported from CartDrawer rather than re-derived, so the
 * drawer, this page and the PDP can never drift apart on what a line costs.
 */
export function CartPage({cart, summary}: {cart: CartData | null; summary?: CartSummary | null}) {
  const lines = cart?.lines?.nodes ?? [];
  const isEmpty = !cart || cart.totalQuantity === 0;

  if (isEmpty) return <CartPageEmpty />;

  /**
   * Сметката се ЧЕТЕ от количката, не се смята тук - същото като в чекмеджето.
   *
   * 🛑 `cost.totalAmount` НЕ се ползва: на bulgarbiotic.bg връща точно
   * половината от сумата, а самото API казва, че `cost` е „за логика, не за
   * показване". Реалната сума е сборът на редовете, който вече съдържа
   * правилата, количествените пакети и промо кода.
   */
  let payableEur = 0;
  let msrpEur = 0;
  for (const l of lines as any[]) {
    const {price, compareAtPrice} = markPricingForLine(l);
    const now = bothCurrencies(price).eur;
    payableEur += now;
    msrpEur += compareAtPrice ? bothCurrencies(compareAtPrice).eur : now;
  }
  /* Обобщението на търговеца е истината.
     Сборът на редовете не познава ПРАВИЛАТА ЗА КОЛИЧКАТА: те се прилагат от
     платформата при всяка промяна и се появяват като собствен ред в `totals`.
     Измерено на bulgarbiotic.bg: правило „Pets 2=1" сваля 21,47 от количка за
     42,94, а редовете си остават 42,94. */
  const summaryTotal = money(totalLine(summary));
  const summarySubtotal = money(subtotalLine(summary));
  const adjustments = adjustmentLines(summary);
  const payable = summaryTotal ?? payableEur;
  const shownSubtotal = summarySubtotal ?? payableEur;
  const savedEur = Math.max(0, msrpEur - payable);
  const subtotalEur = shownSubtotal;
  const rawSubtotal = {eur: msrpEur, bgn: msrpEur * EUR_TO_BGN};
  const rawTotal = {eur: msrpEur, bgn: msrpEur * EUR_TO_BGN};
  const totalEur = payable;
  const totalBgn = payable * EUR_TO_BGN;

  const shippingTarget = freeShippingTargetEur();
  const remainingEur = Math.max(0, shippingTarget - subtotalEur);
  const shippingPct = shippingTarget > 0 ? Math.min(100, (subtotalEur / shippingTarget) * 100) : 100;
  const isFreeShip = remainingEur <= 0.005; // tolerate sub-cent rounding

  const qty = cart.totalQuantity;

  return (
    <div className="bb-cart">
      <div className="bb-cart-head">
        <h1 className="bb-cart-title">Твоята кошница</h1>
        <span className="bb-cart-count">
          {qty} {qty === 1 ? 'продукт' : 'продукта'}
        </span>
      </div>

      <div className="bb-cart-grid">
        <div className="bb-cart-main">
          <div className="bb-cart-shipping">
            <div className="bb-cart-shipping-text">
              {isFreeShip ? (
                <>
                  <span className="bb-cart-shipping-icon" aria-hidden="true">✓</span>
                  Поздравления - <strong>безплатна доставка</strong> е включена!
                </>
              ) : (
                <>
                  Поръчай за още <strong className="accent">{fmtEur(remainingEur)}</strong>{' '}
                  {SHOW_BGN && <span className="bb-cart-shipping-bgn">({fmtBgn(remainingEur * EUR_TO_BGN)})</span>}{' '}
                  и доставката е безплатна
                </>
              )}
            </div>
            <div className="bb-cart-shipping-track">
              <div className="bb-cart-shipping-fill" style={{width: `${shippingPct}%`}} />
            </div>
            {/* The merchant's gift offers and cart rules, live from the panel. */}
            <CartOffersStrip subtotalEur={subtotalEur} messages={summary?.messages ?? []} />
          </div>

          <ul className="bb-cart-items">
            {lines.map((line) => (
              <CartPageRow key={line.id} line={line} />
            ))}
          </ul>

          <Link to="/category/all-products" className="bb-cart-continue" prefetch="intent">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Продължи пазаруването
          </Link>
        </div>

        <aside className="bb-cart-side">
          <div className="bb-cart-card">
            <h2 className="bb-cart-card-title">Обобщение на поръчката</h2>

            <div className="bb-cart-sum-row">
              <span>Междинна сума</span>
              <span>{fmtEur(shownSubtotal)}</span>
            </div>
            {/* Редовете между междинната и крайната сума, с етикетите на
                търговеца: правила за количката, отстъпки, доставка. Тях сами
                никога няма да ги познаем. */}
            {adjustments.map((row) => (
              <div key={row.key ?? row.name} className="bb-cart-sum-row">
                <span>{row.name || row.key}</span>
                <span>{fmtEur(money(row) ?? 0)}</span>
              </div>
            ))}
            {savedEur > 0 && (
              <div className="bb-cart-sum-row bb-cart-sum-row--save">
                <span>
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Спестяваш
                </span>
                <span>−{fmtEur(savedEur)}</span>
              </div>
            )}
            <div className="bb-cart-sum-row">
              <span>Доставка</span>
              <span>{isFreeShip ? <strong className="bb-cart-free">Безплатна</strong> : 'на следваща стъпка'}</span>
            </div>

            <div className="bb-cart-total">
              <div className="bb-cart-total-lbl">Крайна сума</div>
              <div className="bb-cart-total-vals">
                {savedEur > 0 && (
                  <div className="bb-cart-total-msrp">{fmtEur(rawTotal.eur)}</div>
                )}
                <div className="bb-cart-total-eur">{fmtEur(totalEur)}</div>
                {SHOW_BGN && <div className="bb-cart-total-bgn">{fmtBgn(totalBgn)}</div>}
              </div>
            </div>

            <PromoCode cart={cart} />

            <CheckoutButton cart={cart} className="bb-cart-checkout" />

            <p className="bb-cart-note">
              Таксите и доставката се изчисляват на следващата стъпка
            </p>

            <CartTrustStrip />
          </div>
        </aside>
      </div>
    </div>
  );
}

function CartPageEmpty() {
  return (
    <div className="bb-cart">
      <div className="bb-cart-head">
        <h1 className="bb-cart-title">Твоята кошница</h1>
      </div>
      <div className="bb-cart-empty">
        <div className="bb-cart-empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5.5 8h13l-1.2 10.5a1.6 1.6 0 01-1.6 1.5H8.3a1.6 1.6 0 01-1.6-1.5L5.5 8z" />
            <path d="M9 8a3 3 0 016 0" />
          </svg>
        </div>
        <p className="bb-cart-empty-h">Кошницата ти е празна</p>
        <p className="bb-cart-empty-p">
          Добави продукти и започни своето пътуване към микробиомния баланс.
        </p>
        <Link to="/category/all-products" className="bb-cart-empty-cta" prefetch="intent">
          Виж продуктите
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

/** One cart line on the page — roomier than the drawer row. */
function CartPageRow({line}: {line: any}) {
  const update = useFetcher({key: `page-update-${line.id}`});
  const remove = useFetcher({key: `page-remove-${line.id}`});

  // Optimistic UI, same contract as the drawer row.
  if (remove.state !== 'idle') return null;
  const pendingQty = update.formData ? Number(update.formData.get('quantity')) : null;
  const qty = pendingQty ?? line.quantity;
  if (qty <= 0) return null;

  const m = line.merchandise;
  const handle = m.product?.handle as string | undefined;
  const title = m.product?.title || m.title || 'Продукт';
  const to = handle ? `/product/${handle}` : '#';

  const enhanced = handle ? getEnhancedFeatured(handle) : null;
  const img = enhanced || m.image?.url || m.product?.featuredImage?.url || '/noimage.svg';
  const variantTitle = m.title && m.title !== 'Default Title' ? m.title : null;

  // Двете цени, които редът вече носи - същият помощник, който ползва и
  // чекмеджето, вместо тукашно умножаване по процент от админско правило.
  const {price: linePrice, compareAtPrice: lineCompare} = markPricingForLine(line, qty);
  const sale = bothCurrencies(linePrice);
  const msrp = lineCompare ? bothCurrencies(lineCompare) : sale;
  const hasDiscount = !!lineCompare && msrp.eur > sale.eur;
  const rowPct = hasDiscount
    ? displayDiscountPercent(null, sale.eur, msrp.eur)
    : 0;
  const saleEur = sale.eur;
  const saleBgn = sale.bgn;

  return (
    <li className="bb-cart-item">
      <Link to={to} className="bb-cart-item-img" prefetch="intent">
        <img src={img} alt={m.image?.altText || title} loading="lazy" onError={fallbackToPlaceholder} />
        {hasDiscount && rowPct > 0 && <span className="bb-cart-item-badge">−{rowPct}%</span>}
      </Link>

      <div className="bb-cart-item-info">
        <Link to={to} className="bb-cart-item-name" prefetch="intent">
          {title}
        </Link>
        {variantTitle && <div className="bb-cart-item-meta">{variantTitle}</div>}

        <div className="bb-cart-item-actions">
          <div className="bb-cart-qty">
            <update.Form method="post" action={CART_ACTION}>
              <input type="hidden" name="action" value="UPDATE_CART" />
              <input type="hidden" name="lineId" value={line.id} />
              <input type="hidden" name="quantity" value={Math.max(0, qty - 1)} />
              <button type="submit" disabled={qty <= 1 || update.state !== 'idle'} aria-label="Намали количеството">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </update.Form>
            <span className="bb-cart-qty-num">{qty}</span>
            <update.Form method="post" action={CART_ACTION}>
              <input type="hidden" name="action" value="UPDATE_CART" />
              <input type="hidden" name="lineId" value={line.id} />
              <input type="hidden" name="quantity" value={qty + 1} />
              <button type="submit" disabled={update.state !== 'idle'} aria-label="Увеличи количеството">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <line x1="12" y1="5" x2="12" y2="19" />
                </svg>
              </button>
            </update.Form>
          </div>

          <remove.Form method="post" action={CART_ACTION}>
            <input type="hidden" name="action" value="REMOVE_FROM_CART" />
            <input type="hidden" name="lineId" value={line.id} />
            <button type="submit" className="bb-cart-remove" aria-label={`Премахни ${title}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1.2 13.5a1.6 1.6 0 01-1.6 1.5H7.8a1.6 1.6 0 01-1.6-1.5L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
              </svg>
              Премахни
            </button>
          </remove.Form>
        </div>
      </div>

      <div className="bb-cart-item-price">
        <div className="bb-cart-item-price-eur">{fmtEur(saleEur)}</div>
        {SHOW_BGN && <div className="bb-cart-item-price-bgn">{fmtBgn(saleBgn)}</div>}
        {hasDiscount && (
          <div className="bb-cart-item-price-msrp">{fmtEur(msrp.eur)}</div>
        )}
      </div>
    </li>
  );
}
