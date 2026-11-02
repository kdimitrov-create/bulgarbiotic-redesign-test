import {redirect} from 'react-router';
import type {Route} from './+types/cart_.add.$handle';
import {getContext} from '~/lib/context';
import {addProductByHandle, cartAddHeaders} from '~/lib/cart-add.server';

/**
 * `/cart/add/<handle>[?qty=N]` - слага продукта в количката и показва я.
 *
 * Заместител на платформените споделени колички (`/cart/<ключ>`), които
 * рекламните landing страници ползваха за „Поръчай …": ключът е на
 * платформата и не може да се прочете през API-то, а handle-ът е публичен и
 * стабилен. GET, защото се влиза от линк.
 */
export async function loader({params, request, context}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const qty = Number(new URL(request.url).searchParams.get('qty') || 1);
  let to = '/cart';
  try {
    to = await addProductByHandle(ctx, String(params.handle || ''), qty, request);
  } catch (e) {
    console.error('cart/add', e);
  }
  throw redirect(to, {status: 302, headers: await cartAddHeaders(ctx)});
}
