/**
 * Mirror of the live BumpCart application settings on bulgarbiotic.bg.
 *
 * Source: CloudCart Admin GraphQL — `bumpCartSettings` query
 * The Storefront API (only token we have in .env) does NOT expose app
 * settings, so the merchant config is read once via:
 *
 *   cloudcart app execute --store bulgarbiotic.bg --query \
 *     '{ bumpCartSettings { title goal filterGroup filterGroupValue
 *        sortBy percent showed showProducts totalCartAmount discountId } }'
 *
 * and mirrored here. To pick up changes the merchant makes in the
 * BumpCart admin UI, re-run the query above and update this object.
 *
 * Last synced: 2026-05-21
 */
export interface BumpCartConfig {
  /** Headline shown in the cart drawer above the upsell cards.
   *  Supports `{$remaining}` substitution (insert the lev/eur amount
   *  still needed to reach `totalCartAmount`). */
  title: string;
  /** What the bump aims at: 'total_cart' = cart subtotal threshold. */
  goal: 'total_cart' | string;
  /** How offer products are sourced. 'category' = pull from given
   *  CloudCart category IDs. */
  filterGroup: 'category' | 'vendor' | 'tag' | string;
  /** Source IDs (category/vendor/tag depending on `filterGroup`). */
  filterGroupValue: string[];
  /** Sort order for offer products. */
  sortBy: 'price-high' | 'price-low' | 'newest' | string;
  /** Discount percent the merchant offers when the customer adds an
   *  offer product to qualify for free shipping. */
  percent: number;
  /** Soft cap on how many offers to show in the cart drawer. */
  showed: number;
  /** Cart subtotal (in store base currency — EUR on bulgarbiotic.bg)
   *  the offer aims the customer at reaching. */
  totalCartAmount: number;
  showProducts: string | null;
  discountId: string | null;
}

/** Human-readable mapping from category IDs to their storefront URL
 *  handles + names. Resolved via Admin API `category(id:)` queries.
 *  Lets the API route fetch matching products via Storefront's
 *  `getCollectionProductsPaginated(handle, …)`. */
export const BUMP_CART_CATEGORY_HANDLES: Record<string, string> = {
  '1': 'all-products', // "Пробиотици"
  '8': 'packages',     // "Пакети"
};

export const BUMP_CART_CONFIG: BumpCartConfig = {
  title: 'Остават ви {$remaining} до безплатна доставка!',
  goal: 'total_cart',
  filterGroup: 'category',
  filterGroupValue: ['1', '8'],
  sortBy: 'price-high',
  percent: 20,
  showed: 10,
  totalCartAmount: 51,
  showProducts: null,
  discountId: null,
};
