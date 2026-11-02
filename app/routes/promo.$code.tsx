import {redirect} from 'react-router';
import type {Route} from './+types/promo.$code';
import {getContext} from '~/lib/context';
import {cartAddHeaders} from '~/lib/cart-add.server';
import {rememberPendingPromo} from '~/lib/pending-promo.server';

/**
 * `/promo/<КОД>` - линкът зад QR кода на печатните брошури (19.10.2026).
 *
 * Разлика от `/discount/<КОД>`: клиентът НЕ се праща в количката, а остава на
 * сайта (началната страница или `?to=/product/...`) и вижда кратко
 * потвърждение. Кодът стига до количката по един от два начина:
 *
 *   • количката вече има продукти → прилага се тук, на сървъра;
 *   • количката е празна (обичайното при сканиране) → `updateDiscountCodes`
 *     върху празна количка не запазва кода (виж `PendingPromo`), затова кодът
 *     се пази в сесията и се прилага при първото добавяне на продукт - виж
 *     `pending-promo.server.ts`.
 */
export async function loader({params, context, request}: Route.LoaderArgs) {
  const code = String(params.code || '').trim();
  const url = new URL(request.url);
  const toParam = url.searchParams.get('to') || '/';
  // Само пътища в този сайт - никакви външни адреси.
  const to = toParam.startsWith('/') && !toParam.startsWith('//') ? toParam : '/';
  const target = new URL(to, url.origin);
  // utm-ите от QR кода продължават към целевата страница за анализите.
  url.searchParams.forEach((v, k) => {
    if (k.startsWith('utm_')) target.searchParams.set(k, v);
  });
  if (!code) throw redirect(target.pathname + target.search);

  const ctx = await getContext(context, request);
  let state = 'pending';
  try {
    const cart: any = await ctx.cart.get();
    if ((cart?.totalQuantity ?? 0) > 0) {
      // Добавя се към вече приложените кодове - `updateDiscountCodes` подменя списъка.
      const existing = ((cart?.discountCodes ?? []) as Array<{code: string}>).map((d) => d.code).filter(Boolean);
      const result: any = await ctx.cart.updateDiscountCodes([...new Set([...existing, code])]);
      const inCart = ((result?.cart?.discountCodes ?? []) as Array<{code: string}>).some(
        (d) => d.code?.toLowerCase() === code.toLowerCase(),
      );
      state = inCart && !result?.userErrors?.length ? 'applied' : 'rejected';
    } else {
      rememberPendingPromo(ctx, code);
    }
  } catch (e) {
    console.error('promo/<code>', e);
  }

  target.searchParams.set('promo', code);
  target.searchParams.set('promo_state', state);
  throw redirect(target.pathname + target.search, {status: 302, headers: await cartAddHeaders(ctx)});
}
