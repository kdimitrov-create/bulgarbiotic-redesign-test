import {useEffect, useRef, useState} from 'react';
import {CART_TOAST_EVENT} from '~/lib/cart-sync';

/**
 * Зелената лента „Продуктът е добавен в количката".
 *
 * Повтаря потвърждението на класическата тема (клиент, снимка 2026-08-11).
 * Не може да се ползва оригиналното: то се рисува от JavaScript-а на темата,
 * който на Nitrogen страница просто не съществува.
 *
 * Стои в layout-а и слуша събитие, вместо да бъде вътре в бутона - така всяко
 * място, което добавя в количката, го вика еднакво: продуктовата страница,
 * картите в листинга, допълненията в чекмеджето.
 */
export function CartToast() {
  const [text, setText] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    function onAdd(e: Event) {
      const msg = (e as CustomEvent).detail as string;
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
      setText(msg);
      // Показваме на следващия кадър, за да има от какво да се появи.
      timers.current.push(window.setTimeout(() => setShown(true), 20));
      timers.current.push(window.setTimeout(() => setShown(false), 3200));
      timers.current.push(window.setTimeout(() => setText(null), 3600));
    }
    window.addEventListener(CART_TOAST_EVENT, onAdd);
    return () => {
      window.removeEventListener(CART_TOAST_EVENT, onAdd);
      timers.current.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  if (!text) return null;

  return (
    <div className={`bb-cart-toast${shown ? ' shown' : ''}`} role="status" aria-live="polite">
      <span className="bb-cart-toast-text">{text}</span>
      <span className="bb-cart-toast-tick" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
    </div>
  );
}
