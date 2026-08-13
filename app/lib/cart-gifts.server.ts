import {cartOffers} from './cart-offers';

/**
 * Пази подаръка от кръстосаната оферта в количката, докато прагът е достигнат,
 * и го маха чак когато сумата падне под него.
 *
 * КАК ПОДАРЪКЪТ ВЛИЗА. Нашата количка и количката на платформата са ЕДИН И СЪЩ
 * обект: `/checkout/adopt/<jwt>` вкарва нашата в нейната сесия по същия
 * идентификатор. Затова щом платформата сложи подаръка, той се появява и при
 * нас. Измерено на живо на bulgarbiotic.bg (2026-08-13), един и същ cart id
 * преди и след прехвърлянето:
 *
 *   преди:  Family pack 104,40
 *   след:   Family pack 104,40
 *           Подарък - хавлия Bactology  ред 0,00  alloc „Подарък хавлия" -40,00
 *
 * Тоест редът идва с нулева цена и няма нужда от нищо наше.
 *
 * 🛑 ЗАЩО ТОЗИ ФАЙЛ ПРАВЕШЕ ОБРАТНОТО. Дотук той триеше подаръчните редове при
 * ВСЯКО действие с количката. Причината беше вярна за времето си: докато ние
 * добавяхме подаръка сами, наш ред с този продукт пречеше на платформата да
 * сложи своя безплатен. Но сега редът е неин и триенето само го отнема - точно
 * оплакването на клиента: вдигаш количеството на кой да е продукт и подаръкът
 * изчезва.
 *
 * ПРАВИЛОТО СЕГА (клиент, 2026-08-13):
 *   • добавяне на продукт или вдигане на количество  → подаръкът ОСТАВА
 *   • сваляне на количество или премахване, при което сумата падне под прага
 *     → подаръкът СЕ МАХА
 *
 * Прагът е този от самата оферта в панела (`minTotal`), не число в кода.
 */

/**
 * Сумата, срещу която се мери прагът: редовете БЕЗ подаръците.
 *
 * Без това изваждане подарък от 40 лв. сам издърпва количката над прага и се
 * самоподдържа, дори клиентът да е свалил всичко останало. Тук е дори по-важно,
 * защото подаръкът идва с 0,00 - но офертата може да не е безплатна, а и цената
 * му може да се промени.
 */
function subtotalWithoutGifts(cart: any, giftVariants: Set<string>): number {
  const lines = cart?.lines?.nodes ?? [];
  return lines.reduce((sum: number, line: any) => {
    if (giftVariants.has(line?.merchandise?.id)) return sum;
    const amount = parseFloat(line?.cost?.totalAmount?.amount ?? '');
    if (Number.isFinite(amount)) return sum + amount;
    // Тънък ред без `cost`: пада на цената по бройка.
    const unit = parseFloat(line?.merchandise?.price?.amount ?? '0');
    const qty = Number(line?.quantity) || 0;
    return sum + (Number.isFinite(unit) ? unit * qty : 0);
  }, 0);
}

/**
 * Маха подаръка само когато вече не е заслужен. Тиха е по конструкция: сгреши
 * ли, количката остава каквато е, защото един подарък не бива да събори
 * действие с истински продукт.
 */
export async function dropUnearnedGifts(cart: any, cartApi: any): Promise<any> {
  const {gifts} = cartOffers();
  const withVariant = gifts.filter((gift) => gift.variantId);
  if (!withVariant.length || !cart) return cart;

  const giftVariants = new Set(withVariant.map((gift) => gift.variantId as string));
  const subtotal = subtotalWithoutGifts(cart, giftVariants);

  const unearned = (cart?.lines?.nodes ?? []).filter((line: any) => {
    const gift = withVariant.find((g) => g.variantId === line?.merchandise?.id);
    if (!gift) return false;
    // Оферта без праг (задействана от конкретен продукт, не от сума) не се
    // мери срещу нищо и не се маха оттук.
    if (!(gift.minTotal > 0)) return false;
    return subtotal < gift.minTotal;
  });
  if (!unearned.length) return cart;

  try {
    const result = await cartApi.removeLines(unearned.map((line: any) => line.id));
    return result?.cart ?? cart;
  } catch (error) {
    console.warn('cart gifts: подаръчният ред остана - %s', (error as Error).message);
    return cart;
  }
}
