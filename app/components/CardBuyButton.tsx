import {useFetcher} from 'react-router';
import {useEffect} from 'react';
import {useAside} from './Aside';

/**
 * "Купи" button for product cards — the home carousel AND the category/listing
 * grids share this so they look and behave identically (client request).
 *
 * It's always a <button> (never an <a>) so it can sit inside the card's own
 * <Link> without nesting anchors. If the product has a variant id it adds to
 * cart via a fetcher (no <form>) and opens the cart drawer; if the listing
 * query stripped variants, it navigates to the PDP instead.
 */
export function CardBuyButton({
  merchandiseId,
  handle,
}: {
  merchandiseId?: string;
  handle: string;
}) {
  const fetcher = useFetcher();
  const {open} = useAside();
  const isAdding = fetcher.state !== 'idle';

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) open('cart');
  }, [fetcher.state, fetcher.data, open]);

  return (
    <button
      type="button"
      className="bb-card-buy"
      disabled={isAdding}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        // Always ADD to cart (client: the card image/title is for opening the
        // product; the button adds it). On listing/collection cards the variants
        // are stripped from the query, so we send the product `handle` instead —
        // the /cart action resolves its first variant server-side.
        fetcher.submit(
          merchandiseId
            ? {action: 'ADD_TO_CART', merchandiseId, quantity: '1'}
            : {action: 'ADD_TO_CART', handle, quantity: '1'},
          {method: 'post', action: '/cart'},
        );
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
