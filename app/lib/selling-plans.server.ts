/**
 * Абонаментни планове на продукт („Абонаменти" в админа на CloudCart).
 *
 * Nitro няма готова функция за тях, затова заявката е собствена. Storefront
 * API-то ги дава като `Product.sellingPlanGroups(variantId:)`, а при добавяне
 * в количката избраният план се праща като `sellingPlanId` на реда - оттам
 * нататък поръчката и плащането са на CloudCart.
 *
 * Полето не е описано на cloudcart.dev; схемата е проверена с introspection
 * на живото API (2026-10-06).
 */

import type {NitroContext} from '~/lib/context';

export interface SellingPlan {
  id: string;
  name: string;
  label: string | null;
  deliveriesPerCycle: number | null;
  prepaid: boolean | null;
  prepaidNote: string | null;
  minCycles: number | null;
  maxCycles: number | null;
  priceAdjustment: {
    type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'PRICE';
    value: string;
    afterCycle: number | null;
  } | null;
  price: {amount: string; currencyCode: string} | null;
  compareAtPrice: {amount: string; currencyCode: string} | null;
}

const SELLING_PLANS_QUERY = `#graphql
  query ProductSellingPlans($handle: String!, $variantId: ID) {
    product(handle: $handle) {
      sellingPlanGroups(variantId: $variantId) {
        id
        name
        plans {
          id
          name
          label
          deliveriesPerCycle
          prepaid
          prepaidNote
          minCycles
          maxCycles
          priceAdjustment { type value afterCycle }
          price { amount currencyCode }
          compareAtPrice { amount currencyCode }
        }
      }
    }
  }
`;

/**
 * Плановете за всеки вариант, по id на варианта.
 *
 * Цената на плана зависи от варианта, затова се пита за всеки поотделно.
 * Грешка тук не бива да сваля продуктовата страница - тогава просто няма
 * абонамент.
 */
export async function getSellingPlansByVariant(
  ctx: NitroContext,
  handle: string,
  variantIds: string[],
): Promise<Record<string, SellingPlan[]>> {
  const entries = await Promise.all(
    variantIds.map(async (variantId) => {
      const data = await ctx.storefront
        .query<{product: {sellingPlanGroups: Array<{plans: SellingPlan[]}>} | null}>(
          SELLING_PLANS_QUERY,
          {variables: {handle, variantId}},
        )
        .catch(() => null);
      const plans = (data?.product?.sellingPlanGroups ?? []).flatMap((g) => g.plans ?? []);
      return [variantId, plans] as const;
    }),
  );
  return Object.fromEntries(entries.filter(([, plans]) => plans.length > 0));
}
