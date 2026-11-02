import type {Route} from './+types/[datalayer.js]';
import {getContext} from '~/lib/context';

/**
 * `GET /datalayer.js` — пътят, който платформата сервира на всеки класически
 * магазин и който при нас беше 404.
 *
 * ## Какво връщаше досега
 *
 * Домейнът е насочен към витрината, значи този път удряше нашия worker и
 * попадаше на общия catch-all (`app/routes/$.tsx`). Резултатът, мерен на
 * 20.08.2026:
 *
 * ```
 * GET https://bulgarbiotic.bg/datalayer.js → 404 · text/html · 39 166 байта
 * ```
 *
 * Тоест заявка за `.js` получаваше цялата HTML страница.
 *
 * ## Какво връща платформата (разчетено живо от visvitalis.bg)
 *
 * ```js
 * var cc_customer_data = {"id":null,"group_id":2,"group_name":"Guests", … };
 * var cc_subscriber_data = [];
 * dataLayer.push(cc_customer_data);
 * dataLayer.push(cc_subscriber_data);
 * ```
 *
 * ⭐ Нашите СОБСТВЕНИ страници вече не разчитат на този файл — `<Analytics/>`
 * бута същия обект направо от React слоя, без излишна заявка. Пътят остава,
 * защото не сме единственият, който може да го поиска: платформеният контейнер
 * `GTM-KT8R2G` и всякакви чужди тагове знаят адреса и очакват валиден JS.
 *
 * ⛔ Никога не се кешира публично. Файлът носи име и поща на влезлия клиент —
 * един кеширан отговор би бил сервиран на следващия посетител.
 */
export async function loader({context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);

  let customer: Record<string, unknown> = {
    id: null,
    group_id: 2,
    group_name: 'Guests',
    first_name: null,
    last_name: null,
    full_name: null,
    email: null,
    type: 'guest',
    cpadm: 0,
    country: 'BG',
  };

  /* ⛔ `isLoggedIn()` НЕ връща обещание - `.catch` върху него хвърля и събаря
   * целия loader. Точно това свали продуктовите страници на 20.08 (73fb62f) и
   * точно това направи и този път 500 при първото пускане.
   * ⭐ `await` е безопасен и върху стойност, която не е обещание - затова
   * `softViewer()` в `root.tsx` го ползва по същия начин. */
  if (await ctx.customerAccount.isLoggedIn()) {
    const c = (await (ctx.customerAccount.getCustomer() as Promise<any>).catch(
      () => null,
    )) as any;
    if (c) {
      const full = [c.firstName, c.lastName].filter(Boolean).join(' ') || null;
      customer = {
        ...customer,
        id: c.id ?? null,
        group_id: null,
        group_name: null,
        first_name: c.firstName ?? null,
        last_name: c.lastName ?? null,
        full_name: full,
        email: c.email ?? null,
        type: 'customer',
      };
    }
  }

  // `JSON.stringify` е достатъчен: стойностите идват от API-то, а `</script>`
  // не може да се получи вътре в отговор с тип `application/javascript`.
  const body = [
    `var cc_customer_data = ${JSON.stringify(customer)};`,
    'var cc_subscriber_data = [];',
    'window.dataLayer = window.dataLayer || [];',
    'dataLayer.push(cc_customer_data);',
    'dataLayer.push(cc_subscriber_data);',
    '',
  ].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      // Лични данни - нито ръбът, нито споделен кеш го докосва.
      'Cache-Control': 'private, no-store',
    },
  });
}
