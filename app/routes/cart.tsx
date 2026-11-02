import {useLoaderData, useFetchers} from 'react-router';
import type {Route} from './+types/cart';
import {getContext} from '~/lib/context';
import {fetchCartSummary} from '~/lib/cart-totals.server';
import type {CartData} from '@cloudcart/nitro';
import {CartPage as CartPageView} from '~/components/CartPage';
import {CART_ACTION} from '~/lib/cart-action';
import {cartErrorText} from '~/lib/cart-errors';
import {dropUnearnedGifts} from '~/lib/cart-gifts.server';

export const meta: Route.MetaFunction = () => [{title: 'Кошница | Bactology'}];

export async function loader({context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  // Незаслуженият подарък пада и при директно влизане в /cart, не само в
  // чекмеджето - иначе остава в количката, щом сумата слезе под прага.
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

  /**
   * Количката идва от последното действие, не от loader-а.
   *
   * ⚠️ Хванато от клиента: плюсът и минусът тук не сменяха бройката, тя се
   * появяваше чак след презареждане. Редът се рисува оптимистично, но САМО
   * докато заявката лети (`fetcher.formData`); свърши ли тя, пада обратно на
   * `line.quantity` от loader-а - а той на Nova изпреварва бисквитката и
   * връща количката отпреди промяната. Числото подскачаше назад.
   *
   * Отговорът на действието носи новата количка и новото обобщение, точно
   * както прави и чекмеджето през root loader-а. Тук е същото, иначе двете
   * повърхности показват различни бройки за една и съща количка.
   */
  const answered = fetchers.filter(
    (f) => f.formAction === CART_ACTION && (f.data as any)?.cart,
  );
  const latest = answered[answered.length - 1];
  const shownCart = ((latest?.data as any)?.cart as typeof cart) ?? cart;
  const shownSummary = latest ? ((latest.data as any).cartSummary ?? null) : cartSummary;

  return (
    <>
      {cartErrors.length > 0 && <CartErrors errors={cartErrors} />}
      <CartPageView cart={shownCart} summary={shownSummary} />
    </>
  );
}

function CartErrors({errors}: {errors: Array<{message: string}>}) {
  return (
    <div className="bb-cart-errors">
      {errors.map((error, i) => (
        <p key={i}>{cartErrorText(error.message)}</p>
      ))}
    </div>
  );
}
