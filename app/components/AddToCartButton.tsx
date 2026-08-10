import {useFetcher} from 'react-router';
import {useEffect, type ReactNode} from 'react';
import {useAside} from './Aside';
import {pushEcommerce, idForHandle} from '~/lib/analytics';

export function AddToCartButton({
  merchandiseId,
  quantity = 1,
  children = 'Добави в количката',
  className,
  disabled,
}: {
  merchandiseId: string;
  quantity?: number;
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const fetcher = useFetcher();
  const {open} = useAside();
  const isAdding = fetcher.state !== 'idle';

  // Open cart drawer after successful add
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      open('cart');

      // `add_to_cart` е второто по важност събитие след purchase: от него се
      // хранят и Google Ads, и Meta аудиториите "заряза количката".
      // Данните се четат от върнатата количка, за да не се налага всяко място,
      // което ползва този бутон, да ги подава отделно.
      const line = ((fetcher.data as any)?.cart?.lines?.nodes ?? []).find(
        (l: any) => l?.merchandise?.id === merchandiseId,
      );
      if (line) {
        const price = parseFloat(
          line.cost?.amountPerQuantity?.amount ?? line.merchandise?.price?.amount ?? '0',
        );
        pushEcommerce('add_to_cart', {
          currency:
            line.cost?.amountPerQuantity?.currencyCode ??
            line.merchandise?.price?.currencyCode ??
            'EUR',
          value: price * quantity,
          items: [
            {
              item_id: idForHandle(line.merchandise?.product?.handle),
              item_name: line.merchandise?.product?.title ?? '',
              price,
              quantity,
            },
          ],
        });
      }
    }
  }, [fetcher.state, fetcher.data, open, merchandiseId, quantity]);

  return (
    <fetcher.Form method="post" action="/cart">
      <input type="hidden" name="action" value="ADD_TO_CART" />
      <input type="hidden" name="merchandiseId" value={merchandiseId} />
      <input type="hidden" name="quantity" value={quantity} />
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
