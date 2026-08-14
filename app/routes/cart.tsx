import {useLoaderData, useFetchers} from 'react-router';
import type {Route} from './+types/cart';
import {getContext} from '~/lib/context';
import {fetchCartSummary} from '~/lib/cart-totals.server';
import {dropUnearnedGifts} from '~/lib/cart-gifts.server';
import type {CartData} from '@cloudcart/nitro';
import {CartPage as CartPageView} from '~/components/CartPage';
import {CART_ACTION} from '~/lib/cart-action';

export const meta: Route.MetaFunction = () => [{title: 'Кошница | Bactology'}];

export async function loader({context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  // Подаръкът се маха и тук, не само след действие с количката. Клиент, който
  // е свалил количеството от чекмеджето и после е отворил /cart направо, иначе
  // виждаше подарък, който вече не му се полага - до следващата промяна.
  const cart = await dropUnearnedGifts(await ctx.cart.get(), ctx.cart);
  // Обобщението идва отделно: fragment-ът на nitro не иска `totals` и
  // `messages`, а точно там са правилата за количката и съобщенията, с които
  // търговецът говори на купувача. Виж `cart-totals.server.ts`.
  const cartSummary = await fetchCartSummary(
    ctx.env as Record<string, string | undefined>,
    (cart as any)?.id,
  );
  return {cart, cartSummary};
}

export default function CartPage() {
  const {cart, cartSummary} = useLoaderData<typeof loader>();

  const fetchers = useFetchers();
  const cartErrors = fetchers
    .filter((f) => f.formAction === CART_ACTION && f.data?.errors?.length)
    .flatMap((f) => f.data.errors as Array<{message: string}>);

  return (
    <>
      {cartErrors.length > 0 && <CartErrors errors={cartErrors} />}
      <CartPageView cart={cart} summary={cartSummary} />
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
