import type {Route} from './+types/api.search-suggest';
import {getContext} from '~/lib/context';
import {enhanceProducts} from '~/lib/product-images';

/**
 * Resource route for instant search suggestions (used by SearchOverlay).
 * Returns up to 6 products matching the query. Returns empty array for
 * empty/short queries (< 2 chars).
 */
export async function loader({request, context}: Route.LoaderArgs) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q')?.trim() ?? '';
  if (!q || q.length < 2) return {products: []};

  const ctx = await getContext(context, request);
  const products = await ctx.storefront
    .searchProducts(q, 6)
    .catch((err: Error) => {
      console.error('search-suggest error:', err.message);
      return [] as Awaited<ReturnType<typeof ctx.storefront.searchProducts>>;
    });

  return {products: enhanceProducts(products)};
}
