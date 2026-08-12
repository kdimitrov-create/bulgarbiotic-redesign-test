import {data} from 'react-router';
import type {Route} from './+types/api.variant';
import {getContext} from '~/lib/context';

/**
 * Кой вариант да влезе в количката за даден продукт.
 *
 * Съществува заради едно ограничение на листинговите заявки: те не носят
 * `variants`, затова картата в решетката няма какво да сложи в количката и
 * дотук „Купи" просто отваряше продуктовата страница. Продуктът се пита оттук,
 * чак когато някой натисне бутона - така листингът не плаща нищо за карти,
 * които никой не е пипнал.
 *
 * `variantCount` не е излишен: продукт с повече от една разновидност НЕ бива да
 * влиза в количката с първата, защото изборът е на клиента. При такъв продукт
 * бутонът пак води до продуктовата страница.
 */
export async function loader({request, context}: Route.LoaderArgs) {
  const url = new URL(request.url);
  const handle = url.searchParams.get('handle')?.trim();
  if (!handle) return data({variantId: null, variantCount: 0}, {status: 400});

  const ctx = await getContext(context, request);
  const product = (await ctx.storefront.getProduct(handle).catch(() => null)) as any;
  const variants: Array<{id?: string; availableForSale?: boolean}> =
    product?.variants?.nodes ?? [];

  // Разпродаденият вариант пак се връща: платформената количка има последната
  // дума за наличността, а мълчаливо преминаване към следващия вариант би
  // сложило в количката нещо, което човекът не е избирал.
  const first = variants[0];

  return data(
    {variantId: first?.id ?? null, variantCount: variants.length},
    {headers: {'Cache-Control': 'public, max-age=300'}},
  );
}
