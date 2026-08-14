import {Await, Link, useFetcher} from 'react-router';
import {Suspense, useEffect, useMemo, useRef, useState} from 'react';
import type {CartData} from '@cloudcart/nitro';
import {useAside} from './Aside';
import {getEnhancedFeatured} from '~/lib/product-images';
import {BUMP_CART_CONFIG} from '~/lib/bump-cart-config';
import {displayDiscountPercent, freeShippingOver} from '~/lib/active-discounts';
import {markPricingForLine, marksForHandle} from '~/lib/product-marks';
import {adjustmentLines, money, subtotalLine, totalLine, type CartSummary} from '~/lib/cart-summary';
import {CheckoutButton} from './CheckoutButton';
import {PromoCode} from './PromoCode';
import {numericId} from '~/lib/analytics';
import {CartOffersStrip, CartGiftLines} from './CartOffers';

import {SHOW_BGN, EUR_TO_BGN} from '~/lib/currency';
import {CART_ACTION} from '~/lib/cart-action';
/**
 * Сумата, от която доставката е безплатна.
 *
 * Първо правилото от панела (Отстъпки → вид „доставка"), защото това е мястото,
 * където търговецът наистина я сменя. Няма ли действащо такова, остава
 * настройката на BumpCart - 51 € на bulgarbiotic.bg, между реалните прагове на
 * куриерите (Спиди от 50 €, Sameday от 51,13 €). Тя се обновява ръчно в
 * `app/lib/bump-cart-config.ts`.
 *
 * Функция, а не константа: правилото пристига през root loader-а, тоест
 * стойността се знае чак при рендиране.
 */
export function freeShippingTargetEur(): number {
  return freeShippingOver() ?? BUMP_CART_CONFIG.totalCartAmount;
}

