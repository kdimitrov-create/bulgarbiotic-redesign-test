import {redirect, data as routeData} from 'react-router';
import type {Route} from './+types/cart-actions';
import {getContext} from '~/lib/context';
import {dropUnearnedGifts} from '~/lib/cart-gifts.server';
import {fetchCartSummary} from '~/lib/cart-totals.server';
import type {CartData} from '@cloudcart/nitro';
import {attributeCart} from '~/lib/cart-attribution.server';
import {DYSON_CAMPAIGN} from '~/lib/dyson-campaign';
import {applyPendingPromo} from '~/lib/pending-promo.server';

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

/**
 * Втората бройка от кампанията „1+1" - сложена сама, върху същия ред.
 *
 * Клиентът го поиска точно така (28.08): не отделен ред за 0,00 €, а „просто
 * допълнителна бройка" - количеството става 2, а цената остава колкото за
 * един. Второто го върши правилото за количката в панела („Поръчай 2, плати
 * 1"), затова тук се прави само първото.
 *
 * Живее в действието, а не в някой бутон, защото бутоните са пет: продуктовата
 * страница, картата в листинга, полето в количката, bump cart-ът и колелото.
 * Един от тях да остане непокрит, и клиентът плаща двойно.
 *
 * Допълва се до следващата ПЪЛНА двойка (1→2, 3→4), не „плюс две" - иначе
 * количката пак остава на нечетно и правилото пак не хваща.
 *
 * Не се пипа при `UPDATE_CART`: свали ли клиентът бройката сам, това е негово
 * решение и не му се връща обратно.
 */
