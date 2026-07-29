# Bactology / Bulgar Biotic Redesign — Working Rules

## ⚠️ CRITICAL — Where work happens

**ALL work happens in the real React Router 7 + Nitro project at `localhost:5173`.**

- Do **NOT** create new static HTML mockups under `.superpowers/brainstorm/`.
- Do **NOT** iterate visual designs in isolated preview files.
- Every change must land in:
  - `app/routes/*` (page-level routes)
  - `app/components/**/*` (React components)
  - `app/app.css` (design tokens, shared styles)
  - `app/lib/*` (helpers, context)
  - `public/images/**/*` (real assets)
- Verify changes by checking **`http://localhost:5173`** (the running dev server) — not a separate preview port.
- All product/category/article/brand data must come from the **CloudCart Storefront API** via the Nitro context (`ctx.storefront.*`) — no hard-coded mocks.

## Brand identity

- **Brand**: Bulgar Biotic / Bactology (Bulgarian probiotics, founded 2019)
- **Owner / manager**: Мариета Захариева
- **Logo**: `public/logo.svg` (use as-is, don't re-create inline)
- **Brand colours**: blue `#0267A0`, magenta `#E3166C` — already in `app.css` as `--color-brand-blue` / `--color-brand-pink`
- **Pastel surfaces**: cream-1/2/3, pink-1/2/3, blue-1/2/3 (defined in `app.css`)
- **Type**: Manrope (UI) + Fraunces italic (display accents)
- **Voice**: Bulgarian, marketing-energetic, expert-but-accessible. No anglicisms unless specific (DR-Caps™, L. bulgaricus).
- **Currency**: dual BGN + EUR (BG legal requirement, fixed rate 1 € = 1.95583 лв).

## AI imagery

- All Nano Banana / Gemini Pro generations belong in `public/images/<group>/`.
- Existing groups: `generated/`, `generated-v2/`, `ugc-stills/`, `capsule/`, `people/`.
- Reusable generation scripts live in `scripts/gen-*.py`. Add new ones for new batches; don't edit historic ones.

### Product image enhancement (single source of truth)

`app/lib/product-images.ts` is the **only** place mapping product handles to AI-enhanced images.

```ts
import {enhanceProducts, enhanceProductImages} from '~/lib/product-images';

// In a route loader (anywhere products are fetched):
const products = await ctx.storefront.getProducts(20);
return {products: enhanceProducts(products)};

// Or single product (PDP):
const product = await ctx.storefront.getProduct(handle);
return {product: enhanceProductImages(product)};
```

After enhancement, `product.featuredImage.url` and `product.images.nodes` point at the AI versions; the original CloudCart CDN images are appended after the enhanced ones in `images.nodes` so PDP galleries can show both.

**Real CloudCart catalog data is never mutated** — we only swap URLs in our React layer.

To add an enhancement for a new SKU:
1. Generate via `scripts/gen-mockup-images-v2.py` (Gemini 3 Pro Image, image-to-image with the real product photo).
2. Drop the PNG into `public/images/generated-v2/`.
3. Add the handle entry in `ENHANCED_PRODUCT_IMAGES`.

To revert any product to its real CloudCart photos: remove its handle from the map.

## CloudCart access

- Admin GraphQL: `cloudcart app execute --store bulgarbiotic.bg --query '...'`
- Storefront token + SHOP_ID live in `.env` (already pulled).
- Real product image CDN: `https://bulgarbiotic.bg/cdn/img/products/{id}/{path}?width=...`
- Real article image CDN: `https://bulgarbiotic.bg/cdn/img/articles/{id}/{filename}?width=...`

## What's already built (homepage)

`app/routes/_index.tsx` renders 10 sections in order:
Hero · Marquee · FeaturedProducts · Doverie · BundleFeature · CapsuleScience · Categories · BrandStory · Stories · BottomCTAs

## What's pending (from v10 mockup, must be ported to real project)

- Trust strip (4 USPs under hero)
- Press logos strip (after Reviews)
- Founder section (Мариета Захариева + enhanced portrait + paraphrased quote)
- Customer reviews strip (3 reviewer cards + summary)
- FAQ accordion (8 BG questions)
- Cookie consent banner (GDPR)
- Newsletter popup (10 % first-order, 8 s / 30 % scroll trigger)
- Mobile hamburger menu + slide-out drawer
- Stories Instagram modal (iframe + fallback)
- Stock indicators on product cards
- Subscription savings widget on product cards
- Real BGN + EUR pricing across all price displays
- Mini cart drawer (review existing `CartDrawer.tsx` and redesign in new style)

## ⚠️ Pending work — READ BEFORE STARTING

Open issues that are intentional placeholders, not bugs. Full details, file
paths, acceptance criteria, and ETAs in **[`PENDING.md`](./PENDING.md)** at
the project root.

**🔴 Tier 1 — fix before launch:**
1. **CookieBanner + NewsletterPopup are home-only** — lift into `PageLayout`
   so they show on every route (GDPR risk on direct PDP visits).
2. **Footer newsletter form is a no-op** — `onSubmit={e.preventDefault()}`
   with no backend. Wire to CloudCart `customerCreate(acceptsMarketing:true)`.
3. **Footer social icons are placeholders** — Facebook / YouTube / TikTok
   all have `href="#"`. Only Instagram is real. Confirm URLs or remove.

**🟡 Tier 2 — works but not live:**
4. **NewsletterPopup has no backend either** — same fix as #2.
5. **Homepage Reviews snapshot is hard-coded** (2026-05-18). Wire to live
   `storefront.query(REVIEW_SUMMARY_QUERY)` so new reviews surface.
6. **ProductSubscription is UI-only** — toggle works but checkout doesn't
   create a recurring order. Needs CloudCart Subscriptions or Recharge/Stripe.
7. **Stories Instagram embeds are static images** — every tile's
   `reelId: null`. Wire Instagram Graph API or use self-hosted MP4.

**🟢 Tier 3 — polish:**
8. **`paket-colongic` enhanced image blocked by Gemini filter** — falls
   back to CDN packaging. Regenerate with alternate prompt or DALL·E.
9. **Cart drawer + Sticky cart use raw CDN images** — cart payload doesn't
   pass through `ENHANCED_PRODUCT_IMAGES`. Add map lookup at thumbnail render.

Whenever a Tier 1 item ships, delete it from PENDING.md AND from this
section so the list stays current. New gaps discovered → add at the right
tier in PENDING.md with the same Files / Problem / Fix / Acceptance / ETA
structure.
