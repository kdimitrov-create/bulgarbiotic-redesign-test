import type {CartData} from '@cloudcart/nitro';
import type {NitroContext} from '~/lib/context';

/**
 * Промо код от QR линка (`/promo/<КОД>`), чакащ първия продукт в количката.
 *
 * `updateDiscountCodes` върху празна количка не запазва кода (виж
 * `PendingPromo`), а при сканиране на брошура количката почти винаги е празна.
 * Кодът се пази в сесията и се прилага на СЪРВЪРА при първото действие, след
 * което количката има продукти - независимо от кой бутон е дошло добавянето.
 * Пазенето в браузъра не стигаше: тестът на живо 19.10.2026 показа, че кодът
 * не се прилага.
 */
const SESSION_KEY = 'pendingPromo';

export function rememberPendingPromo(ctx: NitroContext, code: string) {
  ctx.session.set(SESSION_KEY, code);
}

export async function applyPendingPromo(ctx: NitroContext, cart: CartData | null): Promise<CartData | null> {
  const code = ctx.session.get(SESSION_KEY) as string | undefined;
  if (!code || !cart || ((cart as any).totalQuantity ?? 0) <= 0) return cart;
  const existing = (((cart as any).discountCodes ?? []) as Array<{code: string}>).map((d) => d.code).filter(Boolean);
  if (existing.some((c) => c.toLowerCase() === code.toLowerCase())) {
    ctx.session.unset(SESSION_KEY);
    return cart;
  }
  try {
    // Добавя се към вече приложените - `updateDiscountCodes` подменя списъка.
    const result = await ctx.cart.updateDiscountCodes([...new Set([...existing, code])]);
    // Кодът се забравя и при отказ: иначе всяко добавяне би го пробвало наново.
    ctx.session.unset(SESSION_KEY);
    return result.cart ?? cart;
  } catch (e) {
    console.error('pending-promo', e);
    return cart;
  }
}