async function pairCampaignLine(ctx: any, cart: CartData): Promise<CartData> {
  if (!DYSON_CAMPAIGN.active || DYSON_CAMPAIGN.mechanic !== 'cart-rule') return cart;
  const pair = DYSON_CAMPAIGN.pairSize;
  const line = ((cart as any)?.lines?.nodes ?? []).find(
    (l: any) => String(l?.merchandise?.product?.handle ?? '') === DYSON_CAMPAIGN.handle,
  );
  const qty = Number(line?.quantity ?? 0);
  if (!line?.id || qty <= 0 || qty % pair === 0) return cart;
  const target = qty + (pair - (qty % pair));
  const bumped = await ctx.cart
    .updateLines([{id: String(line.id), quantity: target}])
    .catch(() => null);
  // Не се спъва в неуспех: количката със сам брой е по-добра от никаква.
  return bumped?.cart ?? cart;
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
            const variants = (product as any)?.variants?.nodes ?? [];
            // Само когато вариантът е един. С няколко „първият" е гадаене и
            // клиентът получава мълчаливо друг размер или вкус от този, който е
            // натиснал - затова се спира и се праща на продуктовата страница.
            // `CardBuyButton` прави същата проверка от страната на браузъра.
            if (variants.length > 1) {
              cart = await ctx.cart.get();
              errors = [{message: 'Продуктът има повече от един вариант - избери го от страницата му'}];
              break;
            }
            merchandiseId = variants[0]?.id ?? '';
          }
        }
        if (!merchandiseId) {
          cart = await ctx.cart.get();
          errors = [{message: 'Продуктовият вариант не е намерен'}];
          break;
        }
        // Абонамент: избраният план отива на реда и CloudCart прави поръчката
        // повтаряща се. Без него редът е обикновена еднократна покупка.
        const sellingPlanId = String(fd.get('sellingPlanId') || '');
        const lines = [
          {
            merchandiseId,
            quantity: Number(fd.get('quantity') || 1),
            ...(sellingPlanId ? {sellingPlanId} : {}),
          },
        ];
        /* Продукт от прозореца на кръстосаната оферта носи нейния номер - по него
         * платформата прилага отстъпката и брои офертата, точно както при
         * класическата тема. Тя обаче отказва реда, когато условието на офертата
         * не е изпълнено, и то с вътрешна грешка вместо с обяснение (мерено
         * 07.10.2026: `Undefined array key "targets_products_43"`). Тогава
         * продуктът влиза без офертата: клиентът е натиснал „Добави" и трябва
         * да го получи. Опитът е ТУК, преди проверката за приключена количка
         * отдолу - иначе отказът би минал за приключена количка и би я подменил. */
        const crossSellId = String(fd.get('crossSellId') || '');
        let result = await ctx.cart
          .addLines(crossSellId ? lines.map((l) => ({...l, crossSellId})) : lines)
          .catch(() => null);
        if (crossSellId && !hasLine(result?.cart, merchandiseId)) {
          console.warn(`cross-sell: платформата не прие реда с оферта №${crossSellId}; добавя се без нея.`);
          result = await ctx.cart.addLines(lines).catch(() => null);
        }
        // Once an order is placed, the cart id in the session belongs to that
        // order and CloudCart will not take new lines into it. Nothing errors:
        // the add simply has no effect, so every button on the site looked dead
        // for a customer who had already bought once (client 2026-08-07). When
        // the line did not land, drop the finished cart and add to a fresh one.
        if (!hasLine(result?.cart, merchandiseId)) {
          /* Каква е количката ПРЕДИ опита - чете се ЧАК ТУК, в аварийната
           * ветка. Тази ветка се пали точно когато добавянето не е имало
           * ефект, тоест количката е същата като преди опита, а щастливият
           * път спестява една пълна API заявка на всяко „Купи" (беше
           * половината от времето на POST-а, мерено 19.08).
           *
           * Защо изобщо я пазим: долният повторен опит изхвърля количката от
           * сесията и започва нова. Ако продуктът не влезе и в новата, старата
           * трябва да се върне - иначе едно недобавяне изтрива всичко, което
           * клиентът е събрал. Точно това стана с колелото: наградата „Анти
           * стрес" сочеше несъществуващ вариант 228 и клиентът остана с празна
           * количка. */
          const before = await ctx.cart.get().catch(() => null);
          const beforeId = (before as any)?.id as string | undefined;
          const beforeLines = (((before as any)?.lines?.nodes ?? []) as any[])
            .map((l) => ({merchandiseId: l?.merchandise?.id as string, quantity: Number(l?.quantity) || 0}))
            .filter((l) => l.merchandiseId && l.quantity > 0);

          ctx.session.unset('cartId');
          const retry = await ctx.cart.addLines(lines).catch(() => null);

          if (hasLine(retry?.cart, merchandiseId)) {
            // Количката наистина е била приключена. Старите редове се пренасят
            // в новата - при поръчана количка те са малко или никакви, но ако
            // ги е имало, клиентът не бива да ги губи заради нашия обходен път.
            result = beforeLines.length
              ? (await ctx.cart.addLines(beforeLines).catch(() => retry)) ?? retry
              : retry;
          } else {
            // Продуктът не влиза и в чисто нова количка, значи проблемът е в
            // него, не в количката. Старата се връща в сесията непокътната.
            if (beforeId) ctx.session.set('cartId', beforeId);
            cart = (before as CartData) ?? (await ctx.cart.get());
            errors = (retry?.userErrors?.length ? retry.userErrors : result?.userErrors) ?? [];
            if (!errors.length) {
              errors = [{message: 'Продуктът не може да бъде добавен в момента'}];
            }
            break;
          }
        }
        cart = result?.cart ?? (await ctx.cart.get());
        // Грешка се съобщава само когато редът наистина не е влязъл.
        // Дотук резервното съобщение се слагаше винаги, щом `userErrors` липсва
        // в отговора - тоест успешно добавяне можеше да изпише „Продуктът не
        // можа да бъде добавен" върху количка, която вече го съдържа.
        errors = result?.userErrors ?? [];
        if (!errors.length && !hasLine(cart, merchandiseId)) {
          errors = [{message: 'Продуктът не можа да бъде добавен'}];
        }
        if (!errors.length) cart = await pairCampaignLine(ctx, cart);
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
        // Четат се ВСИЧКИ полета `code`, не само първото: `updateDiscountCodes`
        // заменя списъка, тоест с едно поле вторият код изместваше първия, а
        // празното поле триеше всички наведнъж. Формите пращат целия желан
        // списък, а тук само се предава нататък.
        const codes = fd
          .getAll('code')
          .map((c) => String(c).trim())
          .filter(Boolean);
        const result = await ctx.cart.updateDiscountCodes([...new Set(codes)]);
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
  // Промо кодът от QR линка, сканиран с празна количка - виж `pending-promo.server.ts`.
  cart = (await applyPendingPromo(ctx, cart)) as typeof cart;

  /* Откъде е дошъл купувачът се закача за количката веднъж, при появата ѝ.
   * Без него всяка поръчка излиза като директен трафик в „Продажби по източник
   * на трафик" - виж `app/lib/visit-source.ts`. Работата е фонова и мълчалива:
   * количката не бива да чака заради една справка. */
  const attributedCartId = (cart as any)?.id as string | undefined;
  if (attributedCartId && ctx.session.get('srcCart') !== attributedCartId) {
    ctx.session.set('srcCart', attributedCartId);
    attributeCart(ctx.env as Record<string, string | undefined>, request, attributedCartId);
  }

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
