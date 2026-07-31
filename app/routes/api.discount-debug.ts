import type {Route} from './+types/api.discount-debug';
import {getContext} from '~/lib/context';
import {fetchAutoDiscounts} from '~/lib/live-discounts.server';
import {activeDiscounts, bestDiscountFor, bestDiscountForHandle} from '~/lib/active-discounts';

/**
 * TEMPORARY diagnostic — reports what the discount lookups actually resolve to on
 * the server. Remove once the live-discount wiring is confirmed. Exposes no
 * secrets: only whether the PAT is present, never its value.
 */
export async function loader({context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const env = ctx.env as Record<string, string | undefined>;
  const live = await fetchAutoDiscounts(env);
  const handle = new URL(request.url).searchParams.get('handle') ?? '';

  return Response.json({
    patConfigured: Boolean(env.CLOUDCART_ADMIN_PAT),
    apiOrigin: env.PUBLIC_API_ORIGIN ?? null,
    liveFetch: live && {
      discounts: live.discounts,
      handles: live.handles,
    },
    afterSet: {
      count: activeDiscounts().length,
      list: activeDiscounts(),
    },
    lookups: {
      byId119: bestDiscountFor('119'),
      byGid119: bestDiscountFor('gid://cloudcart/Product/119'),
      byHandle: handle ? bestDiscountForHandle(handle) : null,
    },
  });
}
