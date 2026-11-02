import type {NitroContext} from '~/lib/context';

/**
 * Целева страница, сглобена от метаобекти в админа.
 *
 * Записът от тип „Страница“ (`landing_page`) има адреса на страницата за свой
 * handle - `longevity-bactology` е /page/longevity-bactology. Той изрежда
 * секциите си, а секциите - своите елементи (числа, стъпки, пакети). Текстът,
 * снимките и видеото са в записите; видът е в `components/landing/`.
 * Моделът: docs/PAGE-SECTIONS-MODEL.md.
 *
 * Няма ли запис, или е Чернова (тогава Storefront API отговаря с null),
 * страницата се показва както преди - от конструктора. Грешка в API-то води
 * до същото, за да не падне страницата.
 *
 * Заявките са две, заради тавана от 1000 точки сложност. Първата носи
 * страницата, секциите със снимките и продуктите им и текстовете на
 * елементите. Втората пита за снимката и продукта на пакетите в „Оферти“ и се
 * пуска само когато страницата има такива. С препратките на елементите в
 * първата заявка тя излиза 3945 точки (измерено на 27.10.2026).
 */

const LANDING_REF_FRAGMENT = `#graphql
  fragment LandingRef on MetafieldReference {
    ... on MediaImage { image { url altText width height } }
    ... on Video { sources { url mimeType } }
    ... on Product {
      handle
      title
      defaultVariantId
      priceRange { minVariantPrice { formatted } }
    }
  }
`;

// До 20 секции с до 12 елемента: около 900 точки сложност.
const LANDING_PAGE_QUERY = `#graphql
  query LandingPage($handle: String!) {
    metaobject(handle: {type: "landing_page", handle: $handle}) {
      type
      handle
      fields { key value }
      sections: field(key: "sections") {
        references(first: 20) {
          nodes {
            ... on Metaobject {
              type
              handle
              fields {
                key
                value
                reference { ...LandingRef }
                references(first: 12) {
                  nodes {
                    ... on Metaobject { type handle fields { key value } }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  ${LANDING_REF_FRAGMENT}
`;

/** Втората заявка: по един псевдоним за всеки пакет от „Оферти“. */
function landingBlocksQuery(count: number): string {
  const vars = Array.from({length: count}, (_, i) => `$h${i}: String!`).join(', ');
  const aliases = Array.from(
    {length: count},
    (_, i) =>
      `b${i}: metaobject(handle: {type: "product_block", handle: $h${i}}) { ...LandingBlock }`,
  ).join('\n');
  return `#graphql
    query LandingBlocks(${vars}) {
      ${aliases}
    }
    fragment LandingBlock on Metaobject {
      type
      handle
      fields { key value reference { ...LandingRef } }
    }
    ${LANDING_REF_FRAGMENT}
  `;
}

/** Колко пакета най-много се допитват във втората заявка. */
const MAX_OFFER_BLOCKS = 12;

export type LandingImage = {url: string; alt: string | null; width: number | null; height: number | null};
export type LandingProduct = {handle: string; title: string; variantId: string | null; price: string | null};

/** Един запис, с прочетените стойности на полетата му. */
export type LandingEntry = {
  type: string;
  handle: string;
  /** Стойността на всяко попълнено поле, както я пази админът (низ). */
  values: Record<string, string>;
  images: Record<string, LandingImage>;
  videos: Record<string, string>;
  products: Record<string, LandingProduct>;
  /** Елементите на поле-списък (числа, стъпки, пакети), по реда в админа. */
  lists: Record<string, LandingEntry[]>;
};

export type LandingPageData = {
  handle: string;
  values: Record<string, string>;
  sections: LandingEntry[];
};

type RawRef = {
  image?: {url: string; altText: string | null; width: number | null; height: number | null};
  sources?: Array<{url: string; mimeType: string}>;
  handle?: string;
  title?: string;
  defaultVariantId?: string | null;
  priceRange?: {minVariantPrice?: {formatted?: string | null} | null} | null;
} | null;

type RawField = {
  key: string;
  value: string | null;
  reference?: RawRef;
  references?: {nodes: Array<RawEntry | Record<string, never>>} | null;
};

type RawEntry = {type: string; handle: string; fields: RawField[]};

function readEntry(raw: RawEntry): LandingEntry {
  const entry: LandingEntry = {
    type: raw.type,
    handle: raw.handle,
    values: {},
    images: {},
    videos: {},
    products: {},
    lists: {},
  };
  for (const field of raw.fields ?? []) {
    if (field.value != null && field.value !== '') entry.values[field.key] = field.value;
    const ref = field.reference;
    if (ref?.image) {
      entry.images[field.key] = {
        url: ref.image.url,
        alt: ref.image.altText,
        width: ref.image.width,
        height: ref.image.height,
      };
    } else if (ref?.sources?.length) {
      entry.videos[field.key] = ref.sources[0].url;
    } else if (ref?.handle) {
      entry.products[field.key] = {
        handle: ref.handle,
        title: ref.title ?? '',
        variantId: ref.defaultVariantId ?? null,
        price: ref.priceRange?.minVariantPrice?.formatted ?? null,
      };
    }
    const nodes = field.references?.nodes?.filter((n): n is RawEntry => 'type' in n);
    if (nodes?.length) entry.lists[field.key] = nodes.map(readEntry);
  }
  return entry;
}

export async function fetchLandingPage(
  ctx: NitroContext,
  handle: string,
): Promise<LandingPageData | null> {
  try {
    const data = await ctx.storefront.query<{
      metaobject: (RawEntry & {sections: RawField | null}) | null;
    }>(LANDING_PAGE_QUERY, {variables: {handle}});
    const raw = data?.metaobject;
    if (!raw) return null;

    const page: LandingPageData = {
      handle: raw.handle,
      values: readEntry(raw).values,
      sections: (raw.sections?.references?.nodes ?? [])
        .filter((n): n is RawEntry => 'type' in n)
        .map(readEntry),
    };
    // Без секции няма какво да се покаже - по-добре старата страница.
    if (!page.sections.length) return null;

    await fillOfferBlocks(ctx, page);
    return page;
  } catch (err) {
    console.warn(`Landing page ${handle}: metaobject query failed - showing the builder page`, err);
    return null;
  }
}

/**
 * Пакетите в „Оферти“ идват от първата заявка само с текстовете си. Тук
 * получават снимката и продукта си (цена, вариант за количката).
 */
async function fillOfferBlocks(ctx: NitroContext, page: LandingPageData) {
  const blocks = page.sections
    .flatMap((section) => Object.values(section.lists).flat())
    .filter((entry) => entry.type === 'product_block')
    .slice(0, MAX_OFFER_BLOCKS);
  if (!blocks.length) return;

  const variables = Object.fromEntries(blocks.map((b, i) => [`h${i}`, b.handle]));
  const data = await ctx.storefront.query<Record<string, RawEntry | null>>(
    landingBlocksQuery(blocks.length),
    {variables},
  );
  blocks.forEach((block, i) => {
    const raw = data?.[`b${i}`];
    if (raw) Object.assign(block, readEntry(raw));
  });
}
