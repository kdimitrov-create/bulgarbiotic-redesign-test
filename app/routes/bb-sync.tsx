/**
 * Приемникът на панела: CloudCart праща тук webhook при промяна по
 * продукт/отстъпка/категория, а ние вдигаме epoch-а на общия кеш - следващото
 * четене тръгва към магазина за нови данни, вместо да чака 60-те секунди.
 * Така „изчерпан/наличен", име, описание и статус стигат витрината за секунди.
 *
 * Ключът `k` не е нов secret (Nova env-ът не може да получи нов без Ники):
 * той е SHA-256 на `<CLOUDCART_ADMIN_PAT>:bb-sync` - и worker-ът, и този,
 * който регистрира webhook-а, го извеждат от PAT-а, който и двамата имат.
 *
 * GET със същия ключ върши същата работа - ръчно „опресни магазина".
 * Дебаунсът (30 s, в shared-cache) прави злоупотребата безсмислена.
 */
import type {Route} from './+types/bb-sync';
import {bumpSyncEpoch} from '~/lib/shared-cache.server';
import {getContext} from '~/lib/context';

async function syncToken(secret: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${secret}:bb-sync`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function handle(context: unknown, request: Request): Promise<Response> {
  const ctx = await getContext(context as any, request);
  const env = ctx.env as Record<string, string | undefined>;
  const pat = env.CLOUDCART_ADMIN_PAT || env.CLOUDCARTADMINPAT;
  const given = new URL(request.url).searchParams.get('k') ?? '';

  if (!pat || !given || given !== (await syncToken(pat))) {
    return Response.json({ok: false}, {status: 403});
  }

  const result = await bumpSyncEpoch();
  return Response.json({ok: true, refreshed: result.bumped, epoch: result.epoch});
}

export async function loader({context, request}: Route.LoaderArgs) {
  return handle(context, request);
}

export async function action({context, request}: Route.ActionArgs) {
  return handle(context, request);
}
