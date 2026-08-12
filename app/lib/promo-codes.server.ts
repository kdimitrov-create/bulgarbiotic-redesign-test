import {adminGql, adminListAll, adminOrigin, adminPat} from './admin-api.server';

/**
 * Стойността на промо кодовете, прочетена от админ панела.
 *
 * Защо изобщо: Storefront API-то приема кода и го връща като приложен, но
 * `cart.cost` НЕ се променя - измерено 2026-08-09, 28,12 € и с кода, и без
 * него. Реалната сметка се прави чак на checkout-а. Затова количката показваше
 * по-висока сума от тази, която клиентът плаща.
 *
 * Два капана, платени по пътя:
 *
 *  1. `discountCodeProCodes` (списъкът) връща `conditions: []` за всеки код -
 *     същото кухо поведение като при `targets` и `quantityDiscounts`. Реалните
 *     условия идват само от `discountCodeProCode` (единствено число), затова
 *     идентификаторите се събират първо и после се дърпат с aliases в една
 *     заявка.
 *  2. Аргументите му са `discountId` + `codeId`, не `id`.
 *
 * SERVER ONLY: `.server.ts` пази PAT-а извън клиентския бъндъл.
 */

const CACHE_TTL_MS = 10 * 60 * 1000;

export type PromoCondition = {
  /** percent | flat | shipping */
  type: string;
  /** all | order_over | product | category | vendor | selection | category_vendor */
  setting: string;
  value: number;
  orderOver: number | null;
  productIds: string[];
  /**
   * Същите продукти, но по handle.
   *
   * Задължителни са, защото редът в количката НЕ носи продуктово id:
   * `CartLine.merchandise.product` има само `title`, `handle` и снимка
   * (проверено в типовете на `@cloudcart/nitro`). Съпоставянето по id
   * затова никога не хващаше и 100%-те кодове за подаръци не се прилагаха.
   */
  productHandles: string[];
};

export type PromoCode = {
  code: string;
  active: boolean;
  conditions: PromoCondition[];
};

export type PromoCodes = Record<string, PromoCode>;

/** Обхожда се докрай: сто активни отстъпки вече не стигат. */
const RULES_FIELDS = 'id type';

let cache: {at: number; data: PromoCodes} | null = null;

/** id → urlHandle за продуктите, към които сочат кодовете. Една заявка с aliases. */
async function resolveHandles(
  origin: string,
  pat: string,
  ids: string[],
): Promise<Record<string, string>> {
  if (!ids.length) return {};
  const fields = ids.map((id) => `p${id}: product(id: "${id}") { id urlHandle }`).join(' ');
  const data = await adminGql<Record<string, {id: string; urlHandle: string} | null>>(
    origin,
    pat,
    `query { ${fields} }`,
  );
  const out: Record<string, string> = {};
  for (const row of Object.values(data ?? {})) {
    if (row?.id && row.urlHandle) out[String(row.id)] = row.urlHandle;
  }
  return out;
}

/** Кодовете и техните условия. Никога не хвърля - при проблем връща празно. */
export async function fetchPromoCodes(
  env: Record<string, string | undefined>,
): Promise<PromoCodes> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;

  const pat = adminPat(env);
  const origin = adminOrigin(env);
  if (!pat || !origin) return {};

  try {
    const rules = await adminListAll<{id: string; type: string}>(origin, pat, {
      root: 'discounts',
      args: 'active: yes',
      nodeFields: RULES_FIELDS,
      label: 'promo-codes',
    });
    const codeProIds = rules
      .filter((n) => n.type === 'code-pro')
      .map((n) => String(n.id));
    if (!codeProIds.length) return {};

    const out: PromoCodes = {};
    for (const discountId of codeProIds) {
      const listed = await adminGql<{codes: {nodes: Array<{id: string; code: string}>}}>(
        origin,
        pat,
        `query { codes: discountCodeProCodes(discountId: "${discountId}", first: 100) { nodes { id code } } }`,
      );
      const nodes = listed?.codes?.nodes ?? [];
      if (!nodes.length) continue;

      // Стъпка 2 - истинските условия, всички в една заявка с aliases.
      const fields = nodes
        .map(
          (n) =>
            `c${n.id}: discountCodeProCode(discountId: "${discountId}", codeId: "${n.id}") { code active conditions { type setting value orderOver product { id } } }`,
        )
        .join(' ');
      const detailed = await adminGql<Record<string, any>>(origin, pat, `query { ${fields} }`);

      // Целите идват като id-та, а количката познава само handle-и. Резолвваме
      // ги веднъж тук, вместо да търсим при всяко пресмятане.
      const targetIds = new Set<string>();
      for (const row of Object.values(detailed ?? {})) {
        for (const c of row?.conditions ?? []) {
          for (const p of c.product ?? []) targetIds.add(String(p.id));
        }
      }
      const handleById = await resolveHandles(origin, pat, [...targetIds]);

      for (const row of Object.values(detailed ?? {})) {
        if (!row?.code) continue;
        out[String(row.code).toUpperCase()] = {
          code: row.code,
          active: row.active !== false,
          conditions: (row.conditions ?? []).map((c: any) => {
            const ids = (c.product ?? []).map((p: any) => String(p.id));
            return {
              type: String(c.type ?? ''),
              setting: String(c.setting ?? ''),
              value: Number(c.value ?? 0),
              orderOver: c.orderOver == null ? null : Number(c.orderOver),
              productIds: ids,
              productHandles: ids
                .map((id: string) => handleById[id])
                .filter(Boolean) as string[],
            };
          }),
        };
      }
    }

    cache = {at: Date.now(), data: out};
    return out;
  } catch (error) {
    console.error('promo codes: could not read the admin values —', (error as Error).message);
    return {};
  }
}
