import {useLoaderData} from 'react-router';
import {useCcPage} from '~/lib/analytics';
import {useHomeMotion} from '~/lib/use-home-motion';
import type {Route} from './+types/_index';
import {getContext} from '~/lib/context';
import {makeSoft} from '~/lib/soft.server';
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
import {BlogHighlights} from '~/components/home/BlogHighlights';
import {FAQ} from '~/components/home/FAQ';
import {BottomCTAs} from '~/components/home/BottomCTAs';
import {NewsletterPopup} from '~/components/overlays/NewsletterPopup';
import {
  BuilderDesignRenderer,
  builderHasContent,
  designPlacesOurSections,
  parseBuilderDesign,
} from '~/components/BuilderDesignRenderer';
import {designTurnedOff, BUILDER_HOME_HANDLE} from '~/components/home/SectionRegistry';
import {pageIsActive, homePageHandle} from '~/lib/page-flags.server';
import {
  collectBuilderNeeds,
  fetchBuilderData,
  EMPTY_BUILDER_DATA,
} from '~/lib/builder-data.server';
import {heroSlidesFromDesign, collectBuilderLinks} from '~/lib/builder-data';
import {storeCache} from '~/lib/shared-cache.server';
import {fetchBuilderPage} from '~/lib/builder-page.server';

/** Домейнът на магазина - за да се разпознае „връзка към нас" в банер.
 * ПУБЛИЧНИЯТ домейн, не API-origin-ът: панелът пише връзки към bulgarbiotic.bg,
 * а след подмяната в server.ts PUBLIC_STORE_DOMAIN е сервизният домейн. */
function storeDomainForLinks(env: Record<string, string | undefined>): string | null {
  return env.PUBLIC_SITE_DOMAIN || env.PUBLIC_STORE_DOMAIN || null;
}

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
            url: `${origin}/images/generated-v2/hero-family-pack.webp`,
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

  /* Всяко от четенията тук минава през `soft`.
   *
   * До 27.08.2026 loader-ът на началната беше гол: root loader-ът е защитен,
   * но СЕКЦИИТЕ на страницата не бяха, тоест един отказ на магазина или на
   * админското API се превръщаше в нашата страница „500 · Нещо се обърка".
   * Мерено същия ден: два провала за петнайсетина заявки при студен кеш, а
   * минути по-късно 25 от 25 минаха. Кратък миг на отказ - точно случаят, в
   * който резервна стойност е по-добра от грешка. */
  const soft = makeSoft('начална');

  const {featuredProducts, familyPack, homeReviews, articles} = await soft(
    'секции',
    fetchHomeSectionData(ctx),
    {featuredProducts: [], familyPack: null, homeReviews: [], articles: []} as any,
  );

  // Never let a missing builder page break the homepage: any failure here
  // simply means the coded sections render, exactly as before.
  // Кой е handle-ът на началната казва панелът; закованият е само резерва.
  const homeHandle =
    (await soft('handle на началната', homePageHandle(ctx.env as Record<string, string | undefined>), null)) ??
    BUILDER_HOME_HANDLE;

  const [builderPage, builderPageOn] = await Promise.all([
    soft('композиция от панела', fetchHomePage(ctx, homeHandle), null),
    // The Storefront API serves a page's body even when the merchant has
    // switched it off, so the flag has to come from the admin.
    // Резервното „да" пази поведението: панелът се смята за включен, а дали
    // композицията е наша решава маркерът `bb:`.
    soft('флаг на страницата', pageIsActive(ctx.env as Record<string, string | undefined>, homeHandle), true),
  ]);
  const parsed = parseBuilderDesign((builderPage as any)?.body);
  /* Композицията на панела печели само ако е НАША.
   *
   * Класическата тема ползва същия конструктор, тоест началната на магазина
   * също се чете като сглобена страница - и редизайнът показа нея вместо
   * своята. Затова се иска поне един маркер `<!-- bb:… -->`: той е подписът,
   * че тази страница нарочно поставя секции на редизайна. */
  const ours = designPlacesOurSections(parsed);
  const homeDesign = builderPageOn && ours && !designTurnedOff(parsed) ? parsed : null;

  // Only the blocks actually placed on the page are fetched for.
  const builderData = homeDesign
    ? await soft(
        'данни за блоковете',
        fetchBuilderData(
          ctx.storefront,
          ctx.env as Record<string, string | undefined>,
          collectBuilderNeeds(homeDesign),
        ),
        EMPTY_BUILDER_DATA,
      )
    : EMPTY_BUILDER_DATA;

  /* Банерите в героя идват от панела, не от кода.
   *
   * Взимат се от композицията на НАЧАЛНАТА (`parsed`) дори когато страницата се
   * рисува от нашите секции: интересува ни само въртележката и нейните дати.
   * Така „оставяме само активните" не е еднократно чистене на списък, а
   * състояние - изтече ли прозорецът на банер, той пада сам. */
  /* Връзките на банерите се разрешават дори когато страницата се рисува от
     нашите секции.
     Панелът пази вътрешната връзка като „вид:номер" (слайд 2 е `product:79`), а
     адресът ѝ идва от каталога. Дотук се подаваше празният `builderData` и
     банерът излизаше БЕЗ връзка. Иска се само картата с адресите - продуктите и
     статиите за другите блокове не се пипат. */
  const heroLinks = collectBuilderLinks(parsed);
  const heroData =
    homeDesign || !heroLinks.length
      ? builderData
      : await soft(
          'връзки на банерите',
          fetchBuilderData(ctx.storefront, ctx.env as Record<string, string | undefined>, {
            productIds: new Set<string>(),
            poolSize: 0,
            articleCount: 0,
            links: heroLinks,
          }),
          EMPTY_BUILDER_DATA,
        );
  const heroSlides = heroSlidesFromDesign(parsed, heroData, storeDomainForLinks(ctx.env as Record<string, string | undefined>));

  return {
    featuredProducts,
    familyPack,
    articles,
    homeReviews,
    heroSlides,
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

/**
 * Последната прочетена композиция, ЗАПАЗЕНА ИЗВЪН ИЗОЛАТА.
 *
 * `lastGoodHomePage` по-горе живее в паметта на един изолат, а Cloudflare пуска
 * нов при всяко снопче трафик - тоест точно при тихо време резервата липсва.
 * Затова същият запис отива и в общия кеш под собствен ключ, с дълъг срок:
 * стара, но истинска витрина е по-добра от каквато и да е зашита в кода.
 *
 * Тихо е по конструкция: няма ли кеш (локално, при тестове), просто не прави
 * нищо и всичко работи както преди.
 */
const HOME_PAGE_CACHE_KEY = 'https://bb-internal/last-good-home-page';
const HOME_PAGE_CACHE_TTL_S = 24 * 60 * 60;

async function rememberHomePage(handle: string, page: any): Promise<void> {
  try {
    const cache = await storeCache();
    if (!cache) return;
    await cache.put(
      HOME_PAGE_CACHE_KEY,
      new Response(JSON.stringify({handle, page}), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `max-age=${HOME_PAGE_CACHE_TTL_S}`,
        },
      }),
    );
  } catch {
    // Резервата е удобство, не задължение.
  }
}

