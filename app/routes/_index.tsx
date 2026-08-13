import {useLoaderData} from 'react-router';
import {useCcPage} from '~/lib/analytics';
import {useHomeMotion} from '~/lib/use-home-motion';
import type {Route} from './+types/_index';
import {getContext} from '~/lib/context';
import {fetchHomeSectionData} from '~/lib/home-data.server';
import {getSeoMeta} from '@cloudcart/nitro';
import type {Product, Article} from '@cloudcart/nitro';
import {enhanceProducts} from '~/lib/product-images';
import {enhanceArticleImage} from '~/lib/article-images';

import {Hero} from '~/components/home/Hero';
import {TrustStrip} from '~/components/home/TrustStrip';
import {Marquee} from '~/components/home/Marquee';
import {FeaturedProducts} from '~/components/home/FeaturedProducts';
import {Doverie} from '~/components/home/Doverie';
import {BundleFeature} from '~/components/home/BundleFeature';
import {ProductForms} from '~/components/home/ProductForms';
import {CapsuleScience} from '~/components/home/CapsuleScience';
import {Categories} from '~/components/home/Categories';
import {ProbioticFinder} from '~/components/home/ProbioticFinder';
import {Founder} from '~/components/home/Founder';
import {Reviews} from '~/components/home/Reviews';
import {DoctorsSection} from '~/components/home/DoctorsSection';
import {Award} from '~/components/home/Award';
import {PressStrip} from '~/components/home/PressStrip';
import {BrandStory} from '~/components/home/BrandStory';
import {Stories} from '~/components/home/Stories';
import {BlogHighlights} from '~/components/home/BlogHighlights';
import {FAQ} from '~/components/home/FAQ';
import {BottomCTAs} from '~/components/home/BottomCTAs';
import {NewsletterPopup} from '~/components/overlays/NewsletterPopup';
import {
  BuilderDesignRenderer,
  builderHasContent,
  parseBuilderDesign,
} from '~/components/BuilderDesignRenderer';
import {designTurnedOff, BUILDER_HOME_HANDLE} from '~/components/home/SectionRegistry';
import {pageIsActive, homePageHandle} from '~/lib/page-flags.server';
import {
  collectBuilderNeeds,
  fetchBuilderData,
  EMPTY_BUILDER_DATA,
} from '~/lib/builder-data.server';

/* Началната беше единствената страница без картинка при споделяне.
 *
 * Продуктовите отдавна дават og:image, og:type и twitter:card - началната
 * даваше само заглавие и описание. Тоест точно адресът, който се пуска в чат,
 * във Facebook или в Messenger, излизаше като гол син линк без нищо до него.
 * `getSeoMeta` строи целия набор, щом му се подадат `type`, `image` и `url`.
 *
 * Адресът се взима от root loader-а, защото og:image трябва да е пълен -
 * относителен път не се разпознава от нито една социална мрежа.
 */
export const meta: Route.MetaFunction = ({matches}) => {
  const origin =
    ((matches ?? []).find((m: any) => m?.id === 'root')?.data as any)?.origin ?? '';
  return getSeoMeta({
    title: 'Bactology - Български пробиотици с Lactobacillus bulgaricus',
    description:
      'Български пробиотици с автентичен Lactobacillus bulgaricus. 25+ научно проучени формули за червата, имунитета, женското здраве, децата и красотата. Доверени от 110 000+ семейства от 2019 г.',
    type: 'website',
    ...(origin ? {url: origin} : {}),
    ...(origin
      ? {
          image: {
            url: `${origin}/images/generated-v2/hero-family-pack.png`,
            width: 1376,
            height: 768,
            altText: 'Пробиотиците на Bactology',
          },
        }
      : {}),
  });
};

