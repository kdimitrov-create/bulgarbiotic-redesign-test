import {useEffect} from 'react';
import {CART_CHANGED_EVENT, platformApplyDiscount} from '~/lib/platform-cart';

/**
 * Пази спечелен промо код, докато количката получи първия си продукт.
 *
 * Проверено срещу живото API на 2026-08-09: прилагане на код върху ПРАЗНА
 * количка минава без грешка, но не се запазва - добавиш ли после продукт, кодът
 * вече го няма. Колелото на късмета пуска кода веднага след завъртане, а в този
 * момент количката е празна в почти всеки случай. Затова спечеленият код тихо
 * изчезваше.
 *
 * Тук кодът се записва в localStorage и се прилага при първото добавяне.
 * Записът се трие чак когато платформата потвърди, че го е приела - откаже ли,
 * следващото добавяне пробва отново.
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

export function PendingPromo() {
  /**
   * Дотук се гледаха fetcher-ите към нашия адрес за количката. „Купи" вече
   * говори направо с количката на магазина и такъв fetcher няма - сигналът е
   * общият `CART_CHANGED_EVENT`, който всеки бутон изпраща след добавяне.
   */
  useEffect(() => {
    let busy = false;
    async function apply() {
      if (busy) return;
      const code = readPendingPromo();
      if (!code) return;
      busy = true;
      const ok = await platformApplyDiscount(code);
      busy = false;
      if (ok) clearPendingPromo();
    }
    window.addEventListener(CART_CHANGED_EVENT, apply);
    return () => window.removeEventListener(CART_CHANGED_EVENT, apply);
  }, []);

  return null;
}
