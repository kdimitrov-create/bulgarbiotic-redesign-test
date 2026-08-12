import {useState} from 'react';
import {useNavigate} from 'react-router';
import {announceCartAdd} from '~/lib/cart-sync';
import {announceOffer, platformAdd} from '~/lib/platform-cart';

/**
 * „Купи" на продуктова карта - витрината на началната и решетките в категориите
 * ползват един и същ, за да изглеждат и се държат еднакво.
 *
 * Винаги е `<button>`, никога `<a>`, за да може да стои вътре в `<Link>`-а на
 * картата, без да се вложат две връзки.
 *
 * Слага в количката на магазина, същият път като на продуктовата страница
 * (`app/lib/platform-cart.ts`). Няма ли вариант - листинговата заявка ги маха -
 * води до продуктовата страница, където той се знае. Дотук такава карта
 * пращаше handle-а на нашия сървър, който намираше варианта; количката на
 * платформата приема само вариант, а изпращането на клиента към страницата на
 * продукта е по-честно от мълчалив избор на разновидност вместо него.
 */
export function CardBuyButton({
  merchandiseId,
  handle,
}: {
  merchandiseId?: string;
  handle: string;
}) {
  const [isAdding, setAdding] = useState(false);
  const navigate = useNavigate();

  async function add() {
    if (!merchandiseId) {
      navigate(`/product/${handle}`);
      return;
    }
    setAdding(true);
    const result = await platformAdd(merchandiseId, 1);
    setAdding(false);
    if (!result.ok) {
      announceCartAdd(result.message ?? 'Продуктът не можа да бъде добавен');
      return;
    }
    announceCartAdd();
    if (result.offer) announceOffer(result.offer);
  }

  return (
    <button
      type="button"
      className="bb-card-buy"
      disabled={isAdding}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void add();
      }}
    >
      {isAdding ? (
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
