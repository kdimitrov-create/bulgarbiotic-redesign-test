import {useLoaderData, data, Link} from 'react-router';
import type {Route} from './+types/product.$handle';
import {getContext} from '~/lib/context';
import {bestDiscountFor, displayDiscountPercent} from '~/lib/active-discounts';
import {getSeoMeta, generateProductJsonLd} from '@cloudcart/nitro';
import {enhanceProductImages, enhanceProducts} from '~/lib/product-images';
import {Image, useOptimisticVariant, Money} from '@cloudcart/nitro-react';
import {ProductForm} from '~/components/ProductForm';
import {ProductImageGallery} from '~/components/ProductImageGallery';
import {ProductMarks, ProductMarkTags} from '~/components/ProductMarks';
import {Breadcrumbs} from '~/components/Breadcrumbs';
import {StarRating} from '~/components/StarRating';
import {ReviewList} from '~/components/ReviewList';
import {CertificationsStrip} from '~/components/CertificationsStrip';
import {ProductTrustRow} from '~/components/ProductTrustRow';
import {ProductSubscription} from '~/components/ProductSubscription';
import {ProductTabs} from '~/components/ProductTabs';
import {MobileStickyCart} from '~/components/MobileStickyCart';
import {PdpAwardBadge} from '~/components/pdp/PdpAwardBadge';
import {UsageSteps} from '~/components/pdp/UsageSteps';
import {MythBuster} from '~/components/pdp/MythBuster';
import {ComparisonTable} from '~/components/pdp/ComparisonTable';
import {ProductVideo} from '~/components/pdp/ProductVideo';
import {SectionAnchorNav} from '~/components/pdp/SectionAnchorNav';
import {ProductFormSwitcher} from '~/components/pdp/ProductFormSwitcher';
import {ProductBenefits} from '~/components/pdp/ProductBenefits';
import {parseProductDescription} from '~/lib/parse-product-description';
import {getProductComparison} from '~/lib/pdp-comparison';
import {ProductFaq} from '~/components/pdp/ProductFaq';
import {ProductDescription} from '~/components/pdp/ProductDescription';
import {Marquee} from '~/components/home/Marquee';

const EUR_TO_BGN = 1.95583;

export const meta: Route.MetaFunction = ({data: d}) => {
  const product = d?.product;
  if (!product) return getSeoMeta({title: 'Продукт | Bactology'});

  const url = `/product/${product.handle}`;
  return [
    ...getSeoMeta({
      title: product.seo?.title || `${product.title} | Bactology`,
      description: product.seo?.description || product.description,
      type: 'product',
      ...(product.featuredImage
        ? {image: {url: product.featuredImage.url, width: product.featuredImage.width, height: product.featuredImage.height}}
        : {}),
    }),
    {'script:ld+json': generateProductJsonLd(product, url)},
  ];
};

