/**
 * Банери в категориите - между „Зареди още продукти" и описанието на
 * категорията (клиент, 12.10.2026).
 *
 * Един ред тук = един банер. Махне ли се редът (или `active: false`), банерът
 * изчезва без друга промяна. Файловете са в `public/images/banners/`, всеки
 * във WebP и JPG; под 640px се показва портретният мобилен файл.
 */

export interface CategoryBanner {
  /** Адресът на категорията: `/category/<handle>`. */
  handle: string;
  active: boolean;
  /** Път без разширение - до него стоят `.webp` и `.jpg`. */
  desktop: string;
  desktopWidth: number;
  desktopHeight: number;
  mobile: string;
  mobileWidth: number;
  mobileHeight: number;
  alt: string;
}

export const CATEGORY_BANNERS: CategoryBanner[] = [
  {
    // „Купи повече, спести повече" - 2 продукта -10%, 3 -15%, 4+ -20%.
    handle: 'all-products',
    active: true,
    desktop: '/images/banners/buy-more-save-more-category',
    desktopWidth: 1640,
    desktopHeight: 624,
    mobile: '/images/banners/buy-more-save-more-category-mobile',
    mobileWidth: 1122,
    mobileHeight: 1402,
    alt: 'Купи повече, спести повече: 2 продукта -10%, 3 продукта -15%, 4+ продукта -20%. Промоцията важи само за единични продукти.',
  },
];

export function categoryBannersFor(handle: string | null | undefined): CategoryBanner[] {
  if (!handle) return [];
  return CATEGORY_BANNERS.filter((b) => b.active && b.handle === handle);
}
