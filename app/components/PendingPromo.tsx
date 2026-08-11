import {useEffect} from 'react';
import {useFetcher, useFetchers} from 'react-router';
import {CART_ACTION} from '~/lib/cart-action';

/**
 * Пази спечелен промо код, докато количката получи първия си продукт.
 *
 * Проверено срещу живото API на 2026-08-09: `updateDiscountCodes` върху ПРАЗНА
 * количка минава без грешка, но кодът не се запазва - добавиш ли после продукт,
 * кодът вече го няма. Колелото на късмета пуска кода веднага след завъртане, а
 * в този момент количката е празна в почти всеки случай. Затова спечеленият код
 * тихо изчезваше.
 *
 * Тук кодът се записва в localStorage и се прилага при първото успешно
 * добавяне. Записът се трие чак когато количката наистина го покаже - ако
 * прилагането се провали, следващото добавяне пробва отново.
 */

const PENDING_KEY = 'bb-pending-promo';

export function rememberPromo(code: string) {
  try {
    localStorage.setItem(PENDING_KEY, code);
  } catch {
    /* частен режим - кодът просто няма да преживее презареждане */
  }
}

export function readPendingPromo(): string | null {
  try {
    return localStorage.getItem(PENDING_KEY);
  } catch {
    return null;
  }
}

function clearPendingPromo() {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    /* няма какво да се чисти */
  }
}

function cartHasCode(cart: any, code: string): boolean {
  return ((cart?.discountCodes ?? []) as Array<{code: string}>).some((d) => d.code === code);
}

export function PendingPromo() {
  const fetcher = useFetcher({key: 'bb-pending-promo'});
  const fetchers = useFetchers();

  // Всяко ЧУЖДО действие към /cart, което е приключило с непразна количка.
  // Ловим го през fetcher-ите, а не през loader-а, защото отговорът на
  // действието носи най-пресния вид на количката.
  const settled = fetchers.find(
    (f) =>
      f.key !== 'bb-pending-promo' &&
      f.formAction === CART_ACTION &&
      f.state === 'idle' &&
      ((f.data as any)?.cart?.totalQuantity ?? 0) > 0,
  );
  const settledCart = (settled?.data as any)?.cart;

  useEffect(() => {
    if (!settledCart) return;
    const code = readPendingPromo();
    if (!code) return;
    if (cartHasCode(settledCart, code)) {
      clearPendingPromo();
      return;
    }
    if (fetcher.state !== 'idle') return;
    fetcher.submit({action: 'APPLY_DISCOUNT', code}, {method: 'post', action: CART_ACTION});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settledCart]);

  // Трием записа само след като количката потвърди кода.
  useEffect(() => {
    if (fetcher.state !== 'idle' || !fetcher.data) return;
    const code = readPendingPromo();
    if (code && cartHasCode((fetcher.data as any)?.cart, code)) clearPendingPromo();
  }, [fetcher.state, fetcher.data]);

  return null;
}
