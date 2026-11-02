import type {NitroContext} from '~/lib/context';
import {attributeCart} from '~/lib/cart-attribution.server';
import {applyPendingPromo} from '~/lib/pending-promo.server';

/**
 * Слага продукт в количката по handle - за адреси, на които се влиза с GET
 * (рекламни landing страници, стари споделени колички на платформата).
 *
 * Идемпотентно: ако продуктът вече е в количката, не се дублира - човекът може
 * да натисне бутона на landing страницата два пъти или да се върне назад.
 * С повече от един вариант не се гадае (същото правило като `cart-actions`).
 *
 * Връща къде да се пренасочи: `/cart` при успех или неизвестен продукт,
 * продуктовата страница при няколко варианта.
 */
export async function addProductByHandle(
  ctx: NitroContext,
  handle: string,
  quantity = 1,
  request?: Request,
): Promise<string> {
  if (!handle) return '/cart';
  const product = await ctx.storefront.getProduct(handle).catch(() => null);
  const variants: Array<{id?: string}> = (product as any)?.variants?.nodes ?? [];
  if (variants.length > 1) return `/product/${handle}`;
  const merchandiseId = variants[0]?.id ?? '';
  if (!merchandiseId) return '/cart';
  const cart = await ctx.cart.get().catch(() => null);
  const already = ((cart as any)?.lines?.nodes ?? []).some((l: any) => l?.merchandise?.id === merchandiseId);
  if (!already) {
    await ctx.cart.addLines([{merchandiseId, quantity: Math.min(Math.max(Math.round(quantity) || 1, 1), 10)}]).catch((e) => {
      console.error('cart-add: addLines', e);
    });
  }
  // Промо кодът от QR линка, сканиран с празна количка.
  await applyPendingPromo(ctx, await ctx.cart.get().catch(() => null));
  /* Тези адреси са рекламни landing страници - точно те носят utm-ите, заради
   * които съществува „Продажби по източник на трафик". Виж `visit-source.ts`. */
  if (request) {
    const fresh = await ctx.cart.get().catch(() => null);
    const cartId = (fresh as any)?.id as string | undefined;
    if (cartId && ctx.session.get('srcCart') !== cartId) {
      ctx.session.set('srcCart', cartId);
      attributeCart(ctx.env as Record<string, string | undefined>, request, cartId);
    }
  }
  return '/cart';
}

/** Заглавки за отговора: бисквитката на сесията (нова количка) и без кеш. */
export async function cartAddHeaders(ctx: NitroContext): Promise<Headers> {
  const headers = new Headers({'Cache-Control': 'no-store'});
  if (ctx.session.isPending) headers.set('Set-Cookie', await ctx.session.commit());
  return headers;
}
