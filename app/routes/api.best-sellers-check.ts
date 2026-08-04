/**
 * TEMPORARY diagnostic — compares the real units-sold ranking (Admin API) with
 * the order the Storefront API returns for `sortKey: BEST_SELLING`, so we can
 * tell whether the platform's "best selling" really means the merchant's sales.
 *
 * Delete this route once the question is settled — it exposes sales volumes.
 * Guarded by a key so it is not readable by accident.
 */
import {data} from 'react-router';
import type {Route} from './+types/api.best-sellers-check';
import {getContext} from '~/lib/context';
import {fetchBestSellers} from '~/lib/best-sellers.server';
import {markProductId} from '~/lib/product-marks';

export async function loader({context, request}: Route.LoaderArgs) {
  const url = new URL(request.url);
  if (url.searchParams.get('key') !== 'bb-sales-check') {
    throw data('Not found', {status: 404});
  }

  const ctx = await getContext(context, request);
  const env = ctx.env as Record<string, string | undefined>;

  const [sales, catalogue, bestSelling] = await Promise.all([
    fetchBestSellers(env),
    ctx.storefront.getProducts(100).catch(() => [] as any[]),
    ctx.storefront
      .getProductsPaginated({first: 30, sortKey: 'BEST_SELLING', reverse: false})
      .catch(() => null),
  ]);

  const nameById: Record<string, {handle: string; title: string}> = {};
  for (const p of catalogue as any[]) {
    const id = markProductId(p?.id);
    if (id) nameById[id] = {handle: p.handle, title: p.title};
  }

  return {
    patConfigured: Boolean(env.CLOUDCART_ADMIN_PAT || env.CLOUDCARTADMINPAT),
    basis: sales?.basis ?? null,
    productsWithSales: sales ? sales.order.length : 0,
    realSales: (sales?.order ?? []).slice(0, 30).map((id, i) => ({
      rank: i + 1,
      id,
      units: sales?.units[id] ?? 0,
      handle: nameById[id]?.handle ?? '(извън каталога)',
    })),
    storefrontBestSelling: ((bestSelling as any)?.nodes ?? []).map((p: any, i: number) => ({
      rank: i + 1,
      id: markProductId(p?.id),
      handle: p?.handle,
    })),
  };
}
