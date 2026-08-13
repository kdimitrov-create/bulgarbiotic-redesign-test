/**
 * Per-product "Защо хората избират Bactology" comparison content.
 *
 * Client request (5a): the comparison section must be UNIQUE per product, not
 * the same block everywhere. We keep the core Bactology differentiators (always
 * true for every product) but personalise the subtitle to the specific product,
 * and let flagship products override with product-specific, factual rows.
 *
 * To enrich a product: add an entry to BY_HANDLE with a `subtitle` and/or `rows`.
 */
type Row = {
  feature: string;
  others: boolean | string;
  bactology: boolean | string;
};

// Core differentiators — factual for the whole Bactology range.
const CORE_ROWS: Row[] = [
  {feature: 'Брой активни бактерии (CFU)', others: '1-10 млрд', bactology: '50 милиарда'},
  {feature: 'Брой клинично доказани щамове', others: '1-2', bactology: '5 на формула'},
  {feature: 'Lactobacillus bulgaricus (БГ щам)', others: false, bactology: true},
  {feature: 'DR-Caps™ растителни капсули', others: false, bactology: true},
  {feature: 'Издържа на стомашна киселина', others: 'Понякога', bactology: true},
  {feature: 'Произведено в България', others: false, bactology: true},
  {feature: 'Лабораторно потвърден CFU брой', others: false, bactology: true},
  {feature: 'HACCP / GMP / ISO сертификати', others: 'Различни', bactology: true},
];

// Product-specific overrides. Only factual, product-true rows are added on top.
const BY_HANDLE: Record<string, {subtitle?: string; rows?: Row[]}> = {
  'bactology-anti-stress': {
    subtitle: 'Виж защо Anti Stress се справя със стреса и умората по-добре от стандартните пробиотици.',
    rows: [
      {feature: 'Екстракт от жълт кантарион (St. John’s Wort)', others: false, bactology: true},
      {feature: 'Подкрепа при стрес и умора', others: false, bactology: true},
      ...CORE_ROWS,
    ],
  },
  'bactology-probiotik-za-jeni-femin': {
    subtitle: 'Виж защо Femin подкрепя женското здраве по-добре от обикновените пробиотици.',
    rows: [
      {feature: 'Щамове за вагинална микрофлора', others: false, bactology: true},
      {feature: 'Подкрепа на pH баланса', others: false, bactology: true},
      ...CORE_ROWS,
    ],
  },
  'probiotik-za-bebe-deca-i-podrastvashti-babies-and-kids': {
    subtitle: 'Виж защо детската формула е по-подходяща за деца от стандартните пробиотици.',
    rows: [
      {feature: 'Подходящо за деца (от 6 месеца)', others: 'Рядко', bactology: true},
      {feature: 'Приятен вкус, който децата обичат', others: false, bactology: true},
      ...CORE_ROWS,
    ],
  },
};

export function getProductComparison(handle: string, productTitle: string): {
  title: string;
  subtitle: string;
  rows: Row[];
} {
  const override = BY_HANDLE[handle] ?? {};
  const shortName = productTitle.split(' - ')[0].split(' — ')[0].trim();
  return {
    title: 'Защо хората избират Bactology',
    subtitle:
      override.subtitle ??
      `Виж какво прави ${shortName} различен от стандартните пробиотици на пазара.`,
    rows: override.rows ?? CORE_ROWS,
  };
}
