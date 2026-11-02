import {useEffect, useRef, useState, type CSSProperties} from 'react';
import {Link, useFetcher} from 'react-router';
import {CART_ACTION} from '~/lib/cart-action';
import {claimOverlay, releaseOverlay} from '~/lib/overlay-lock';
import {useOpenCartOnAdd} from '~/lib/use-open-cart-on-add';
import {useTrackAddToCart} from '~/lib/use-track-add-to-cart';
import {
  CROSS_SELL_EVENT,
  fmtEur,
  rememberCancel,
  rememberView,
  type CrossSellOffer,
  type CrossSellProduct,
  type CrossSellTrigger,
} from '~/lib/cross-sell';

/** Ключът на fetcher-а, с който прозорецът добавя. По него колелото
 *  разпознава, че това добавяне вече е отговор на оферта. */
export const CROSS_SELL_FETCHER_KEY = 'cross-sell';

/**
 * Кръстосаната оферта „при добавяне в количката" - изскачащият прозорец.
 *
 * Стои в layout-а и чака `CROSS_SELL_EVENT` от `useTrackAddToCart`, през който
 * минава всеки бутон за пазаруване. Чак тогава пита `/api/cross-sell` дали има
 * оферта за този продукт - сървърът прилага условията, тавана на показванията
 * и отказите.
 */
export function CrossSellPopup() {
  const [offer, setOffer] = useState<CrossSellOffer | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    async function onTrigger(e: Event) {
      const t = (e as CustomEvent<CrossSellTrigger>).detail;
      if (!t?.handle || busy.current) return;
      busy.current = true;
      try {
        const qs = new URLSearchParams({
          handle: t.handle,
          cart: t.cartHandles.join(','),
          subtotal: String(t.subtotal || 0),
        });
        const res = await fetch(`/api/cross-sell?${qs}`, {credentials: 'same-origin'});
        const json = res.ok ? ((await res.json()) as {offer: CrossSellOffer | null}) : null;
        const next = json?.offer;
        if (!next?.products?.length) return;
        // Колелото е излязло първо - офертата не се показва и не се брои.
        if (!claimOverlay('cross-sell')) return;
        rememberView(next.id);
        setOffer(next);
      } catch {
        /* прозорецът е екстра; добавянето вече е минало */
      } finally {
        busy.current = false;
      }
    }
    window.addEventListener(CROSS_SELL_EVENT, onTrigger);
    return () => window.removeEventListener(CROSS_SELL_EVENT, onTrigger);
  }, []);

  if (!offer) return null;

  return (
    <CrossSellModal
      offer={offer}
      onClose={(declined) => {
        if (declined) rememberCancel(offer.id);
        setOffer(null);
        releaseOverlay('cross-sell');
      }}
    />
  );
}

/**
 * Самият прозорец. Ползва се и от живата витрина, и от прегледа в панела -
 * затова прегледът показва точно това, което ще види клиентът.
 *
 * В прегледа (`preview`) бутоните не добавят: оферта в пясъчник или неактивна
 * оферта с условия платформата отказва да закачи за количката.
 */
