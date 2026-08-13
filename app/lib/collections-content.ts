/**
 * Hand-curated short intros for collection / category pages.
 *
 * WHY THIS EXISTS:
 *
 * CloudCart's `collection.description` is almost always a 2-10 KB SEO-stuffed
 * marketing blob meant for Google's snippet — long sentences with the brand
 * name in ALL CAPS, repeated keywords, weird HTML, etc. Dropping that
 * unmodified into a visible hero looks unprofessional and cuts off mid-word.
 *
 * The right separation:
 *   • `collection.seoDescription` (or .description as fallback) → `<meta>` tag only.
 *     Google reads it. Customers don't see it directly.
 *   • Hero `lead` → short, hand-written, brand-tone sentence (≤ 140 chars)
 *     designed for human eyes.
 *
 * For each known collection handle we provide a clean `intro` here. Unknown
 * collections fall back to no lead (just title + product count) — better
 * than a leaking SEO blob.
 */

export interface CollectionIntro {
  tag?: string;
  intro: string;
  /** Optional curated banner image — overrides the CloudCart collection image. */
  banner?: string;
}

export const COLLECTION_INTROS: Record<string, CollectionIntro> = {
  'all-products': {
    tag: 'Каталог',
    intro: 'Всички формули на Bactology - за червата, имунитета, женското здраве, децата и красотата.',
  },
  'probiotik-za-jeni': {
    tag: 'За женското здраве',
    intro: 'Интимно здраве, хормонален баланс и подкрепа на вагиналната микрофлора.',
    // Client-provided banner for the women's category.
    banner: 'https://cdncloudcart.com/26377/files/image/big_bannerbig_banner_2.jpg',
  },
  'probiotik-za-deca': {
    tag: 'За децата',
    intro: 'Babies & Kids - нежни формули, които децата обичат на вкус.',
  },
  'probiotik-za-otslabvane': {
    tag: 'За плосък корем',
    intro: 'Пробиотични решения, които подкрепят метаболизма и здравословното храносмилане.',
  },
  'perli': {
    tag: 'Innovation',
    intro: 'Пробиотични перли с натурален млечен или кето шоколад - иновативна форма за всеки ден.',
  },
  'pets': {
    tag: 'За домашни любимци',
    intro: 'Bactology Pets - пробиотик за кучета и котки. Здрав микробиом, козина и имунитет.',
  },
  'packages': {
    tag: 'Пакети с отстъпка',
    intro: 'Family Pack, Travel Pack и още комплекти - спести когато подкрепяш цялото семейство.',
  },
  'podaraci': {
    tag: 'Подаръци',
    intro: 'Готови подаръчни пакети - за рожден ден, празник или просто "защото".',
  },
};

/** Look up a collection's clean hand-written intro. Returns null when unknown. */
export function getCollectionIntro(handle: string): CollectionIntro | null {
  return COLLECTION_INTROS[handle] ?? null;
}