// "Продукти на фокус" — the exact homepage carousel line-up the client chose
// (2026-07-24, from the live bulgarbiotic.bg grid screenshot), in their order.
// Edit this list to change which products the carousel features.
export async function loader({context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);

  const {featuredProducts, familyPack, homeReviews, articles} =
    await fetchHomeSectionData(ctx);

  // Never let a missing builder page break the homepage: any failure here
  // simply means the coded sections render, exactly as before.
  // Кой е handle-ът на началната казва панелът; закованият е само резерва.
  const homeHandle =
    (await homePageHandle(ctx.env as Record<string, string | undefined>)) ??
    BUILDER_HOME_HANDLE;

  const [builderPage, builderPageOn] = await Promise.all([
    fetchHomePage(ctx, homeHandle),
    // The Storefront API serves a page's body even when the merchant has
    // switched it off, so the flag has to come from the admin.
    pageIsActive(ctx.env as Record<string, string | undefined>, homeHandle),
  ]);
  const parsed = parseBuilderDesign((builderPage as any)?.body);
  const homeDesign = builderPageOn && !designTurnedOff(parsed) ? parsed : null;

  // Only the blocks actually placed on the page are fetched for.
  const builderData = homeDesign
    ? await fetchBuilderData(
        ctx.storefront,
        ctx.env as Record<string, string | undefined>,
        collectBuilderNeeds(homeDesign),
      )
    : EMPTY_BUILDER_DATA;

  return {
    featuredProducts,
    familyPack,
    articles,
    homeReviews,
    homeDesign: builderHasContent(homeDesign) ? homeDesign : null,
    builderData,
  };
}

/**
 * Композицията от панела: три опита, а при провал - последната прочетена.
 *
 * Storefront API-то от време на време не връща точно тази страница. Провалът
 * не чупи нищо, но показва КОДИРАНАТА начална - друга страница, при това
 * изглеждаща като „редакциите ми не са се записали". Измерено на 2026-08-12
 * с паузи между заявките: една от четири. Само повторните опити не стигат,
 * защото проблемът трае и през трите.
 *
 * Затова последната успешно прочетена композиция се пази за 10 минути и се
 * ползва, когато четенето падне. Редакция в панела се вижда веднага щом едно
 * четене мине - кешът покрива само провалите.
 */
const HOME_PAGE_TTL_MS = 10 * 60 * 1000;
let lastGoodHomePage: {at: number; handle: string; page: any} | null = null;

async function fetchHomePage(ctx: any, handle: string): Promise<any> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const page = await ctx.storefront.getPage(handle);
      if (page) {
        lastGoodHomePage = {at: Date.now(), handle, page};
        return page;
      }
    } catch (error) {
      console.warn(
        'home: страницата от панела не се прочете (опит %d) - %s',
        attempt + 1,
        (error as Error).message,
      );
    }
    // Секунда почивка: същият милисекунден момент обикновено пада пак.
    if (attempt < 2) await new Promise((done) => setTimeout(done, 150));
  }

  if (
    lastGoodHomePage &&
    lastGoodHomePage.handle === handle &&
    Date.now() - lastGoodHomePage.at < HOME_PAGE_TTL_MS
  ) {
    console.warn('home: показвам последната прочетена композиция');
    return lastGoodHomePage.page;
  }
  return null;
}

export default function Homepage() {
  const {featuredProducts, familyPack, articles, homeReviews, homeDesign, builderData} =
    useLoaderData<typeof loader>();

  // Класическата тема описва началната като `site_home` - същото име, за да не
  // се разминат правилата в контейнера.
  useCcPage({type: 'site_home'});

  // Page-wide scroll progress + reveal-on-scroll observer + magnetic buttons
  useHomeMotion(featuredProducts);

  // The merchant's own composition wins when there is one; otherwise the page
  // below is exactly what it has always been.
  if (homeDesign) {
    return (
      <>
        <BuilderDesignRenderer
          firstHeadingIsH1
          design={homeDesign}
          sections={{featuredProducts, familyPack, homeReviews, articles}}
          data={builderData}
        />
        <NewsletterPopup />
      </>
    );
  }

  return (
    <>
      <Hero />
      <TrustStrip />
      <Marquee />
      <FeaturedProducts products={featuredProducts} />
      <Doverie />
      <DoctorsSection />
      <BundleFeature product={familyPack} />
      <ProductForms />
      <CapsuleScience />
      <Categories />
      <ProbioticFinder />
      <Founder />
      <Reviews reviews={homeReviews} />
      <Award />
      <PressStrip />
      <BrandStory />
      <Stories />
      <BlogHighlights articles={articles} />
      <FAQ />
      <BottomCTAs />
      <NewsletterPopup />
    </>
  );
}