export function CrossSellModal({
  offer,
  onClose,
  preview = false,
}: {
  offer: CrossSellOffer;
  /** `declined` - клиентът изрично е отказал („Не, благодаря" / ×). */
  onClose: (declined: boolean) => void;
  preview?: boolean;
}) {
  const fetcher = useFetcher({key: CROSS_SELL_FETCHER_KEY});
  const [adding, setAdding] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useOpenCartOnAdd(fetcher);
  useTrackAddToCart(fetcher, adding ?? undefined, 1, undefined, false);

  // Появява се на следващия кадър, за да има от какво да анимира.
  useEffect(() => {
    const t = window.setTimeout(() => setShown(true), 20);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (shown) void celebrate(offer.popupEffect);
  }, [shown, offer.popupEffect]);

  useEffect(() => {
    if (preview) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose(true);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [preview, onClose]);

  // Добавено - прозорецът се затваря, чекмеджето се отваря (`useOpenCartOnAdd`).
  // При грешка остава отворен и казва какво е станало.
  useEffect(() => {
    if (fetcher.state !== 'idle' || !fetcher.data || !adding) return;
    const errors = ((fetcher.data as any)?.errors ?? []) as Array<{message?: string}>;
    if (errors.length) {
      setNote(errors[0]?.message || 'Продуктът не можа да бъде добавен');
      setAdding(null);
      return;
    }
    onClose(false);
  }, [fetcher.state, fetcher.data, adding, onClose]);

  function add(p: CrossSellProduct) {
    if (!p.variantId) return;
    if (preview) {
      setNote('Това е преглед - бутонът не добавя. Клиентът ще получи продукта в количката си.');
      return;
    }
    setNote(null);
    setAdding(p.variantId);
    fetcher.submit(
      {action: 'ADD_TO_CART', merchandiseId: p.variantId, quantity: '1', crossSellId: offer.id},
      {method: 'post', action: CART_ACTION},
    );
  }

  const style = {
    '--cs-bg': offer.background || undefined,
    '--cs-text': offer.textColor || undefined,
    '--cs-btn-bg': offer.buttonBackground || undefined,
    '--cs-btn-text': offer.buttonTextColor || undefined,
  } as CSSProperties;

  return (
    <>
      {/* В прегледа прозорецът стои в страницата, за да се виждат и бележките над него. */}
      {!preview && (
        <div
          className={`bb-xs-overlay${shown ? ' open' : ''}`}
          onClick={() => onClose(true)}
          aria-hidden="true"
        />
      )}
      <div
        className={`bb-xs${shown ? ' open' : ''}${preview ? ' is-inline' : ''}`}
        style={style}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bb-xs-title"
      >
        <button type="button" className="bb-xs-close" onClick={() => onClose(true)} aria-label="Затвори">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="bb-xs-head">
          {offer.discountLabel && <span className="bb-xs-badge">{offer.discountLabel}</span>}
          <h2 id="bb-xs-title">{offer.title}</h2>
          {offer.description && (
            <div className="bb-xs-desc" dangerouslySetInnerHTML={{__html: offer.description}} />
          )}
        </div>

        <ul className={`bb-xs-list count-${Math.min(offer.products.length, 3)}`}>
          {offer.products.map((p) => (
            <li key={p.handle} className="bb-xs-item">
              <Link to={`/product/${p.handle}`} className="bb-xs-img" onClick={() => onClose(false)}>
                {p.imageUrl ? <img src={p.imageUrl} alt={p.title} /> : null}
              </Link>
              <Link to={`/product/${p.handle}`} className="bb-xs-name" onClick={() => onClose(false)}>
                {p.title}
              </Link>
              <div className="bb-xs-price">
                {p.offerPrice != null && p.offerPrice < p.price ? (
                  <>
                    <s>{fmtEur(p.price)}</s>
                    <strong>{fmtEur(p.offerPrice)}</strong>
                  </>
                ) : (
                  <strong>{fmtEur(p.price)}</strong>
                )}
              </div>
              {p.variantId ? (
                <button
                  type="button"
                  className="bb-xs-add"
                  onClick={() => add(p)}
                  disabled={!!adding}
                >
                  {adding === p.variantId ? 'Добавям…' : offer.buttonName}
                </button>
              ) : (
                // С няколко варианта изборът е на клиента - същото правило като в картите.
                <Link to={`/product/${p.handle}`} className="bb-xs-add" onClick={() => onClose(false)}>
                  Избери
                </Link>
              )}
            </li>
          ))}
        </ul>

        {note && (
          <p className="bb-xs-note" role="status">
            {note}
          </p>
        )}

        <button type="button" className="bb-xs-cancel" onClick={() => onClose(true)}>
          {offer.cancelButtonName}
        </button>
      </div>
    </>
  );
}

/**
 * Ефектът от панела: конфети, фойерверки или „School pride" (два топа отстрани).
 * Библиотеката се зарежда чак когато трябва - иначе всяка страница би я плащала.
 */
async function celebrate(effect: string | null) {
  if (!effect || effect === 'none') return;
  const confetti = (await import('canvas-confetti')).default;
  const zIndex = 400;
  const colors = ['#E3166C', '#0267A0', '#F5EFE3', '#FFD166'];

  if (effect === 'fireworks') {
    const end = Date.now() + 1800;
    const timer = window.setInterval(() => {
      if (Date.now() > end) return window.clearInterval(timer);
      confetti({
        particleCount: 40,
        spread: 360,
        startVelocity: 28,
        ticks: 60,
        zIndex,
        origin: {x: 0.15 + Math.random() * 0.7, y: 0.15 + Math.random() * 0.35},
      });
    }, 260);
    return;
  }

  if (effect === 'school_pride' || effect === 'school-pride') {
    const end = Date.now() + 1600;
    (function frame() {
      confetti({particleCount: 3, angle: 60, spread: 55, origin: {x: 0}, colors, zIndex});
      confetti({particleCount: 3, angle: 120, spread: 55, origin: {x: 1}, colors, zIndex});
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
    return;
  }

  confetti({particleCount: 140, spread: 80, origin: {y: 0.55}, zIndex});
}
