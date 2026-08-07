import {useLoaderData, redirect, useFetchers, data as routeData} from 'react-router';
import type {Route} from './+types/cart';
import {getContext} from '~/lib/context';
import type {CartData} from '@cloudcart/nitro';
import {CartPage as CartPageView} from '~/components/CartPage';

export const meta: Route.MetaFunction = () => [{title: 'Кошница | Bactology'}];

export async function loader({context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const cart = await ctx.cart.get();
  return {cart};
}

/** Did the line we just asked for actually land in the cart we got back? */
function hasLine(cart: CartData | null | undefined, merchandiseId: string): boolean {
  const nodes = (cart as any)?.lines?.nodes ?? [];
  return nodes.some((line: any) => line?.merchandise?.id === merchandiseId);
}

export async function action({request, context}: Route.ActionArgs) {
  const ctx = await getContext(context, request);
  const fd = await request.formData();
  const act = String(fd.get('action'));
  let cart: CartData;
  let errors: Array<{message: string}> = [];

  try {
    switch (act) {
      case 'ADD_TO_CART': {
        let merchandiseId = String(fd.get('merchandiseId') || '');
        // Listing/collection cards ship no variant id (the collection query
        // strips variants) — resolve the product's first variant from its
        // handle server-side so the card "Купи" adds straight to the cart.
        if (!merchandiseId) {
          const handle = String(fd.get('handle') || '');
          if (handle) {
            const product = await ctx.storefront.getProduct(handle).catch(() => null);
            merchandiseId = (product as any)?.variants?.nodes?.[0]?.id ?? '';
          }
        }
        if (!merchandiseId) {
          cart = await ctx.cart.get();
          errors = [{message: 'Продуктовият вариант не е намерен'}];
          break;
        }
        const lines = [{merchandiseId, quantity: Number(fd.get('quantity') || 1)}];
        let result = await ctx.cart.addLines(lines).catch(() => null);
        // Once an order is placed, the cart id in the session belongs to that
        // order and CloudCart will not take new lines into it. Nothing errors:
        // the add simply has no effect, so every button on the site looked dead
        // for a customer who had already bought once (client 2026-08-07). When
        // the line did not land, drop the finished cart and add to a fresh one.
        if (!hasLine(result?.cart, merchandiseId)) {
          ctx.session.unset('cartId');
          result = await ctx.cart.addLines(lines).catch(() => null);
        }
        cart = result?.cart ?? (await ctx.cart.get());
        errors = result?.userErrors ?? [{message: 'Продуктът не можа да бъде добавен'}];
        break;
      }
      case 'UPDATE_CART': {
        const result = await ctx.cart.updateLines([{id: String(fd.get('lineId')), quantity: Number(fd.get('quantity'))}]);
        cart = result.cart;
        errors = result.userErrors;
        break;
      }
      case 'REMOVE_FROM_CART': {
        const result = await ctx.cart.removeLines([String(fd.get('lineId'))]);
        cart = result.cart;
        errors = result.userErrors;
        break;
      }
      /* Прилага промо код без навигация. Route-ът /discount/:code прави същото,
         но пренасочва към /cart — което не става, когато кодът се прилага от
         изскачащ прозорец (колелото на късмета). */
      case 'APPLY_DISCOUNT': {
        const code = String(fd.get('code') || '').trim();
        const result = await ctx.cart.updateDiscountCodes(code ? [code] : []);
        cart = result.cart;
        errors = result.userErrors;
        break;
      }
      default:
        cart = await ctx.cart.get();
    }
  } catch (error) {
    console.error('Cart action error:', error);
    cart = await ctx.cart.get();
    errors = [{message: error instanceof Error ? error.message : 'An error occurred'}];
  }

  const headers = new Headers();
  if (ctx.session.isPending) {
    headers.set('Set-Cookie', await ctx.session.commit());
  }

  if (fd.get('redirectTo')) {
    return redirect(String(fd.get('redirectTo')), {status: 303, headers});
  }

  return routeData({cart, errors}, {headers});
}

export default function CartPage() {
  const {cart} = useLoaderData<typeof loader>();

  const fetchers = useFetchers();
  const cartErrors = fetchers
    .filter((f) => f.formAction === '/cart' && f.data?.errors?.length)
    .flatMap((f) => f.data.errors as Array<{message: string}>);

  return (
    <>
      {cartErrors.length > 0 && <CartErrors errors={cartErrors} />}
      <CartPageView cart={cart} />
    </>
  );
}

function CartErrors({errors}: {errors: Array<{message: string}>}) {
  return (
    <div className="bb-cart-errors">
      {errors.map((error, i) => (
        <p key={i}>{error.message}</p>
      ))}
    </div>
  );
}
