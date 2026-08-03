import type {QuantityTier} from './quantity-packages';

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
const REQUEST_TIMEOUT_MS = 8000;

/** Rules only; the tiers are fetched one level down. */
const LIST_QUERY = `query QuantityRules($first: Int!) {
  discounts(first: $first, active: yes) {
    edges { node { id name type dateStart dateEnd } } }
}`;

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
  const pat = env.CLOUDCART_ADMIN_PAT || env.CLOUDCARTADMINPAT;
  const origin = adminOrigin(env);
  if (!pat || !origin) return null;

  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;

  try {
    const rules = (
      await gql<{discounts?: {edges?: Array<{node: RawRule}>}}>(origin, pat, LIST_QUERY, {first: 100})
    )?.discounts?.edges?.map((e) => e.node).filter(isRunningQuantityRule) ?? [];

    if (!rules.length) {
      cache = {at: Date.now(), data: {}};
      return cache.data;
    }

    const rows = await gql<Record<string, {quantityDiscounts?: RawTier[]} | null>>(
      origin, pat, tiersQuery(rules.map((r) => String(r.id))), {},
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

async function gql<T>(
  origin: string,
  pat: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${origin}/api/gql`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Authorization: `Bearer ${pat}`},
      body: JSON.stringify({query, variables}),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`admin api ${res.status}`);
    const json = (await res.json()) as {data?: T; errors?: Array<{message: string}>};
    if (json.errors?.length) throw new Error(json.errors[0].message);
    return json.data ?? null;
  } finally {
    clearTimeout(timer);
  }
}

/** Platform origin, never the public domain — otherwise the worker calls itself. */
function adminOrigin(env: Record<string, string | undefined>): string | null {
  const origin = env.PUBLIC_API_ORIGIN || env.PUBLIC_STORE_DOMAIN;
  if (!origin) return null;
  return origin.startsWith('http') ? origin.replace(/\/$/, '') : `https://${origin}`;
}
