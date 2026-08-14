import {useFetcher} from 'react-router';
import {useEffect, useRef, type ReactNode} from 'react';
import {pushEcommerce, idForHandle} from '~/lib/analytics';
import {CART_ACTION} from '~/lib/cart-action';
import {useAside} from './Aside';

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
  const isAdding = fetcher.state !== 'idle';
  const {open} = useAside();

  // Отговорът се обработва ВЕДНЪЖ.
  //
  // Ефектът зависеше и от `quantity`, а `fetcher.data` остава след успешно
  // добавяне - значи всяко пипване на брояча на продуктовата страница го
  // пускаше наново: чекмеджето се отваряше без нищо да е добавено и GA
  // получаваше второ `add_to_cart` за същия ред.
  const handledRef = useRef<unknown>(null);

  useEffect(() => {
    if (fetcher.state !== 'idle' || !fetcher.data) return;
    if (handledRef.current === fetcher.data) return;
    handledRef.current = fetcher.data;

    // Неуспешното добавяне не отваря нищо и не праща събитие - дотук
    // чекмеджето изскачаше и когато продуктът изобщо не е влязъл.
    const failed = ((fetcher.data as any)?.errors ?? []).length > 0;
    if (!failed) {
      // Чекмеджето се отваря при всяко добавяне, откъдето и да идва (клиент,
      // 2026-08-13). Отваря се тук, а не в бутона, защото тук се знае, че
      // добавянето наистина е минало.
      open('cart');
      // Прехвърлянето и потвърждението са централни, виж CartSync.

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
  }, [fetcher.state, fetcher.data, merchandiseId, quantity, open]);

  return (
    <fetcher.Form method="post" action={CART_ACTION}>
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
