import {Suspense} from 'react';
import {Await, useFetcher, useFetchers, useRouteLoaderData} from 'react-router';
import {monthlyPackages} from '~/lib/quantity-packages';
import {AddToCartButton} from '~/components/AddToCartButton';
import {CART_ACTION} from '~/lib/cart-action';

import {SHOW_BGN, EUR_TO_BGN} from '~/lib/currency';
import {isAvailable} from '~/lib/availability';

const fmt = (n: number, currency: 'EUR' | 'BGN') =>
  new Intl.NumberFormat('bg-BG', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(n) +
  (currency === 'EUR' ? ' €' : ' лв.');

/**
 * Месечни пакети — the merchant's quantity discounts, presented the way the
 * official store presents them: a course of treatment, not "buy 4 pieces".
 *
 * The single item is deliberately NOT one of the cards — that is what the
 * quantity control underneath already is. These are the multi-month options.
 *
 * Всяка карта има ЕДНО действие: бутонът „Добави", който слага своето
 * количество направо в количката. Клик по самата карта не прави нищо - виж
 * бележката при мрежата отдолу защо.
 *
 * Renders nothing when the product has no quantity rule in the admin panel.
 */
export function MonthlyPackages({
  product,
  variant,
  singlePriceEur,
}: {
  product: any;
  variant: any;
  /** The price of one item as the page already shows it, promotions included. */
  singlePriceEur: number;
}) {
  const packages = monthlyPackages(product?.id, singlePriceEur).filter((p) => p.months > 1);
  if (!packages.length) return null;

  const best = packages.reduce((a, b) => (b.savingPct > a.savingPct ? b : a));
  const longest = packages[packages.length - 1].months;
  const image = product?.featuredImage?.url as string | undefined;

  return (
    <div className="bb-months" aria-label="Месечни пакети">
      <div className="bb-months-head">
        <span className="bb-months-title">Избери твоя курс</span>
        <span className="bb-months-hint">Пробиотиците действат при редовен прием</span>
      </div>

      {/* Картата е само витрина, не превключвател.
       *
       * Дотук цялата карта беше `role="radio"` и клик върху нея я маркираше и
       * сменяше количеството в кутията за покупка. Едновременно с това вътре
       * стоеше и „Добави", който добавя своето количество направо. Две
       * припокриващи се действия на едно място объркваха: човек кликва картата,
       * тя се маркира, но нищо не влиза в количката.
       *
       * Клиентът поиска (20.08.2026) кликаем да е САМО „Добави". */}
      <CartAware variantId={variant?.id}>
      {(cartQty: number, lineId: string | null) => (
      <>
      <div className="bb-months-grid">
        {packages.map((pkg) => {
          /* „Премахни" се показва в картата, чието количество СЪВПАДА с това в
             количката.
             Количката не помни кой бутон е натиснат - пакетите са количества от
             един и същи вариант, тоест „4-месечен" е просто 4 броя. Затова
             съвпадението е единственият честен признак: 4 в количката значи
             картата за 4 месеца. Добави ли човек два различни пакета (2+4=6),
             нито една карта не съвпада и изходът минава през реда отдолу. */
          const mine = Boolean(lineId) && cartQty === pkg.months;
          return (
            <div key={pkg.months} className="bb-month">
              {pkg.savingPct > 0 && pkg.months === best.months && (
                <span className="bb-month-flag">Най-изгодно</span>
              )}

              <div className="bb-month-visual">
                <span className="bb-month-mult">{pkg.months}×</span>
                {image ? (
                  <img
                    src={resize(image, 420)}
                    alt=""
                    aria-hidden="true"
                    // Eager: this sits in the buy box, above the fold.
                    loading="eager"
                    className="bb-month-img"
                    onError={(e) => {
                      const base = image.split('?')[0];
                      if (e.currentTarget.src !== base) e.currentTarget.src = base;
                    }}
                  />
                ) : null}
                {/* The photo is portrait, so it is drawn oversized and cut off.
                    The gradient does the cutting instead of a hard edge — a
                    straight crop across a product box reads as a broken image. */}
                <span className="bb-month-fade" aria-hidden="true" />
              </div>

              <span className="bb-month-name">{pkg.months}-месечен пакет</span>
              <span className="bb-month-sub">
                {pkg.months} опаковки · {pkg.months === longest ? 'пълен курс' : 'кратка терапия'}
              </span>

              <span className="bb-month-permonth">
                {fmt(pkg.unitPrice, 'EUR')} <em>/месец</em>
              </span>
              <span className="bb-month-total">
                Общо: <strong>{fmt(pkg.total, 'EUR')}</strong>{SHOW_BGN ? ` / ${fmt(pkg.total * EUR_TO_BGN, 'BGN')}` : ''}
              </span>
              {pkg.saving > 0 && (
                <span className="bb-month-save">Спестяваш {fmt(pkg.saving, 'EUR')}</span>
              )}

              {variant?.id && (
                <AddToCartButton
                  merchandiseId={variant.id}
                  quantity={pkg.months}
                  disabled={!isAvailable(variant)}
                  className="bb-month-add"
                >
                  Добави
                </AddToCartButton>
              )}

              {mine && lineId ? <RemoveLine lineId={lineId} /> : null}
            </div>
          );
        })}
      </div>

      {/* Изход и когато нито една карта не съвпада - например 2+4=6 броя.
          Без него човекът остава без начин да върне избора си от тази страница. */}
      {lineId && !packages.some((p) => p.months === cartQty) ? (
        <MixedLine qty={cartQty} lineId={lineId} />
      ) : null}
      </>
      )}
      </CartAware>

      <style>{`
        .bb-months { margin: 20px 0 8px; }
        /* „Премахни" стои ПОД „Добави" в самата карта - дискретен текстов
           бутон, не втори плътен бутон. Две плътни едно под друго се четат
           като равностойни, а тук едното е основното действие, а другото е
           връщане назад. */
        .bb-month-removeform { margin-top: 6px; width: 100%; }
        .bb-month-remove {
          background: none; border: none; cursor: pointer; font-family: inherit;
          font-size: 12px; font-weight: 700;
          color: rgba(10, 37, 64, 0.55);
          text-decoration: underline; padding: 2px 4px;
        }
        .bb-month-remove:hover { color: var(--color-brand-pink); }
        /* Резервният ред при смесено количество. Един ред текст, без кутия. */
        .bb-months-mixed {
          display: flex; align-items: center; justify-content: flex-end;
          gap: 10px; flex-wrap: wrap;
          margin-top: 10px;
          font-size: 12.5px; color: rgba(10, 37, 64, 0.65);
        }
        .bb-months-mixed form { margin: 0; }
        .bb-months-head {
          display: flex; align-items: baseline; justify-content: space-between;
          gap: 10px; flex-wrap: wrap; margin-bottom: 12px;
        }
        .bb-months-title {
          font-size: 13px; font-weight: 800; letter-spacing: 0.05em;
          text-transform: uppercase; color: var(--color-ink);
        }
        .bb-months-hint { font-size: 12px; color: rgba(10, 37, 64, 0.55); }

        .bb-months-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
        }

        .bb-month {
          position: relative;
          display: flex; flex-direction: column; align-items: center; gap: 3px;
          padding: 0 14px 14px;
          border: 2px solid rgba(10, 37, 64, 0.12);
          border-radius: 18px;
          background: #fff;
          /* БЕЗ cursor: pointer - картата не се кликва, кликва се само бутонът
             в нея. Стрелка върху нещо, което не реагира, е обещание, което
             интерфейсът не спазва. */
          text-align: center;
          overflow: hidden;
          transition: border-color 0.15s, box-shadow 0.15s, transform 0.12s;
        }
        .bb-month:hover { border-color: var(--color-pink-2); transform: translateY(-2px); }
        /* Inside the card now: the photo runs to the edges and the card clips
           its overflow, so a ribbon straddling the top border would be cut in
           half. Top-right, opposite the multiplier. */
        .bb-month-flag {
          position: absolute; top: 10px; right: 10px; z-index: 4;
          background: var(--color-brand-pink); color: #fff;
          font-size: 9.5px; font-weight: 800; letter-spacing: 0.06em;
          text-transform: uppercase; padding: 5px 10px; border-radius: 999px;
          white-space: nowrap; box-shadow: 0 6px 14px -6px rgba(227, 22, 108, 0.7);
        }

        /* The photo gets the whole width of the card and is cropped by the
           container; the fade below turns the crop into a soft landing. */
        .bb-month-visual {
          position: relative;
          width: calc(100% + 28px); margin: 0 -14px 4px;
          height: 132px; overflow: hidden;
          background: radial-gradient(120% 90% at 50% 0%, #fff 0%, var(--color-cream-2) 100%);
        }
        .bb-month-mult {
          position: absolute; left: 10px; top: 10px; z-index: 3;
          width: 38px; height: 38px; border-radius: 50%;
          background: var(--color-ink); color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-serif);
          font-size: 15px; font-weight: 600; letter-spacing: -0.5px;
        }
        .bb-month-img {
          position: absolute; left: 50%; top: 6px; transform: translateX(-50%);
          height: 190px; width: auto; max-width: none;
          object-fit: contain; background: transparent; border-radius: 0;
          aspect-ratio: auto;
        }
        .bb-month-fade {
          position: absolute; left: 0; right: 0; bottom: 0; height: 62px; z-index: 2;
          background: linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, #fff 78%);
        }

        .bb-month-name { font-size: 14.5px; font-weight: 800; color: var(--color-ink); }
        .bb-month-sub { font-size: 11.5px; color: rgba(10, 37, 64, 0.55); margin-bottom: 8px; }

        .bb-month-permonth {
          font-family: var(--font-serif);
          font-size: 22px; font-weight: 600; letter-spacing: -0.6px;
          color: var(--color-brand-pink); line-height: 1.1;
        }
        .bb-month-permonth em { font-style: normal; font-size: 13px; font-weight: 700; }
        .bb-month-total { font-size: 12px; color: rgba(10, 37, 64, 0.62); margin-top: 3px; }
        .bb-month-total strong { color: var(--color-ink); font-weight: 800; }
        .bb-month-save {
          margin-top: 5px; font-size: 11.5px; font-weight: 800;
          color: var(--color-brand-pink);
        }

        /* AddToCartButton wraps its button in a form, which would otherwise
           shrink to its content and leave the CTA half-width. */
        .bb-month form { width: 100%; }
        .bb-month-add {
          margin-top: 12px; width: 100%;
          border: none; border-radius: 12px; cursor: pointer;
          background: var(--color-brand-pink); color: #fff;
          font-family: var(--font-sans);
          font-size: 13.5px; font-weight: 800; letter-spacing: 0.02em;
          padding: 11px 14px;
          transition: background 0.18s, transform 0.12s;
        }
        /* Same green as the main "Купи" button (#15803d = the "В наличност"
           green), so the two CTAs on the page behave identically on hover. */
        .bb-month-add:hover:not(:disabled) { background: #15803d; transform: translateY(-1px); }
        .bb-month-add:disabled { opacity: 0.5; cursor: not-allowed; }

        @media (max-width: 400px) {
          /* One per row here, so the photo has the full column width to fill. */
          .bb-months-grid { grid-template-columns: 1fr; }
          .bb-month-visual { height: 150px; }
          .bb-month-img { height: 215px; }
        }
      `}</style>
    </div>
  );
}

/**
 * CloudCart product images are 1920px originals — asking for the size we draw
 * keeps the card cheap. Arbitrary sizes can 404, hence the onError fallback
 * to the plain URL at every call site.
 */
function resize(url: string, px: number): string {
  const base = url.split('?')[0];
  return `${base}?width=${px}&height=${px}`;
}


/**
 * Подава на децата си колко бройки от този вариант има в количката и кой е
 * редът, за да може да се махне.
 *
 * Количката идва от два източника, в този ред:
 *   1. Отговорът на последното действие с количката (`useFetchers`) - той е
 *      най-пресен. Веднага след „Добави" loader-ът още не е презаредил, а
 *      човекът трябва да види резултата от клика си в същия миг.
 *   2. Количката от root loader-а, която е обещание - при първо зареждане.
 */
function CartAware({
  variantId,
  children,
}: {
  variantId?: string;
  children: (cartQty: number, lineId: string | null) => React.ReactNode;
}) {
  const fetchers = useFetchers();
  const fresh = fetchers
    .filter((f) => f.formAction === CART_ACTION && (f.data as any)?.cart)
    .map((f) => (f.data as any).cart)
    .pop();

  const rootData = useRouteLoaderData('root') as {cart?: Promise<any> | any} | undefined;

  const read = (cart: any) => {
    const line = variantId
      ? (cart?.lines?.nodes ?? []).find((l: any) => l?.merchandise?.id === variantId)
      : null;
    const qty = line?.quantity ?? 0;
    return children(qty > 0 ? qty : 0, qty > 0 ? line.id : null);
  };

  if (fresh) return <>{read(fresh)}</>;
  // Без количка в loader-а рисуваме както при празна - иначе цялата секция
  // изчезва заради нещо второстепенно.
  if (!rootData?.cart) return <>{children(0, null)}</>;

  return (
    <Suspense fallback={<>{children(0, null)}</>}>
      <Await resolve={rootData.cart} errorElement={<>{children(0, null)}</>}>
        {(resolved: any) => <>{read(resolved)}</>}
      </Await>
    </Suspense>
  );
}

/** „Премахни" под „Добави" в самата карта. */
function RemoveLine({lineId}: {lineId: string}) {
  const remove = useFetcher();
  // Докато махането пътува, бутонът изчезва веднага - иначе човекът натиска и
  // нищо не се променя, докато отговорът се върне.
  if (remove.state !== 'idle') return null;
  return (
    <remove.Form method="post" action={CART_ACTION} className="bb-month-removeform">
      <input type="hidden" name="action" value="REMOVE_FROM_CART" />
      <input type="hidden" name="lineId" value={lineId} />
      <button type="submit" className="bb-month-remove">
        Премахни
      </button>
    </remove.Form>
  );
}

/**
 * Резервният изход, когато количеството не отговаря на нито един пакет.
 *
 * Случва се при два добавени пакета (2+4=6) или когато човекът е менил
 * бройката от кутията за покупка. Тогава не можем да посочим карта, затова
 * казваме числото и даваме един ред за изчистване.
 */
function MixedLine({qty, lineId}: {qty: number; lineId: string}) {
  const remove = useFetcher();
  if (remove.state !== 'idle') return null;
  return (
    <div className="bb-months-mixed" role="status">
      <span>
        В количката: <strong>{qty}</strong> {qty === 1 ? 'брой' : 'броя'}
      </span>
      <remove.Form method="post" action={CART_ACTION}>
        <input type="hidden" name="action" value="REMOVE_FROM_CART" />
        <input type="hidden" name="lineId" value={lineId} />
        <button type="submit" className="bb-month-remove">
          Премахни
        </button>
      </remove.Form>
    </div>
  );
}
