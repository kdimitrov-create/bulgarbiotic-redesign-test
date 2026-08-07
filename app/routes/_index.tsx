import {useLoaderData} from 'react-router';
import {useEffect} from 'react';
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
import {pageIsActive} from '~/lib/page-flags.server';
import {
  collectBuilderNeeds,
  fetchBuilderData,
  EMPTY_BUILDER_DATA,
} from '~/lib/builder-data.server';

export const meta: Route.MetaFunction = () =>
  getSeoMeta({
    title: 'Bactology — Български пробиотици с Lactobacillus bulgaricus',
    description:
      'Български пробиотици с автентичен Lactobacillus bulgaricus. 25+ научно проучени формули за червата, имунитета, женското здраве, децата и красотата. Доверени от 110 000+ семейства от 2019 г.',
  });

// "Продукти на фокус" — the exact homepage carousel line-up the client chose
// (2026-07-24, from the live bulgarbiotic.bg grid screenshot), in their order.
// Edit this list to change which products the carousel features.
export async function loader({context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);

  const {featuredProducts, familyPack, homeReviews, articles} =
    await fetchHomeSectionData(ctx);

  // Never let a missing builder page break the homepage: any failure here
  // simply means the coded sections render, exactly as before.
  const [builderPage, builderPageOn] = await Promise.all([
    ctx.storefront.getPage(BUILDER_HOME_HANDLE).catch(() => null),
    // The Storefront API serves a page's body even when the merchant has
    // switched it off, so the flag has to come from the admin.
    pageIsActive(ctx.env as Record<string, string | undefined>, BUILDER_HOME_HANDLE),
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

export default function Homepage() {
  const {featuredProducts, familyPack, articles, homeReviews, homeDesign, builderData} =
    useLoaderData<typeof loader>();

  // Page-wide scroll progress + reveal-on-scroll observer + magnetic buttons
  useEffect(() => {
    const prog = document.getElementById('bb-page-progress');
    const onScroll = () => {
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      const pct = (window.scrollY / Math.max(docH, 1)) * 100;
      if (prog) prog.style.width = pct + '%';
    };
    window.addEventListener('scroll', onScroll, {passive: true});
    onScroll();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            observer.unobserve(e.target);
          }
        });
      },
      {threshold: 0.12},
    );
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

    const cleanups: Array<() => void> = [];
    document.querySelectorAll<HTMLElement>('.magnetic, .btn-primary, .bb-cta-btn').forEach((btn) => {
      const onMove = (e: MouseEvent) => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        btn.style.transform = `translate(${x * 0.18}px, ${y * 0.18}px)`;
      };
      const onLeave = () => {
        btn.style.transform = '';
      };
      btn.addEventListener('mousemove', onMove);
      btn.addEventListener('mouseleave', onLeave);
      cleanups.push(() => {
        btn.removeEventListener('mousemove', onMove);
        btn.removeEventListener('mouseleave', onLeave);
      });
    });

    return () => {
      window.removeEventListener('scroll', onScroll);
      observer.disconnect();
      cleanups.forEach((c) => c());
    };
  }, [featuredProducts]);

  // The merchant's own composition wins when there is one; otherwise the page
  // below is exactly what it has always been.
  if (homeDesign) {
    return (
      <>
        <BuilderDesignRenderer
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