async function recallHomePage(handle: string): Promise<any | null> {
  try {
    const cache = await storeCache();
    const hit = await cache?.match(HOME_PAGE_CACHE_KEY);
    if (!hit) return null;
    const saved = (await hit.json()) as {handle?: string; page?: any};
    return saved?.handle === handle ? (saved.page ?? null) : null;
  } catch {
    return null;
  }
}

/* От 07.10.2026 Storefront API-то връща `page: null` за страниците от
 * конструктора, а началната е такава. Резервите по-долу я държаха още ден
 * (общият кеш помни 24 ч), след което слайдерът остана без банери.
 * Затова при null композицията се чете от админа (`fetchBuilderPage`), като
 * останалите builder страници. Пак най-много веднъж в минута на изолат:
 * админът вече е отговарял с 429 при натоварване. */
const HOME_ADMIN_TTL_MS = 60 * 1000;

async function fetchHomePage(ctx: any, handle: string): Promise<any> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const page = await ctx.storefront.getPage(handle);
      if (page) {
        lastGoodHomePage = {at: Date.now(), handle, page};
        void rememberHomePage(handle, page);
        return page;
      }
      // null не е временен проблем - повторен опит не помага.
      break;
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
    Date.now() - lastGoodHomePage.at < HOME_ADMIN_TTL_MS
  ) {
    return lastGoodHomePage.page;
  }
  const fromAdmin = await fetchBuilderPage(ctx.env, handle, {home: true});
  if (fromAdmin) {
    lastGoodHomePage = {at: Date.now(), handle, page: fromAdmin};
    void rememberHomePage(handle, fromAdmin);
    return fromAdmin;
  }

  if (
    lastGoodHomePage &&
    lastGoodHomePage.handle === handle &&
    Date.now() - lastGoodHomePage.at < HOME_PAGE_TTL_MS
  ) {
    console.warn('home: показвам последната прочетена композиция');
    return lastGoodHomePage.page;
  }
  /* Изолатът е нов и няма спомен. Общият кеш обаче помни - оттам идва
     последната истинска композиция, вместо началната да падне на зашитите
     в кода банери. */
  const remembered = await recallHomePage(handle);
  if (remembered) {
    console.warn('home: композицията идва от общия кеш');
    return remembered;
  }
  return null;
}

export default function Homepage() {
  const {featuredProducts, familyPack, articles, homeReviews, heroSlides, homeDesign, builderData} =
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
      <Hero slides={heroSlides} />
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
      <BlogHighlights articles={articles} />
      <FAQ />
      <BottomCTAs />
      <NewsletterPopup />
    </>
  );
}