export async function loader({params, context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const productRaw = await ctx.storefront.getProduct(params.handle);
  if (!productRaw) throw data('Продуктът не е намерен', {status: 404});

  // Swap in AI-enhanced images for known SKUs (real CloudCart catalog data
  // is never mutated — only URLs are remapped). See app/lib/product-images.ts.
  const product = enhanceProductImages(productRaw)!;
  const linkedRaw = (productRaw as any).linkedProducts?.nodes ?? [];

  return {
    product,
    linkedProducts: enhanceProducts(linkedRaw),
    collections: (productRaw as any).collections?.nodes ?? [],
  };
}

export default function ProductPage() {
  const {product, linkedProducts, collections} = useLoaderData<typeof loader>();
  const firstVariant = product.variants.nodes[0];
  const {selectedVariant} = useOptimisticVariant(product, firstVariant);
  const variant = selectedVariant ?? firstVariant;

  // Compute basePriceEur for subscription widget
  const priceAmount = parseFloat(variant?.price?.amount ?? '0');
  const priceCurrency = (variant?.price?.currencyCode ?? 'EUR') as 'EUR' | 'BGN';
  const basePriceEur = priceCurrency === 'EUR' ? priceAmount : priceAmount / EUR_TO_BGN;

  // Key benefits extracted from the CMS description — rendered high on the page
  // (client: "Ключови ползи" raised up as focus, before scrolling past the hero).
  const keyBenefits = product.descriptionHtml
    ? parseProductDescription(product.descriptionHtml).benefits
    : [];

  return (
    <div className="max-w-[1380px] mx-auto px-5 md:px-9 py-6 md:py-10">
      <ProductBreadcrumbs product={product} collections={collections} />

      {/* Above-the-fold buy box.
       *
       * Both columns stick to the top on desktop — the gallery stays in view
       * for visual orientation, AND the buy-box (with Add to Cart) stays
       * tappable so the user never has to scroll back up to purchase.
       * `items-start` is critical: without it the columns stretch to match
       * heights and `position: sticky` becomes a no-op. */}
      <div className="grid items-start gap-8 md:grid-cols-2 md:gap-12 lg:grid-cols-[7fr_5fr] lg:gap-16 mt-2">
        {/* СНИМКАТА стои, дясната колона се движи покрай нея. Снимката се
            откача чак в края на решетката - тоест когато динамичната лента
            отдолу дойде до нея. Затова sticky е тук, а не отдясно. */}
        <div className="bb-pdp-media self-start">
          <ProductMedia product={product} variant={variant} />
        </div>
        <div className="self-start">
          <ProductDetails product={product} variant={variant} basePriceEur={basePriceEur} keyBenefits={keyBenefits} />
        </div>
      </div>

      {/* Dynamic USP marquee (client 2026-07): the scrolling USP strip sits
          between the gallery and the certifications — in the slot the "Ключови
          ползи" band used to occupy (which moved up into the buy-box column). */}
      <Marquee />

      {/* Quality certification stickers — moved UP here (client: "стикерите за
          качество над описанието"). Was previously rendered low on the page. */}
      <CertificationsStrip />

      {/* Sticky jump-to-section nav (Slice 3) */}
      <SectionAnchorNav />

      {/* Product description at the top (client reorder: "описанието най-горе") —
          extracted from the old tabs; still collapses with "прочети повече". */}
      <ProductDescription descriptionHtml={product.descriptionHtml} />

      {/* FAQ accordion moved up (client 2026-07): now sits directly above the
          "Как работи пробиотикът" video section. Per-product questions. */}
      <ProductFaq handle={product.handle} />

      {/* Long-form storytelling sections (NL Beauty-style scroll) */}
      <section id="video">
        <ProductVideo handle={product.handle} />
      </section>

      {/* Client 2026-08-05: the "Реални резултати" figures (94% / 89% / 3 303)
          are identical on every product, so on a product page they read as if
          they were about THIS product when they are not. Removed. */}

      <section id="usage">
        <UsageSteps />
      </section>

      <MythBuster />

      <section id="compare">
        {/* Client (5a): "Защо хората избират Bactology" unique per product. */}
        <ComparisonTable {...getProductComparison(product.handle, product.title)} />
      </section>

      {/* Tabbed deep details — Описание / Употреба / Спец. / Доставка / ЧЗВ */}
      <section id="tabs" className="bb-pdp-tabs-wrap">
        <ProductTabs
          descriptionHtml={product.descriptionHtml}
          properties={(product as any).properties ?? []}
          files={(product as any).files?.nodes ?? []}
          /* Editorial hero at top of Описание — reuses the product's
             AI-enhanced lifestyle photo (mapped in product-images.ts).
             Falls back to no hero if the product has no featuredImage. */
          heroImageUrl={product.featuredImage?.url}
          heroTitle={product.title}
        />
      </section>

      {/* "В какви форми се предлагат" cross-form switcher — contextualized
          to the current product (highlights its form, links to the others) */}
      <ProductFormSwitcher
        productHandle={product.handle}
        productTitle={product.title}
      />

      {/* (Certifications strip moved up — now renders right after Key benefits.) */}

      {/* Client 2026-08-05: the "Над 260 000 поръчки" band belongs on the home
          page, not on a product page — same store-wide numbers on every SKU. */}

      {/* Real customer reviews with verified badges (Slice 2 upgrade) */}
      <section id="reviews">
        {(product as any).reviewSummary && (
          <ReviewList
            reviews={(product as any).reviews?.nodes ?? []}
            summary={(product as any).reviewSummary}
            totalCount={(product as any).reviews?.totalCount ?? (product as any).reviewSummary?.totalCount ?? 0}
          />
        )}
      </section>

      {linkedProducts.length > 0 && (
        <LinkedProducts products={linkedProducts} />
      )}

      {/* Mobile sticky add-to-cart appears once main CTA scrolls out of view */}
      {variant && variant.id && (
        <MobileStickyCart product={product} variant={variant} />
      )}
    </div>
  );
}

/* --- Product Media (Left Column) --- */

function ProductMedia({product, variant}: {product: any; variant: any}) {
  const isOnSale = variant?.compareAtPrice &&
    parseFloat(variant.compareAtPrice.amount) > parseFloat(variant.price.amount);
  // Same helper as every listing, so the badge here cannot disagree with the one
  // on the card the shopper clicked. The rule percentage is only handed over when
  // the API gave no compareAtPrice to derive from.
  const rule = variant?.compareAtPrice ? null : bestDiscountFor(product?.id);
  const discountPct = displayDiscountPercent(
    rule?.percent,
    parseFloat(variant?.price?.amount ?? '0'),
    parseFloat(variant?.compareAtPrice?.amount ?? '0'),
  );

  return (
    <div className="relative">
      {/* Тук НЯМА sticky нарочно. Този елемент е точно колкото галерията, тоест
          вложеният sticky нямаше къде да пътува и никога не залепваше - това
          беше причината снимката да се изнася нагоре. Залепването се прави
          един ниво по-горе, от `.bb-pdp-media`, чийто контейнер е решетката. */}
      <div className="relative">
        {/* „Любими“ е изключено в модула „Продуктов каталог“ (клиент 2026-08-04). */}
        <ProductMarkTags
          product={product}
          discountPct={isOnSale ? discountPct : 0}
          soldOut={product.availableForSale === false}
          size="lg"
        />
        <ProductImageGallery
          images={product.images?.nodes ?? []}
          featuredImage={product.featuredImage}
          product={product}
        />
      </div>
    </div>
  );
}

/* --- Product Details (Right Column) --- */

function ProductDetails({product, variant, basePriceEur, keyBenefits}: {product: any; variant: any; basePriceEur: number; keyBenefits: string[]}) {
  const properties: Array<{name: string; values: string[]}> = product.properties ?? [];
  const files: Array<{id: string; name: string; filename: string; url: string; fileSize: number}> =
    product.files?.nodes ?? [];

  return (
    <div className="self-start">
      {/* Vendor */}
      {product.vendor && (
        <Link to={`/products?vendor=${product.vendor}`} className="inline-block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2 hover:text-[var(--color-brand-pink)] hover:no-underline">
          {product.vendor}
        </Link>
      )}

      {/* Title — large, confident, and balanced. Mobile sits at ~26px
       * so even long names read as a strong headline (not a label),
       * desktop scales up to 32px. */}
      <h1 className="text-[1.65rem] md:text-[2rem] font-extrabold tracking-tight leading-[1.1] md:leading-tight text-[var(--color-ink)]">
        {product.title}
      </h1>

      {/* Rating above-fold */}
      {product.reviewSummary && product.reviewSummary.totalCount > 0 && (
        <div className="mt-3 flex items-center gap-2.5">
          <StarRating
            rating={product.reviewSummary.averageRating}
            count={product.reviewSummary.totalCount}
            size="md"
          />
          <a href="#reviews" className="text-xs font-semibold text-[var(--color-brand-pink)] hover:underline">
            Виж отзивите →
          </a>
        </div>
      )}

      {/* BGolden Awards 2025 — small inline badge for instant authority */}
      <PdpAwardBadge />

      {/* Price + variants + qty + add-to-cart */}
      <ProductForm product={product} selectedVariant={variant} />

      {/* Trust pills under the CTA removed per client (2026-07). */}

      {/* "Ключови ползи" moved up into the buy-box column (client): fills the
          slot the trust pills + (hidden) subscription widget used to hold. */}
      {keyBenefits.length >= 3 && <ProductBenefits benefits={keyBenefits} compact />}

      {/* Subscription savings widget — recurring orders -10% (hidden for now) */}
      {basePriceEur > 0 && <ProductSubscription basePriceEur={basePriceEur} />}

      {/* SKU + EAN — meta line, small + muted */}
      {(variant?.sku || variant?.barcode) && (
        <div className="mt-5 flex items-center gap-4 text-xs text-gray-400 tracking-wide">
          {variant?.sku && <span>Код: <span className="text-gray-600 font-medium">{variant.sku}</span></span>}
          {variant?.barcode && <span>EAN: <span className="text-gray-600 font-medium">{variant.barcode}</span></span>}
        </div>
      )}

      {/* Tags */}
      {product.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-5">
          {product.tags.map((tag: string) => (
            <Link key={tag} to={`/search?q=${encodeURIComponent(tag)}`} className="py-1 px-2.5 bg-gray-100 rounded-full text-xs text-gray-600 transition-all duration-150 hover:bg-gray-200 hover:text-[var(--color-ink)] hover:no-underline">
              {tag}
            </Link>
          ))}
        </div>
      )}

      {/* ProductTabs and CertificationsStrip now live in the full-width
          sections below the buy-box (not inside this right column). */}
    </div>
  );
}

