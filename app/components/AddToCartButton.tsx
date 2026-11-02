import {useFetcher} from 'react-router';
import {type ReactNode} from 'react';
import {CART_ACTION} from '~/lib/cart-action';
import {useOpenCartOnAdd} from '~/lib/use-open-cart-on-add';
import {useTrackAddToCart} from '~/lib/use-track-add-to-cart';

export function AddToCartButton({
  merchandiseId,
  quantity = 1,
  sellingPlanId,
  children = 'Добави в количката',
  className,
  disabled,
}: {
  merchandiseId: string;
  quantity?: number;
  /** Абонаментен план от CloudCart; без него покупката е еднократна. */
  sellingPlanId?: string;
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const fetcher = useFetcher();
  const isAdding = fetcher.state !== 'idle';

  /* Чекмеджето се отваря при всяко успешно добавяне, откъдето и да идва
     (клиент, 2026-08-13). Зеленото потвърждение и кръстосаната оферта тръгват
     от `use-track-add-to-cart`. Сметката за `add_to_cart` живее в собствен hook, защото същата
     трябва и на бутона в картите - виж `use-track-add-to-cart`. */
  useOpenCartOnAdd(fetcher);
  useTrackAddToCart(fetcher, merchandiseId, quantity);

  return (
    <fetcher.Form method="post" action={CART_ACTION}>
      <input type="hidden" name="action" value="ADD_TO_CART" />
      <input type="hidden" name="merchandiseId" value={merchandiseId} />
      <input type="hidden" name="quantity" value={quantity} />
      {sellingPlanId && <input type="hidden" name="sellingPlanId" value={sellingPlanId} />}
      <button
        type="submit"
        className={className}
        disabled={disabled || isAdding}
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
    </fetcher.Form>
  );
}
