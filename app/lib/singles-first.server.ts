/**
 * Client 2026-08-05: opening the "Пробиотични перли" card from the homepage
 * must show the pearls THEMSELVES first and the multi-product packages that
 * merely contain pearls after them. Half that category is packages, so the
 * shopper who clicked "перли" was landing on bundles.
 *
 * What counts as a package is NOT guessed from the title — the merchant
 * already maintains a "Пакети" collection (`packages`) in the admin panel, so
 * membership in it is the signal. Add a product there and the listing follows.
 *
 * Ordering INSIDE each group is left exactly as it came in, so the real-sales
 * ranking still decides who leads among the pearls and among the packages.
 */

const CACHE_TTL_MS = 5 * 60 * 1000;
const PACKAGES_COLLECTION = 'packages';

/** Category handles where standalone products come before packages. */
export const SINGLES_FIRST_CATEGORIES = new Set(['perli']);

let cache: {at: number; handles: Set<string>} | null = null;

/**
 * The handles of every product in the merchant's "Пакети" collection.
 * Never throws — an empty set simply leaves the listing order untouched.
 */
export async function fetchPackageHandles(storefront: any): Promise<Set<string>> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.handles;
  try {
    const res = await storefront.getCollectionProductsPaginated(PACKAGES_COLLECTION, {first: 100});
    const handles = new Set<string>(
      ((res?.products as any)?.nodes ?? [])
        .map((n: any) => n?.handle)
        .filter((h: unknown): h is string => typeof h === 'string' && h.length > 0),
    );
    // An empty answer is far more likely to be a hiccup than a merchant who
    // emptied the collection, so keep whatever was already known.
    if (!handles.size) return cache?.handles ?? new Set<string>();
    cache = {at: Date.now(), handles};
    return handles;
  } catch (error) {
    console.warn('singles-first: could not read the packages collection —', (error as Error).message);
    return cache?.handles ?? new Set<string>();
  }
}

/** Stable partition — non-packages first, relative order preserved in both groups. */
export function singlesFirst<T extends {handle?: string | null}>(
  nodes: T[],
  packages: Set<string>,
): T[] {
  if (!packages.size) return nodes;
  const singles: T[] = [];
  const bundles: T[] = [];
  for (const node of nodes) {
    (node?.handle && packages.has(node.handle) ? bundles : singles).push(node);
  }
  return [...singles, ...bundles];
}
