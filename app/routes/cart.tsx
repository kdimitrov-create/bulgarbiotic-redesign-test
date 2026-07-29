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

export async function action({request, context}: Route.ActionArgs) {
  const ctx = await getContext(context, request);
  const fd = await request.formData();
  const act = String(fd.get('action'));
  let cart: CartData;
  let errors: Array<{message: string}> = [];

  try {
    switch (act) {
      case 'ADD_TO_CART': {
        const result = await ctx.cart.addLines([{merchandiseId: String(fd.get('merchandiseId')), quantity: Number(fd.get('quantity') || 1)}]);
        cart = result.cart;
        errors = result.userErrors;
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
