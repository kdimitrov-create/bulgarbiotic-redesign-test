import {useLoaderData} from 'react-router';
import {useEffect} from 'react';
import type {Route} from './+types/_index';
import {getContext} from '~/lib/context';
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
import {designTurnedOff} from '~/components/home/SectionRegistry';
import {pageIsActive} from '~/lib/page-flags.server';

export const meta: Route.MetaFunction = () =>
  getSeoMeta({
    title: 'Bactology — Български пробиотици с Lactobacillus bulgaricus',
    description:
      'Български пробиотици с автентичен Lactobacillus bulgaricus. 25+ научно проучени формули за червата, имунитета, женското здраве, децата и красотата. Доверени от 110 000+ семейства от 2019 г.',
  });

// "Продукти на фокус" — the exact homepage carousel line-up the client chose
// (2026-07-24, from the live bulgarbiotic.bg grid screenshot), in their order.
// Edit this list to change which products the carousel features.
const FEATURED_HANDLES = [
  'bactology-probiotik-za-jeni-femin', // Femin
  'paket-beauty', // Пакет Beauty
  'probiotik-za-bebe-deca-i-podrastvashti-babies-and-kids', // Babies & kids
  'probiotic-tablets-in-precisely-balanced-combination-copy', // Bactology Tablets (за зъби)
  'probiotici-za-plosko-koremche-promociya-femin-gastro-balance', // Плоско Коремче ПРОМОЦИЯ
  'bactology-anti-stress', // Anti Stress
  'smart-start-paket-za-silen-imunitet', // Smart Start (за деца)
  'dietary-probiotic-pearls-with-natural-chocolate-coating-without-added-sugar-copy', // КЕТО перли
  'bactology-colongic-probiotik-za-debeloto-chervo', // Colongic
  'probiotik-za-bremenni-paket', // Пакет за бременни
];

// "Продукт на фокус" / Пакет на месеца — the single product showcased in the
// BundleFeature block on the homepage. Client (2026-07): the monthly focus is
// the "Плоско Коремче" bundle. Change this handle to feature a different one.
const FOCUS_PRODUCT_HANDLE = 'probiotici-za-plosko-koremche-promociya-femin-gastro-balance';

// Real blog articles to feature on home page. All live in the
// "Beauty and Health" blog (id=1) on bulgarbiotic.bg.
// Cover image URLs are decorated via the shared helper in
// app/lib/article-images.ts (Storefront API doesn't surface them).
const BLOG_BLOG_HANDLE = 'beauty-and-health';

const BLOG_HIGHLIGHT_HANDLES: string[] = [
  'top-10-saveta-kak-da-podobrish-metabolizma-si',
  'top-5-uprajneniya-za-korem-u-doma-za-stegnato-i-silno-tyalo',
  'roza-damascena-taynata-na-jenskata-krasota-balans-i-dalgoletie',
];

/**
 * When the merchant has built a homepage in Дизайн → Страници with the handle
 * below, that page drives the homepage. Delete it, deactivate it or empty it and
 * the coded homepage returns on the next request — no deploy, no rollback.
 */
const BUILDER_HOME_HANDLE = 'home';

export async function loader({context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);

  // Featured products + Family Pack bundle + blog highlights + catalog pool
  // fetched in parallel. The catalog pool (getProducts) supplies the extra
  // cards that turn the homepage rail into a slider — see merge below.
  const [featuredProductsRaw, familyPackRaw, articlesRaw, catalogRaw] = await Promise.all([
    Promise.all(
      FEATURED_HANDLES.map((h) =>
        ctx.storefront.getProduct(h).catch((error: Error) => {
          console.error(`Failed to load product ${h}:`, error.message);
          return null;
        }),
      ),
    ),
    ctx.storefront.getProduct(FOCUS_PRODUCT_HANDLE).catch((error: Error) => {
      console.error(`Failed to load focus product ${FOCUS_PRODUCT_HANDLE}:`, error.message);
      return null;
    }),
    Promise.all(
      BLOG_HIGHLIGHT_HANDLES.map((handle) =>
        ctx.storefront.getArticle(BLOG_BLOG_HANDLE, handle).catch((error: Error) => {
          console.error(`Failed to load article ${handle}:`, error.message);
          return null;
        }),
      ),
    ),
    ctx.storefront.getProducts(16).catch(() => [] as Product[]),
  ]);

  const familyPack = familyPackRaw ? enhanceProducts([familyPackRaw])[0] : null;

  const featuredPicks = featuredProductsRaw.filter((p): p is Product => p !== null);

  // Homepage rail = the client-chosen FEATURED_HANDLES (10 products, in order).
  // The catalog pool only tops up if some hand-picks fail to load (cold cache),
  // so the slider is never short; picked handles are never duplicated.
  const pickedHandles = new Set(featuredPicks.map((p) => p.handle));
  const catalogPool = (catalogRaw as Product[]).filter(
    (p): p is Product => !!p && !pickedHandles.has(p.handle),
  );
  // Client (т.3): carousel of up to 12 products.
  const rail = [...featuredPicks, ...catalogPool].slice(0, 12);
  // If the hand-picks all failed (cold cache etc.) fall back to catalog order.
  const railFinal = rail.length > 0 ? rail : (catalogRaw as Product[]).slice(0, 12);

  // Patch missing cover URLs via the centralized article-images map
  // (Storefront API returns image.url === "" today).
  const articles = articlesRaw
    .filter((a): a is Article => a !== null)
    .map((a) => enhanceArticleImage(a as any, {width: 800, height: 600}) as Article);

  const featuredProducts = enhanceProducts(railFinal);

  // Real customer reviews for the homepage social-proof section (client #11).
  // The storefront ProductReview app exposes reviews per-product, so we pull
  // approved 5★ reviews (with a real comment) from the featured products —
  // getProduct returns each product's reviews.nodes — newest first. The Reviews
  // component falls back to a curated set if the API returns none.
  const homeReviews = (featuredProducts as any[])
    .flatMap((p) =>
      (p?.reviews?.nodes ?? []).map((r: any) => ({
        quote: (r?.comment as string) ?? '',
        name: (r?.author?.name as string) ?? 'Клиент',
        initials: (r?.author?.initials as string) ?? '',
        rating: (r?.rating as number) ?? 0,
        product: (p?.title as string) ?? '',
        createdAt: (r?.createdAt as string) ?? '',
      })),
    )
    .filter((r) => r.rating >= 5 && typeof r.quote === 'string' && r.quote.trim().length >= 60)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, 6);

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

  return {
    featuredProducts,
    familyPack,
    articles,
    homeReviews,
    homeDesign: builderHasContent(homeDesign) ? homeDesign : null,
  };
}

export default function Homepage() {
  const {featuredProducts, familyPack, articles, homeReviews, homeDesign} =
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
