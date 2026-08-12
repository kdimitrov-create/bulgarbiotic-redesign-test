import {useEffect, useState} from 'react';
import {
  CROSS_SELL_EVENT,
  platformAcceptOffer,
  type CrossSellOffer as Offer,
} from '~/lib/platform-cart';
import {offerById} from '~/lib/cart-offers';

/**
 * Офертата, която платформата предлага след добавяне в количката.
 *
 * КОЙ решава какво: платформата. Тя връща офертата само когато всички условия
 * от панела са изпълнени - праг, продукти, лимити, брой показвания. Тук не се
 * пресмята нищо, само се пита „каква е тази оферта" и се рисува с езика на
 * този магазин, вместо с оформлението на класическата тема.
 *
 * КОЙ прави подаръка безплатен: пак платформата, но само ако приемането ѝ
 * върне `cross_sell` и `cart_items` - тогава тя връзва новия ред с офертата и
 * слага нейните 100 %. Измерено: със същите полета хавлия за 40 € влиза с
 * 0,00 €, без тях - с 40,00 €.
 *
 * Ако офертата не е сред прочетените от панела (нямаме вариант, който да
 * подадем), не се рисува нищо. По-добре без предложение, отколкото бутон, който
 * не може да я приеме.
 */
export function CrossSellOffer() {
  const [offer, setOffer] = useState<Offer | null>(null);
  const [busy, setBusy] = useState(false);
  const known = offerById(offer?.id);

  useEffect(() => {
    function onOffer(e: Event) {
      setOffer((e as CustomEvent<Offer>).detail ?? null);
    }
    window.addEventListener(CROSS_SELL_EVENT, onOffer);
    return () => window.removeEventListener(CROSS_SELL_EVENT, onOffer);
  }, []);

  // Escape затваря, както всеки друг слой в магазина.
  useEffect(() => {
    if (!offer) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOffer(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [offer]);

  if (!offer || !known || !known.variantId) return null;

  async function accept() {
    if (!offer || !known?.variantId) return;
    setBusy(true);
    await platformAcceptOffer(offer, known.variantId);
    setBusy(false);
    setOffer(null);
  }

  return (
    <div className="bb-xs" role="dialog" aria-modal="true" aria-label={known.title}>
      <button className="bb-xs-scrim" onClick={() => setOffer(null)} aria-label="Затвори" />
      <div className="bb-xs-card">
        <button className="bb-xs-close" onClick={() => setOffer(null)} aria-label="Затвори">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <p className="bb-xs-kicker">{known.free ? 'Подарък за теб' : 'Специална оферта'}</p>
        <h3 className="bb-xs-title">{known.title}</h3>

        {known.imageUrl && (
          <img className="bb-xs-img" src={known.imageUrl} alt="" aria-hidden="true" />
        )}

        <p className="bb-xs-product">
          {known.productTitle}
          {known.free && <span className="bb-xs-free">0,00 €</span>}
        </p>

        <div className="bb-xs-actions">
          <button className="bb-xs-yes" onClick={accept} disabled={busy}>
            {busy ? 'Добавям…' : known.free ? 'Да, искам го' : 'Добави към поръчката'}
          </button>
          <button className="bb-xs-no" onClick={() => setOffer(null)} disabled={busy}>
            Не, благодаря
          </button>
        </div>
      </div>

      <style>{`
        .bb-xs { position: fixed; inset: 0; z-index: 90; display: grid; place-items: center; padding: 20px; }
        .bb-xs-scrim { position: absolute; inset: 0; border: 0; padding: 0; background: rgba(10, 37, 64, 0.55); cursor: pointer; }
        .bb-xs-card {
          position: relative; z-index: 1;
          width: min(420px, 100%);
          background: #fff; border-radius: 20px; padding: 28px 24px 22px;
          text-align: center;
          box-shadow: 0 24px 60px rgba(10, 37, 64, 0.28);
          animation: bb-xs-in 0.24s ease-out;
        }
        @keyframes bb-xs-in { from { opacity: 0; transform: translateY(10px) scale(0.98); } }
        .bb-xs-close {
          position: absolute; top: 10px; right: 10px;
          width: 32px; height: 32px; border: 0; border-radius: 999px;
          background: transparent; color: rgba(10, 37, 64, 0.5); cursor: pointer;
        }
        .bb-xs-close svg { width: 18px; height: 18px; }
        .bb-xs-kicker {
          margin: 0 0 4px; font-size: 12px; font-weight: 800; letter-spacing: 0.08em;
          text-transform: uppercase; color: var(--color-brand-pink);
        }
        .bb-xs-title { margin: 0 0 14px; font-size: 19px; line-height: 1.3; color: var(--color-ink); }
        .bb-xs-img { width: 128px; height: 128px; object-fit: contain; margin: 0 auto 12px; display: block; }
        .bb-xs-product { margin: 0 0 18px; font-size: 14.5px; font-weight: 700; color: var(--color-ink); }
        .bb-xs-free {
          display: inline-block; margin-left: 8px; padding: 2px 8px; border-radius: 999px;
          background: #f2fbf5; color: #16a34a; font-size: 13px;
        }
        .bb-xs-actions { display: flex; flex-direction: column; gap: 8px; }
        .bb-xs-yes {
          padding: 13px 18px; border: 0; border-radius: 999px; cursor: pointer;
          background: var(--color-brand-pink); color: #fff; font-size: 15px; font-weight: 800;
        }
        .bb-xs-yes:disabled { opacity: 0.6; cursor: default; }
        .bb-xs-no {
          padding: 10px; border: 0; background: transparent; cursor: pointer;
          color: rgba(10, 37, 64, 0.55); font-size: 13.5px;
        }
      `}</style>
    </div>
  );
}
