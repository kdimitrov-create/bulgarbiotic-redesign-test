import {redirect} from 'react-router';
import type {Route} from './+types/cart_.$key';
import {getContext} from '~/lib/context';
import {addProductByHandle, cartAddHeaders} from '~/lib/cart-add.server';

/**
 * `/cart/<ключ>` - адресът, който платформата раздава, а ние трябва да поемем.
 *
 * Докато `/cart/*` беше резервиран в диспечера на Nova, тези адреси стигаха до
 * платформата и тя рисуваше своята количка. Резервацията падна на 13.08.2026
 * (заради грешка 500 и решението количката да се строи изцяло върху Storefront
 * API-то), тоест пътят е наш. Без този маршрут splat-ът го хваща и връща 404 с
 * нашето заглавие - измерено на насочен домейн на 14.08.2026.
 *
 * Платформата праща хора точно там в три случая:
 *   • `/checkout` без количка, готова за каса → 302 `/cart/<ключ>`
 *   • изтекъл `/checkout/adopt/<jwt>` → 302 `/cart/<ключ>`
 *   • писмата за изоставена количка
 *
 * Затова адресът се превежда на нашата количка. Временно (302), не постоянно:
 * ключът е на сесия и не бива да се кешира никъде.
 *
 * ⚠️ Съдържанието на платформената количка НЕ се възстановява - тя и нашата са
 * различни обекти и обратен мост в API-то няма. Целта е човекът да види
 * количката си и бутона към касата, вместо страница „не е намерено".
 *
 * Изключение: ключовете в `SHARED_CART_KEYS` са споделени колички, раздадени в
 * рекламни landing страници (25.08.2026, Femin/Gastro кампаниите). Знаем какво
 * е било в тях, затова продуктът се слага при нас. Новите линкове на тези
 * страници вече сочат към `/cart/add/<handle>`; таблицата пази старите линкове,
 * които още се въртят в реклами и писма.
 */
const SHARED_CART_KEYS: Record<string, string> = {
  KV5QRmQGofmoq9z5EhtKOk42EvKnu7W3R8Y1rozLDbdRmEGBuJvwg98qXwVswAkwsdepwbeKDrMJjYnvEm9zIvIZUX4fOLw3: 'bactology-probiotik-za-jeni-femin',
};

export async function loader({params, request, context}: Route.LoaderArgs) {
  /* `/cart/discount:<КОД>` - линкът за код, който панелът раздава (и QR кодът
   * на брошурите с VIP5, 20.10.2026). Минава през `/promo/<КОД>`: кодът се
   * прилага, без клиентът да бъде пратен в количката. */
  const discount = /^discount:(.+)$/i.exec(String(params.key || ''));
  if (discount) {
    const search = new URL(request.url).search;
    throw redirect(`/promo/${encodeURIComponent(discount[1].trim())}${search}`, 302);
  }
  const handle = SHARED_CART_KEYS[String(params.key || '')];
  if (!handle) throw redirect('/cart', 302);
  const ctx = await getContext(context, request);
  let to = '/cart';
  try {
    to = await addProductByHandle(ctx, handle, 1, request);
  } catch (e) {
    console.error('cart/<key>', e);
  }
  throw redirect(to, {status: 302, headers: await cartAddHeaders(ctx)});
}