export const fmtEur = (amount: number) =>
  new Intl.NumberFormat('bg-BG', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(amount) + ' €';
export const fmtBgn = (amount: number) =>
  new Intl.NumberFormat('bg-BG', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(amount) + ' лв';

/**
 * A product whose image file is missing on the store CDN returns 404, and the
 * browser then paints the broken-image icon plus the alt text — which is what a
 * customer saw for the lucky-wheel prize product. The three-tier `img` pick
 * only guards against a MISSING url, not a dead one, so swap in the placeholder
 * on the error event too. Guarded so a missing placeholder can't loop.
 */
export function fallbackToPlaceholder(e: React.SyntheticEvent<HTMLImageElement>) {
  const el = e.currentTarget;
  if (el.dataset.fallbackApplied) return;
  el.dataset.fallbackApplied = '1';
  el.src = '/noimage.svg';
}

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

export function CartDrawer({
  cart,
  summary,
}: {
  cart: Promise<CartData | null>;
  summary?: Promise<CartSummary | null>;
}) {
  // ТУК НЕ СЕ ПРАВЯТ ОБЕЩАНИЯ.
  //
  // Преди тук стоеше Promise.all([cart, summary]) направо в resolve - ново
  // обещание на всяка рисунка. <Await> не го познава, хвърля го и React
  // изчаква; то се изпълнява веднага, React пробва пак, а рисунката прави
  // следващото ново обещание. Кръг по двеста пъти в секунда, който върти
  // планировчика и оставя преходите без ред: оттам идваха и „адресът се сменя,
  // а страницата остава", и „количката не се обновява без презареждане".
  //
  // useMemo НЕ спасява точно тук. Чекмеджето се качва в мига, в който се
  // отвори, а компонент, чиято първа рисунка увисва, никога не се записва -
  // значи няма запазено състояние и сметката се прави наново при всеки опит.
  // Затова двете обещания се чакат едно в друго и идват готови отвън, от
  // root, който вече е записан и ги прави веднъж.
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
        {(resolvedCart: CartData | null) =>
          summary ? (
            <Await resolve={summary}>
              {(resolvedSummary: CartSummary | null) => (
                <CartDrawerInner cart={resolvedCart} summary={resolvedSummary} />
              )}
            </Await>
          ) : (
            <CartDrawerInner cart={resolvedCart} summary={null} />
          )
        }
      </Await>
    </Suspense>
  );
}

function CartDrawerInner({cart, summary}: {cart: CartData | null; summary?: CartSummary | null}) {
  const {close} = useAside();
  const lines = cart?.lines?.nodes ?? [];
  const isEmpty = !cart || cart.totalQuantity === 0;

  /**
   * Сметката се ЧЕТЕ от количката, не се смята тук.
   *
   * Реалната сума е сборът на редовете, който съвпада с `cost.subtotalAmount`.
   * Всяка отстъпка вече е вътре: автоматичните правила, количествените пакети и
   * промо кодът. Проверено на живо 2026-08-13 - 2 бр. Pets с код AUGUST10 карат
   * реда от 42,94 на 38,65, без нищо да смятаме отстрани.
   *
   * 🛑 `cost.totalAmount` НЕ се ползва. На bulgarbiotic.bg връща ТОЧНО
   * половината от сумата (147,34 сбор на редовете срещу 73,67 в полето, при три
   * различни колички), а самото API казва, че `cost` е „за логика, не за
   * показване" - за показване е `totals`, обобщението на търговеца.
   */
  let payableEur = 0;
  let msrpEur = 0;
  for (const l of lines as any[]) {
    const {price, compareAtPrice} = markPricingForLine(l);
    const now = bothCurrencies(price).eur;
    payableEur += now;
    msrpEur += compareAtPrice ? bothCurrencies(compareAtPrice).eur : now;
  }
  /* Обобщението на търговеца е истината за сумата.
     Сборът на редовете не познава ПРАВИЛАТА ЗА КОЛИЧКАТА - те се прилагат от
     платформата и идват като собствен ред в `totals`. Без това чекмеджето
     показва сума над тази, която касата събира. */
  const summaryTotal = money(totalLine(summary));
  const summarySubtotal = money(subtotalLine(summary));
  const adjustments = adjustmentLines(summary);
  const payable = summaryTotal ?? payableEur;
  const shownSubtotal = summarySubtotal ?? payableEur;
  const savedEur = Math.max(0, msrpEur - payable);
  const subtotal = {eur: shownSubtotal, bgn: shownSubtotal * EUR_TO_BGN};
  const rawTotal = {eur: msrpEur, bgn: msrpEur * EUR_TO_BGN};
  const total = {eur: payable, bgn: payable * EUR_TO_BGN};

  // Threshold + progress live in EUR because the store's base currency
  // is EUR (verified via generalSettings.currency). The Bulgarian-lev
  // value is shown alongside as a convenience.
  const shippingTarget = freeShippingTargetEur();
  const remainingEur = Math.max(0, shippingTarget - subtotal.eur);
  const remainingBgn = remainingEur * EUR_TO_BGN;
  const shippingPct = shippingTarget > 0 ? Math.min(100, (subtotal.eur / shippingTarget) * 100) : 100;
  const isFreeShip = remainingEur <= 0.005; // tolerate sub-cent rounding

  return (
    <div className="bb-cd">
      {/* Единствената заглавна лента. Панелът вече не рисува своя (`bare` в
          `Aside`), затова бутонът за затваряне идва тук. */}
      <div className="bb-cd-head">
        <h3>
          Твоята кошница
          {cart && cart.totalQuantity > 0 && (
            <span className="bb-cd-count">· {cart.totalQuantity}</span>
          )}
        </h3>
        <button type="button" className="bb-cd-close" onClick={close} aria-label="Затвори">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
      </div>

      {!isEmpty && (
        <div className="bb-cd-shipping">
          <div className="bb-cd-shipping-text">
            {isFreeShip ? (
              <>
                <span className="bb-cd-shipping-icon" aria-hidden="true">✓</span>
                Поздравления - <strong>безплатна доставка</strong> е включена!
              </>
            ) : (
              <>
                Поръчай за още <strong className="accent">{fmtEur(remainingEur)}</strong>{SHOW_BGN ? <span className="bb-cd-shipping-bgn"> ({fmtBgn(remainingBgn)})</span> : null} и доставката е безплатна
              </>
            )}
          </div>
          <div className="bb-cd-shipping-track">
            <div className="bb-cd-shipping-fill" style={{width: `${shippingPct}%`}} />
          </div>
          {/* The merchant's gift offers and cart rules, live from the panel. */}
          <CartOffersStrip subtotalEur={subtotal.eur} messages={summary?.messages ?? []} />
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
          {/* Списъкът и bump cart-ът са в обща обвивка.
              На телефон и таблет тя е скролерът, тоест двете се превъртат заедно
              и bump cart-ът не отнема височина на продуктите (като съсед със
              собствена височина той смачка списъка до 28 пиксела).
              От 1280px обвивката става `display: contents` и решетката вижда
              двете направо: списъкът вляво, bump cart-ът в дясната колона. */}
          <div className="bb-cd-mid">
            {/* Броят редове отива в `data-count`, за да растат картите, когато
                продуктите са малко. */}
            <div className="bb-cd-scroll">
              <ul className="bb-cd-items" data-count={lines.length}>
                {lines.map((line) => (
                  <CartLineRow key={line.id} line={line} onProductClick={close} />
                ))}
                {/* Спечеленият подарък, докато платформата още не го е сложила. */}
                <CartGiftLines subtotalEur={subtotal.eur} lines={lines} />
              </ul>
            </div>

            {/* Показва се само докато безплатната доставка не е достигната. */}
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
            {/* Промокодът стои НАД крайната сума, за да се вижда как сумата се
                променя веднага след прилагане. Същият компонент като на
                страницата `/cart` - два отделни преписа щяха да се разминат. */}
            <PromoCode cart={cart} variant="drawer" />

            {/* Single-line grand total — shipping already communicated
                up top by the progress bar, VAT note moved to subtitle.
                Drops 3 separate rows → 1 row + 1 subtitle. */}
            {/* Редовете на търговеца между междинната и крайната сума:
                правила за количката, отстъпки, доставка. */}
            {adjustments.length > 0 && (
              <div className="bb-cd-adjust">
                {adjustments.map((row) => (
                  <div key={row.key ?? row.name} className="bb-cd-adjust-row">
                    <span>{row.name || row.key}</span>
                    <span>{fmtEur(money(row) ?? 0)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="bb-cd-grand">
              <div className="bb-cd-grand-lbl-col">
                <div className="bb-cd-grand-lbl">Крайна сума</div>
                {savedEur > 0 && (
                  <div className="bb-cd-grand-savings">
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Спестяваш <strong>{fmtEur(savedEur)}</strong>
                  </div>
                )}
                <div className="bb-cd-grand-note">
                  Таксите и доставката се изчисляват на следващата стъпка
                </div>
              </div>
              <div className="bb-cd-grand-val-col">
                {savedEur > 0 && (
                  <div className="bb-cd-grand-msrp" aria-label={`Стара цена ${fmtEur(rawTotal.eur)}`}>
                    {fmtEur(rawTotal.eur)}
                  </div>
                )}
                <div className="bb-cd-grand-val">{fmtEur(total.eur)}</div>
                {SHOW_BGN && <div className="bb-cd-grand-bgn">{fmtBgn(total.bgn)}</div>}
              </div>
            </div>
            {/* Лентата за действие.
                На телефон тя се залепва за долния ръб (`position: sticky`), а
                всичко останало се превърта под нея - затова сумата се повтаря
                вътре в нея дребно, за да е винаги пред очите. На широк екран е
                обикновен ред във футъра и повторената сума не се рисува.
                Нарочно е ЕДИН бутон, а не два: два бутона в двата режима са две
                места, на които после се разминава поведението. */}
            <div className="bb-cd-action">
              <div className="bb-cd-action-total" aria-hidden="true">
                <span>Крайна сума</span>
                <strong>{fmtEur(total.eur)}</strong>
              </div>
              <CheckoutButton cart={cart} className="bb-cd-checkout" />
            </div>

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
        {/* Apple Pay / Google Pay FIRST (client request), then Visa/Mastercard.
            Clean inline marks (self-contained, no external asset). */}
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
        {/* Куриерите (Еконт / Спиди / BOX NOW / Sameday) са премахнати по
            заявка на клиента (2026-08-04) - остават само плащанията. */}
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
  // Both prices come straight from CloudCart: the variant price the line
  // carries (promotion included) and the line cost the cart API leaves at
  // MSRP. Passing the optimistic `qty` keeps them in step while a +/− is in
  // flight. Nothing is derived from a discount percentage here.
  const pricing = markPricingForLine(line, qty);
  const sale = bothCurrencies(pricing.price);
  const msrp = pricing.compareAtPrice ? bothCurrencies(pricing.compareAtPrice) : sale;
  const hasDiscount = msrp.eur > sale.eur + 0.005;
  const saleEur = sale.eur;
  const saleBgn = sale.bgn;

  return (
    <li className="bb-cd-item">
      <Link
        to={handle ? `/product/${handle}` : '#'}
        onClick={onProductClick}
        className="bb-cd-item-imglink"
        prefetch="intent"
      >
        <img src={img} alt={m.image?.altText || title} loading="lazy" onError={fallbackToPlaceholder} />
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
            <update.Form method="post" action={CART_ACTION} className="bb-cd-qty-form">
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
            <update.Form method="post" action={CART_ACTION} className="bb-cd-qty-form">
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
          <remove.Form method="post" action={CART_ACTION}>
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
        {SHOW_BGN && <div className="bb-cd-item-price-bgn">{fmtBgn(saleBgn)}</div>}
        {hasDiscount && (
          <>
            <div className="bb-cd-item-price-msrp">
              <span className="bb-cd-item-price-msrp-eur">{fmtEur(msrp.eur)}</span>
              {SHOW_BGN && <span className="bb-cd-item-price-msrp-bgn">{fmtBgn(msrp.bgn)}</span>}
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

  // Кой край на лентата гледаме - оттам се решава кои стрелки и коя преливка
  // да се рисуват.
  //
  // Мери се с ResizeObserver, а не само на `resize` от прозореца: лентата сменя
  // ширината си и когато чекмеджето се отваря, и когато на 1280px мине в дясната
  // колона - и в двата случая прозорецът мълчи, а стрелките оставаха такива,
  // каквито са били при първата рисунка.
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
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null;
    ro?.observe(el);
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      ro?.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [picks.length]);

  function scrollByCard(dir: -1 | 1) {
    const el = scrollerRef.current;
    if (!el) return;
    // Стъпката се мери от самите карти, а не от число тук. Ширината и разстоянието
    // живеят в CSS-а; докато стояха преписани и на двете места, всяка промяна в
    // стила разминаваше превъртането с точно толкова, колкото е разликата.
    const firstCard = el.querySelector('.bb-cd-upsell-card') as HTMLElement | null;
    const cardW = firstCard?.getBoundingClientRect().width ?? 140;
    const gap = parseFloat(getComputedStyle(el).columnGap || '0') || 10;
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
  // `suggestion.price` is the variant price, which ALREADY has the promotion
  // in it — taking the rule percentage off it a second time advertised a
  // Femin at 11.74 € that the cart then charged 19.25 €. The "was" price comes
  // from the catalogue snapshot, looked up by handle, and the badge is derived
  // from the two prices printed on the card so it can never contradict them.
  const sale = bothCurrencies(suggestion.price);
  const shared = marksForHandle(suggestion.handle);
  const msrp = shared?.compareAtPrice ? bothCurrencies(shared.compareAtPrice) : sale;
  const hasDiscount = msrp.eur > sale.eur + 0.005;
  const discountPct = hasDiscount ? displayDiscountPercent(null, sale.eur, msrp.eur) : 0;
  const saleEur = sale.eur;
  const saleBgn = sale.bgn;

  useEffect(() => {
    if (add.state === 'idle' && add.data) {
      onAdded();
    }
  }, [add.state, add.data, onAdded]);

  return (
    <div className="bb-cd-upsell-card">
      <Link to={`/product/${suggestion.handle}`} className="bb-cd-upsell-img" prefetch="intent">
        <img src={img} alt={suggestion.title} loading="lazy" onError={fallbackToPlaceholder} />
        {hasDiscount && <span className="bb-cd-upsell-badge">−{discountPct}%</span>}
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
        {/* Редът в лева пада по искане на клиента - виж `SHOW_BGN`. */}
        {SHOW_BGN && (
          <div className="bb-cd-upsell-price-bgn-row">
            {fmtBgn(saleBgn)}
            {hasDiscount && (
              <span className="bb-cd-upsell-price-msrp-bgn"> · {fmtBgn(msrp.bgn)}</span>
            )}
          </div>
        )}
        <add.Form method="post" action={CART_ACTION} className="bb-cd-upsell-add-form">
          <input type="hidden" name="action" value="ADD_TO_CART" />
          <input type="hidden" name="merchandiseId" value={suggestion.merchandiseId ?? ''} />
          {/* Fallback: if the upsell suggestion has no variant id, send the
              handle so the /cart action resolves the first variant server-side. */}
          <input type="hidden" name="handle" value={suggestion.handle} />
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
