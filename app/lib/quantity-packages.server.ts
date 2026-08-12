import type {QuantityTier} from './quantity-packages';
import {adminGql, adminListAll, adminOrigin, adminPat} from './admin-api.server';

/**
 * Reads the merchant's quantity discounts from the CloudCart Admin API, so the
 * "месечни пакети" on the product page follow whatever they set in the panel.
 *
 * Two traps, both already paid for once:
 *
 *  1. The LIST query returns `quantityDiscounts: []` for every rule — exactly
 *     like `targets`. The real rows only come back from `discount(id:)`, so the
 *     ids are collected first and then pulled in one aliased request.
 *  2. `discountValue` is in hundredths and is the price of ONE item at that
 *     quantity — not an amount off, and not the package total.
 *
 * SERVER ONLY: the `.server.ts` suffix keeps the PAT out of the client bundle.
 */

const CACHE_TTL_MS = 30 * 1000;

/**
 * Rules only; the tiers are fetched one level down. Обхожда се докрай, не само
 * първата стотица - виж `admin-api.server.ts`.
 */
const LIST_FIELDS = 'id name type dateStart dateEnd';

function tiersQuery(ids: string[]): string {
  const fields = ids.map(
    (id) => `d${id}: discount(id: "${id}") { id quantityDiscounts { productId quantity discountType discountValue } }`,
  );
  return `query QuantityTiers { ${fields.join(' ')} }`;
}

interface RawRule {
  id: string;
  name: string;
  type: string;
  dateStart: string | null;
  dateEnd: string | null;
}

interface RawTier {
  productId: string;
  quantity: number;
  discountType: string;
  discountValue: number;
}

let cache: {at: number; data: Record<string, QuantityTier[]>} | null = null;

/** Product id → its quantity tiers. Null when unavailable. Never throws. */
export async function fetchQuantityPackages(
  env: Record<string, string | undefined>,
): Promise<Record<string, QuantityTier[]> | null> {
  const pat = adminPat(env);
  const origin = adminOrigin(env);
  if (!pat || !origin) return null;

  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;

  try {
    const rules = (
      await adminListAll<RawRule>(origin, pat, {
        root: 'discounts',
        args: 'active: yes',
        nodeFields: LIST_FIELDS,
        label: 'quantity-packages',
      })
    ).filter(isRunningQuantityRule);

    if (!rules.length) {
      cache = {at: Date.now(), data: {}};
      return cache.data;
    }

    const rows = await adminGql<Record<string, {quantityDiscounts?: RawTier[]} | null>>(
      origin, pat, tiersQuery(rules.map((r) => String(r.id))),
    );

    const out: Record<string, QuantityTier[]> = {};
    for (const rule of rules) {
      for (const tier of rows?.[`d${rule.id}`]?.quantityDiscounts ?? []) {
        // "fixed" is the only type seen in this shop: a flat per-item price.
        // A percent-based tier would need the product price to resolve, which
        // this module deliberately does not know — skip rather than guess.
        if (tier.discountType !== 'fixed') continue;
        const unitPrice = tier.discountValue / 100;
        if (!(unitPrice > 0) || !(tier.quantity > 1)) continue;
        const pid = String(tier.productId);
        (out[pid] ??= []).push({quantity: tier.quantity, unitPrice});
      }
    }
    for (const list of Object.values(out)) list.sort((a, b) => a.quantity - b.quantity);

    cache = {at: Date.now(), data: out};
    return out;
  } catch (error) {
    console.error('quantity-packages: could not load tiers —', (error as Error).message);
    return cache?.data ?? null;
  }
}

function isRunningQuantityRule(d: RawRule): boolean {
  if (d.type !== 'quantity') return false;
  const now = Date.now();
  if (d.dateStart && Date.parse(d.dateStart) > now) return false;
  if (d.dateEnd && Date.parse(d.dateEnd) < now) return false;
  return true;
}
