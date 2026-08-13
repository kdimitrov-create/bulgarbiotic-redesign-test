import type {ReactNode} from 'react';
import {Hero} from '~/components/home/Hero';
import {HeroStats} from '~/components/home/HeroBannerSlider';
import {TrustStrip} from '~/components/home/TrustStrip';
import {Marquee} from '~/components/home/Marquee';
import {FeaturedProducts} from '~/components/home/FeaturedProducts';
import {Doverie} from '~/components/home/Doverie';
import {DoctorsSection} from '~/components/home/DoctorsSection';
import {BundleFeature} from '~/components/home/BundleFeature';
import {ProductForms} from '~/components/home/ProductForms';
import {CapsuleScience} from '~/components/home/CapsuleScience';
import {Categories} from '~/components/home/Categories';
import {ProbioticFinder} from '~/components/home/ProbioticFinder';
import {Founder} from '~/components/home/Founder';
import {Reviews} from '~/components/home/Reviews';
import {Award} from '~/components/home/Award';
import {PressStrip} from '~/components/home/PressStrip';
import {BrandStory} from '~/components/home/BrandStory';
import {Stories} from '~/components/home/Stories';
import {BlogHighlights} from '~/components/home/BlogHighlights';
import {FAQ} from '~/components/home/FAQ';
import {BottomCTAs} from '~/components/home/BottomCTAs';

/**
 * The redesign's own homepage sections, addressable from the page builder.
 *
 * The merchant composes the homepage in Дизайн → Страници. Native widgets cover
 * text, banners, buttons and video; for the sections built specially for this
 * shop they drop a "Код" block containing one line:
 *
 *     <!-- bb:doctors -->
 *
 * That keeps the order, the presence and the generic content in the panel while
 * the bespoke sections stay real components rather than being flattened into
 * generic blocks.
 *
 * Data-hungry sections receive what the homepage loader already fetches, so a
 * marker cannot ask for something the page has not loaded.
 */

/**
 * The page the merchant composes the homepage in. Kept here because both the
 * homepage route (which renders it) and the page route (which must not) need it.
 *
 * Беше `home` - handle, който този магазин няма. `page(handle: "home")` връщаше
 * null, тоест композицията от панела никога не се активираше и началната винаги
 * рисуваше закованите секции. Реалната страница е „Начална (нова)".
 *
 * Смяната има две следствия, и двете търсени: `/` рисува тази композиция, а
 * `/page/nachalna-nova` 301-ва към `/`, за да не се публикува едно и също
 * съдържание на два адреса.
 */
export const BUILDER_HOME_HANDLE = 'nachalna-nova';

export interface SectionData {
  featuredProducts?: any[];
  familyPack?: any;
  homeReviews?: any[];
  articles?: any[];
}

type Section = {
  /** What the merchant types: `bb:hero`. */
  marker: string;
  /** Shown in the cheat sheet handed to the merchant. */
  label: string;
  render: (data: SectionData) => ReactNode;
};

