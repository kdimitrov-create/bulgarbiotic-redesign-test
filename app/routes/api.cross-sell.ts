import {data} from 'react-router';
import type {Route} from './+types/api.cross-sell';
import {getContext} from '~/lib/context';
import {findPopupOffer} from '~/lib/cross-sell.server';
import {
  CANCEL_COOKIE,
  SANDBOX_COOKIE,
  VIEW_COOKIE,
  parseCookies,
  readCancelled,
  readViews,
} from '~/lib/cross-sell';

/**
 * Има ли кръстосана оферта за продукта, който току-що влезе в количката.
 *
 * Пита се от `CrossSellPopup` чак след успешно добавяне, а не при всяко
 * зареждане на страница - тоест витрината не плаща нищо, докато никой не
 * купува. Бисквитките (видяни, отказани, пясъчник) идват сами със заявката.
 */
export async function loader({request, context}: Route.LoaderArgs) {
  const url = new URL(request.url);
  const handle = url.searchParams.get('handle')?.trim();
  const headers = {'Cache-Control': 'private, no-store'};
  if (!handle) return data({offer: null}, {status: 400, headers});

  const ctx = await getContext(context, request);
  const cookies = parseCookies(request.headers.get('Cookie'));
  const offer = await findPopupOffer(ctx.env as Record<string, string | undefined>, {
    handle,
    cartHandles: (url.searchParams.get('cart') ?? '').split(',').filter(Boolean),
    subtotal: Number(url.searchParams.get('subtotal')) || 0,
    views: readViews(cookies[VIEW_COOKIE]),
    cancelled: readCancelled(cookies[CANCEL_COOKIE]),
    sandbox: cookies[SANDBOX_COOKIE] === '1',
  }).catch((error) => {
    // Прозорец, който не излезе, е по-малка беда от счупено добавяне.
    console.error('cross-sell: could not pick an offer —', (error as Error).message);
    return null;
  });

  return data({offer}, {headers});
}
