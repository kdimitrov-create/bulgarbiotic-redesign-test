import {useState, type ReactNode} from 'react';
import {pushEcommerce, idForHandle} from '~/lib/analytics';
import {announceCartAdd} from '~/lib/cart-sync';
import {announceOffer, platformAdd} from '~/lib/platform-cart';

/**
 * „Купи" - слага продукта в количката НА МАГАЗИНА, не в наша отделна.
 *
 * Дотук добавянето минаваше през Storefront API-то, а платформата научаваше за
 * количката наведнъж, при прехвърлянето към касата. Тя виждаше готова количка,
 * не виждаше добавяне - затова кръстосаните оферти, правилата за количката и
 * подаръците не се задействаха: те висят на събитието „добави в количката",
 * което така и не се случваше. Виж `app/lib/platform-cart.ts`.
 *
 * Сега заявката отива на `/cart/add` - резервиран път, тоест платформата, но от
 * нашия домейн. Тя решава всичко останало и връща офертата, ако е сметнала, че
 * има такава.
 */
export function AddToCartButton({
  merchandiseId,
  quantity = 1,
  children = 'Добави в количката',
  className,
  disabled,
  productTitle,
  productHandle,
  priceEur,
}: {
  merchandiseId: string;
  quantity?: number;
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
  /** За измерването. Количката на платформата не връща тези полета. */
  productTitle?: string;
  productHandle?: string;
  priceEur?: number;
}) {
  const [isAdding, setAdding] = useState(false);

  async function add() {
    setAdding(true);
    const result = await platformAdd(merchandiseId, quantity);
    setAdding(false);

    if (!result.ok) {
      announceCartAdd(result.message ?? 'Продуктът не можа да бъде добавен');
      return;
    }

    announceCartAdd();

    // `add_to_cart` е второто по важност събитие след purchase: от него се
    // хранят и Google Ads, и Meta аудиториите „заряза количката". Данните идват
    // от извикващия, защото отговорът на платформата не носи каталожните полета
    // в нашия вид.
    if (productHandle) {
      pushEcommerce('add_to_cart', {
        currency: 'EUR',
        value: (priceEur ?? 0) * quantity,
        items: [
          {
            item_id: idForHandle(productHandle),
            item_name: productTitle ?? '',
            price: priceEur ?? 0,
            quantity,
          },
        ],
      });
    }

    // Платформата предлага оферта само когато условията ѝ са изпълнени.
    if (result.offer) announceOffer(result.offer);
  }

  return (
    <button
      type="button"
      className={className}
      disabled={disabled || isAdding}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void add();
      }}
    >
      {isAdding ? (
        <span className="inline-flex items-center gap-2">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="size-4 animate-spin"
            aria-hidden="true"
          >
            <path d="M12 3a9 9 0 11-6.3 2.6" />
          </svg>
          Добавям…
        </span>
      ) : (
        children
      )}
    </button>
  );
}