export const HOME_SECTIONS: Section[] = [
  {marker: 'hero', label: 'Кампаниен слайдер (горе)', render: () => <Hero />},
  {
    marker: 'stats',
    // Sits inside the hero row, on top of the "Карусел" widget.
    label: 'Числата върху банера (110k+ клиенти…)',
    render: () => <HeroStats />,
  },
  {marker: 'trust', label: 'Лента с гаранции', render: () => <TrustStrip />},
  {marker: 'marquee', label: 'Бягаща лента с предимства', render: () => <Marquee />},
  {
    marker: 'featured',
    label: 'Продукти на фокус (карусел)',
    render: (d) => <FeaturedProducts products={d.featuredProducts ?? []} />,
  },
  {marker: 'doverie', label: 'Доверие - числата', render: () => <Doverie />},
  {marker: 'doctors', label: 'Какво казва медицината (лекари)', render: () => <DoctorsSection />},
  {
    marker: 'bundle',
    label: 'Пакет на месеца',
    render: (d) => (d.familyPack ? <BundleFeature product={d.familyPack} /> : null),
  },
  {marker: 'forms', label: 'В какви форми се предлагат', render: () => <ProductForms />},
  {marker: 'capsule', label: 'Анимацията на капсулата', render: () => <CapsuleScience />},
  {marker: 'categories', label: 'Плочки с категории', render: () => <Categories />},
  {marker: 'finder', label: 'Наръчник за избор (тест)', render: () => <ProbioticFinder />},
  {marker: 'founder', label: 'Основателят', render: () => <Founder />},
  {
    marker: 'reviews',
    label: 'Отзиви на клиенти',
    render: (d) => <Reviews reviews={d.homeReviews ?? []} />,
  },
  {marker: 'awards', label: 'Награди (слайдер)', render: () => <Award />},
  {marker: 'press', label: 'Медиите за нас', render: () => <PressStrip />},
  {marker: 'brand', label: 'Българска традиция', render: () => <BrandStory />},
  {marker: 'stories', label: 'Истории на клиенти', render: () => <Stories />},
  {
    marker: 'blog',
    label: 'Статии от блога',
    render: (d) => <BlogHighlights articles={d.articles ?? []} />,
  },
  {marker: 'faq', label: 'Често задавани въпроси', render: () => <FAQ />},
  {marker: 'cta', label: 'Долни призиви (наука / наръчник)', render: () => <BottomCTAs />},
];

const BY_MARKER = new Map(HOME_SECTIONS.map((s) => [s.marker, s]));

/**
 * `<!-- bb:doctors -->` → the marker name, or null when the block is real HTML.
 *
 * Colons are allowed so a page section can be addressed too:
 * `bb:page:kosa-koja-i-nokti`.
 */
export function readMarker(html: string): string | null {
  const match = html.match(/^\s*<!--\s*bb:([a-z0-9:-]+)\s*-->\s*$/i);
  return match ? match[1].toLowerCase() : null;
}

/** Render the section a marker names, or nothing when the name is unknown. */
export function renderMarker(marker: string, data: SectionData): ReactNode {
  const section = BY_MARKER.get(marker);
  if (!section) return null;
  return section.render(data);
}

export function knownMarker(marker: string): boolean {
  return BY_MARKER.has(marker);
}

/**
 * Does this design place homepage sections?
 *
 * A composition of the homepage is built as an ordinary page so it can be
 * reworked and looked at before it is switched in. At its own address it must
 * render like the homepage — edge to edge, no page title, no breadcrumbs — and
 * the route needs the homepage's data behind the markers. This is how the route
 * recognises one.
 */
export function designComposesHome(design: any): boolean {
  let found = false;
  const walk = (node: any) => {
    if (found || !node || typeof node !== 'object') return;
    const code = node?.settings?.code ?? node?.settings?.html;
    if (typeof code === 'string') {
      const marker = readMarker(code);
      if (marker && BY_MARKER.has(marker)) {
        found = true;
        return;
      }
    }
    for (const child of node.children ?? []) walk(child);
  };
  walk(design);
  return found;
}

/**
 * The marker that hands the homepage back to the coded design.
 *
 * A second way out that needs no admin token: drop a Код block containing
 * `<!-- bb:off -->` anywhere on the builder homepage and the shop renders the
 * designed sections instead. Remove it and the composition returns.
 */
export const OFF_MARKER = 'off';

export function designTurnedOff(design: any): boolean {
  let off = false;
  const walk = (node: any) => {
    if (off || !node || typeof node !== 'object') return;
    const code = node?.settings?.code ?? node?.settings?.html;
    if (typeof code === 'string' && readMarker(code) === OFF_MARKER) {
      off = true;
      return;
    }
    for (const child of node.children ?? []) walk(child);
  };
  walk(design);
  return off;
}
