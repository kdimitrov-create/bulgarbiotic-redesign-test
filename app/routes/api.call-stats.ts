/**
 * Кой всъщност яде бюджета на Admin API-то.
 *
 * ЗАЩО. Обединяването на седемте настройки в една заявка (03.09.2026) НЕ мръдна
 * разхода: 81 заявки в минута преди, 85 след. Значи предположението кое е
 * скъпото беше грешно. Този адрес показва измереното вместо предполагаемото:
 * коя операция колко пъти е излязла НАГОРЕ, колко пъти е попаднала в кеша и
 * колко пъти изобщо е заобиколила кеша (мутации и лични данни).
 *
 * Числата са на ЕДИН изолат, затова се връща и възрастта му - интересува ни
 * съотношението и скоростта, не абсолютната сума за целия магазин. Отваря се
 * няколко пъти: различните отговори идват от различни изолати.
 *
 * Нищо чувствително не излиза: само имена на операции и броячи. Без тела на
 * заявки, без токени, без клиентски данни. Достъпът пак е зад същия ключ като
 * `/bb-sync` - изведен от PAT-а, не нов secret.
 */
import type {Route} from './+types/api.call-stats';
import {getCallStats} from '~/lib/shared-cache.server';
import {getContext} from '~/lib/context';

async function statsToken(secret: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${secret}:bb-sync`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function loader({context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context as any, request);
  const env = ctx.env as Record<string, string | undefined>;
  const pat = env.CLOUDCART_ADMIN_PAT || env.CLOUDCARTADMINPAT;
  const given = new URL(request.url).searchParams.get('k') ?? '';

  if (!pat || !given || given !== (await statsToken(pat))) {
    return Response.json({ok: false}, {status: 403});
  }

  return Response.json({ok: true, ...getCallStats()});
}