/* --- Related Products (Premium re-design) --- */

function LinkedProducts({products}: {products: any[]}) {
  return (
    <section className="mt-20 pt-10 border-t border-gray-200">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <div className="text-[10.5px] font-bold uppercase tracking-[1.4px] text-[var(--color-brand-pink)] mb-2">
            Подобни продукти
          </div>
          <h2 className="text-2xl md:text-[1.75rem] font-bold tracking-tight">
            Може също да харесаш
          </h2>
        </div>
        <Link
          to="/category/all-products"
          prefetch="intent"
          className="hidden md:inline-flex items-center gap-1.5 text-xs font-bold tracking-wide text-[var(--color-ink)] hover:text-[var(--color-brand-pink)] hover:no-underline"
        >
          Виж всички продукти
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="size-3.5">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5 bb-mobile-slider">
        {products.map((p: any) => (
          <Link
            key={p.id}
            to={`/product/${p.handle}`}
            prefetch="intent"
            className="group block text-inherit transition-transform duration-200 hover:no-underline hover:-translate-y-1"
          >
            <div className="relative overflow-hidden rounded-2xl bg-gray-50">
              {p.featuredImage?.url ? (
                <Image
                  data={p.featuredImage}
                  alt={p.title}
                  className="aspect-square object-cover w-full transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <img
                  src="/noimage.svg"
                  alt={p.title}
                  className="aspect-square object-cover w-full"
                />
              )}
              <ProductMarks
                product={p}
                soldOut={p.availableForSale === false}
                discountPct={bestDiscountFor(p.id)?.percent ?? 0}
                size="sm"
              />
            </div>
            <h4 className="text-sm font-bold mt-3 leading-tight text-[var(--color-ink)] line-clamp-2">
              {p.title}
            </h4>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-[15px] font-bold text-[var(--color-ink)]" style={{fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 500}}>
                <Money data={p.priceRange.minVariantPrice} />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* --- Breadcrumbs --- */

function ProductBreadcrumbs({product, collections}: {product: any; collections: any[]}) {
  const items: Array<{title: string; to?: string}> = [];
  if (collections?.[0]) {
    items.push({title: collections[0].title, to: `/category/${collections[0].handle}`});
  }
  items.push({title: product.title});
  return <Breadcrumbs items={items} />;
}
