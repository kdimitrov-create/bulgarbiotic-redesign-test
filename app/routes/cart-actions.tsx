import {redirect, data as routeData} from 'react-router';
import type {Route} from './+types/cart-actions';
import {getContext} from '~/lib/context';
import {dropUnearnedGifts} from '~/lib/cart-gifts.server';
import {fetchCartSummary} from '~/lib/cart-totals.server';
import type {CartData} from '@cloudcart/nitro';

/**
 * Действията с количката: добавяне, количество, премахване, промо код.
 *
 * Живееха на `/cart`, заедно със страницата. Изнесени са тук, защото `/cart`
 * предстои да бъде резервиран за платформата - виж `app/lib/cart-action.ts`.
 *
 * Маршрутът няма `loader` и няма компонент: на него никой не влиза с браузър,
 * само форми пращат POST.
 */

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
         но пренасочва към /cart - което не става, когато кодът се прилага от
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
  // Подаръкът от кръстосаната оферта остава в количката, докато прагът е
  // достигнат. Слага го платформата (нашата количка и нейната са един и същ
  // обект), а тук само се маха, когато сумата падне под прага - виж
  // `cart-gifts.server.ts`.
  cart = await dropUnearnedGifts(cart, ctx.cart);

  if (ctx.session.isPending) {
    headers.set('Set-Cookie', await ctx.session.commit());
  }

  if (fd.get('redirectTo')) {
    return redirect(String(fd.get('redirectTo')), {status: 303, headers});
  }

  /**
   * „Купи" НЕ пренасочва. Клиентът остава на страницата (клиент, 2026-08-11).
   *
   * Дотук всяко добавяне връщаше 303 към `/checkout/adopt/<jwt>` - така
   * платформата научаваше за количката, но клиентът се озоваваше в касата след
   * всеки продукт. Прехвърлянето вече става тихо от браузъра, веднага след
   * добавянето: виж `app/lib/cart-sync.ts`.
   */
  /* Обобщението пътува заедно с количката.
     Правилата за количката се смятат от платформата при всяка промяна, а
     чекмеджето рисува веднага от отговора на действието. Вземе ли обобщението
     от loader-а, то изостава с една стъпка и сумата подскача. */
  const cartSummary = await fetchCartSummary(
    ctx.env as Record<string, string | undefined>,
    (cart as any)?.id,
  );

  return routeData({cart, cartSummary, errors}, {headers});
}
