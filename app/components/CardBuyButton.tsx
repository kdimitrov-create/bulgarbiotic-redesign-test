import {useState} from 'react';
import {useNavigate, useFetcher} from 'react-router';
import {CART_ACTION} from '~/lib/cart-action';
import {useOpenCartOnAdd} from '~/lib/use-open-cart-on-add';

/**
 * „Купи" на продуктова карта - витрината на началната и решетките в категориите
 * ползват един и същ, за да изглеждат и се държат еднакво.
 *
 * Винаги е `<button>`, никога `<a>`, за да може да стои вътре в `<Link>`-а на
 * картата, без да се вложат две връзки.
 *
 * Слага в количката през Storefront API-то, същият път като на продуктовата
 * страница.
 *
 * Листинговата заявка не носи `variants`, затова в решетките `merchandiseId`
 * идва празен и бутонът дотук отваряше продуктовата страница вместо да добавя
 * (клиент 2026-08-12: „просто да добави продукта, без да отваря детайлната").
 * Сега вариантът се пита от `/api/variant` в момента на натискането - листингът
 * не плаща нищо, докато никой не е натиснал.
 *
 * Продуктовата страница не минава оттук и не е пипана.
 *
 * Едно нещо остава както си беше: продукт с повече от една разновидност пак
 * води до продуктовата страница. Количката на платформата приема само вариант,
 * а мълчаливият избор вместо клиента е по-лош от едно кликване повече.
 */
export function CardBuyButton({
  merchandiseId,
  handle,
}: {
  merchandiseId?: string;
  handle: string;
}) {
  const fetcher = useFetcher();
  const isAdding = fetcher.state !== 'idle';
  const [resolving, setResolving] = useState(false);
  const navigate = useNavigate();

  // Чекмеджето се отваря при всяко успешно добавяне, откъдето и да идва.
  useOpenCartOnAdd(fetcher);

  /**
   * Вариантът на продукта, ако картата не го е получила.
   *
   * Връща `null`, когато няма как да се добави без избор от клиента: продукт с
   * няколко разновидности, продукт без вариант, или отговор, който не дойде.
   * И в трите случая правилният ход е продуктовата страница.
   */
  async function resolveVariant(): Promise<string | null> {
    try {
      const res = await fetch(`/api/variant?handle=${encodeURIComponent(handle)}`);
      if (!res.ok) return null;
      const body = (await res.json()) as {variantId?: string | null; variantCount?: number};
      if (!body.variantId || (body.variantCount ?? 0) > 1) return null;
      return body.variantId;
    } catch {
      return null;
    }
  }

  async function add() {
    setResolving(true);
    const variant = merchandiseId ?? (await resolveVariant());
    setResolving(false);
    if (!variant) {
      navigate(`/product/${handle}`);
      return;
    }
    fetcher.submit(
      {action: 'ADD_TO_CART', merchandiseId: variant, quantity: '1'},
      {method: 'post', action: CART_ACTION},
    );
  }

  return (
    <button
      type="button"
      className="bb-card-buy"
      disabled={isAdding || resolving}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void add();
      }}
    >
      {isAdding || resolving ? (
        'Добавям…'
      ) : (
        <>
          Купи
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5.5 8h13l-1.2 10.5a1.6 1.6 0 01-1.6 1.5H8.3a1.6 1.6 0 01-1.6-1.5L5.5 8z" />
            <path d="M9 8a3 3 0 016 0" />
          </svg>
        </>
      )}
    </button>
  );
}
