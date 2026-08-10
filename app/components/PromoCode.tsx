import {useFetcher} from 'react-router';
import type {CartData} from '@cloudcart/nitro';

/**
 * Поле за промокод. Едно и също в страницата на количката и в чекмеджето.
 *
 * Action-ът `APPLY_DISCOUNT` в `/cart` съществуваше отдавна - колелото на
 * късмета го ползва - но клиентът нямаше откъде да въведе код на ръка.
 *
 * Живее в отделен файл нарочно: полето трябва да работи и на двете места, а
 * два отделни преписа неизбежно се разминават при първата поправка.
 *
 * Ползва се `useFetcher`, а не форма с навигация, за да не се презарежда
 * страницата и грешката да излезе на място. `userErrors` идват готови от
 * action-а.
 */
export function PromoCode({
  cart,
  variant = 'page',
}: {
  cart: CartData | null;
  /** `drawer` е по-тесният вариант - същата логика, по-малко отстояния. */
  variant?: 'page' | 'drawer';
}) {
  const fetcher = useFetcher();
  const applied = ((cart as any)?.discountCodes ?? []) as Array<{
    code: string;
    applicable?: boolean;
  }>;
  const busy = fetcher.state !== 'idle';
  // Кодът се приема от API-то, но може да не важи за тази количка. Показваме
  // го като отказан, вместо да мълчим - иначе клиентът чака отстъпка, която
  // няма да я има и на checkout-а.
  const rejected = applied.filter((d) => d.applicable === false);
  const active = applied.filter((d) => d.applicable !== false);
  const errors = ((fetcher.data as any)?.errors ?? []) as Array<{message: string}>;
  const inputId = variant === 'drawer' ? 'bb-promo-drawer' : 'bb-promo-page';

  return (
    <div className={`bb-cart-promo bb-cart-promo--${variant}`}>
      {active.length > 0 && (
        <ul className="bb-cart-promo-list">
          {active.map((d) => (
            <li key={d.code}>
              <span className="bb-cart-promo-tag">{d.code}</span>
              <fetcher.Form method="post" action="/cart">
                <input type="hidden" name="action" value="APPLY_DISCOUNT" />
                <input type="hidden" name="code" value="" />
                <button
                  type="submit"
                  className="bb-cart-promo-remove"
                  disabled={busy}
                  aria-label={`Премахни кода ${d.code}`}
                >
                  Премахни
                </button>
              </fetcher.Form>
            </li>
          ))}
        </ul>
      )}

      <fetcher.Form method="post" action="/cart" className="bb-cart-promo-form">
        <input type="hidden" name="action" value="APPLY_DISCOUNT" />
        <label className="bb-cart-promo-label" htmlFor={inputId}>
          Имаш промокод?
        </label>
        <div className="bb-cart-promo-row">
          <input
            id={inputId}
            name="code"
            type="text"
            className="bb-cart-promo-input"
            placeholder="Въведи код"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            disabled={busy}
          />
          <button type="submit" className="bb-cart-promo-apply" disabled={busy}>
            {busy ? 'Проверявам…' : 'Приложи'}
          </button>
        </div>
      </fetcher.Form>

      {rejected.map((d) => (
        <p key={d.code} className="bb-cart-promo-error">
          Кодът <strong>{d.code}</strong> не важи за тази поръчка.
        </p>
      ))}
      {errors.map((e, i) => (
        <p key={i} className="bb-cart-promo-error">
          {e.message}
        </p>
      ))}
    </div>
  );
}
