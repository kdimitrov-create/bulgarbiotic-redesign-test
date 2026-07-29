# Pending work — Bactology Redesign

Tracked gaps from the May 2026 site-wide parity audit. Each item lists the
**impact**, the **affected files**, and the **recommended fix** so the next
contributor can act immediately.

Pinned by `CLAUDE.md` so it surfaces every time Claude or a human reviewer
loads project context — see the "Pending work" section at the bottom of
`CLAUDE.md`.

Last updated: 2026-05-21.

---

## 🔴 Tier 1 — Visible to users, fix before launch

### 1. Cookie banner + Newsletter popup are home-page only

- **Files**: `app/routes/_index.tsx` (renders both)
- **Problem**: `<CookieBanner />` and `<NewsletterPopup />` are mounted at the
  bottom of `_index.tsx`. They never appear on `/product/*`, `/category/*`,
  `/blog/*`, `/article/*`, `/page/*` etc. A user who lands directly on a
  product (e.g. from Google) gets ZERO cookie consent prompt — GDPR risk.
- **Fix**: Lift both into `app/components/PageLayout.tsx` so they render
  globally. PageLayout already wraps `<Outlet />` in `root.tsx`.
- **Acceptance**:
  - Direct visit to `/product/bactology-anti-stress` shows cookie banner on
    first visit, newsletter popup after dwell timer.
  - Dismissal still persists via `sessionStorage` (`bactology-cookies-v1`,
    `bactology-npopup-v1`).
- **ETA**: ~10 minutes.

### 2. Footer newsletter form is a no-op

- **Files**: `app/components/Footer.tsx` (search for `onSubmit`)
- **Problem**: Form has `onSubmit={(e) => e.preventDefault()}`. Submitting
  the email does nothing — no API call, no toast, no success state. Users
  who type their email see no feedback and never get added to the list.
- **Fix**: Wire to CloudCart's newsletter API or to the same backend
  endpoint used by `NewsletterPopup` (currently also UI-only — see #4
  below). Simplest: POST to a new `/api/newsletter` route that proxies to
  CloudCart Admin API `customerCreate` with `acceptsMarketing: true`.
- **Acceptance**:
  - On submit, button shows loading state.
  - Success: green toast "Благодарим! Кодът WELCOME10 е изпратен."
  - Failure: red toast with retry option.
  - Subscriber appears in CloudCart admin customer list.
- **ETA**: 1–2 hours including the API route.

### 3. Footer social icons are placeholders

- **Files**: `app/components/Footer.tsx` (search for `href="#"`)
- **Problem**: Facebook, YouTube, TikTok have `href="#"`. Only Instagram
  links to a real account (`https://instagram.com/bulgarbiotic`).
- **Fix**: Either replace with real URLs (ask Marieta for the official
  handles) OR remove the icons entirely. Empty `href="#"` social icons
  look broken to visitors and hurt trust.
- **Acceptance**: Every visible social icon either links to a real account
  in a new tab, or is removed.
- **ETA**: 5 minutes once URLs are confirmed with the brand owner.

---

## 🟡 Tier 2 — Functional but not "live data"

### 4. Newsletter popup has no backend either

- **Files**: `app/components/overlays/NewsletterPopup.tsx`
- **Problem**: Captures email + reveals `WELCOME10` code but doesn't
  actually submit anywhere. The code is a static string, not a generated
  voucher. There's no email send confirming the discount.
- **Fix** (depends on #2): same `/api/newsletter` POST + trigger CloudCart
  to email the code via a Klaviyo/Mailchimp/CloudCart flow.
- **Acceptance**: Customer email lands in marketing list AND a real
  email arrives within 60s with the discount code.
- **ETA**: 2–4 hours (depends on email-platform integration choice).

### 5. Homepage Reviews are a hard-coded snapshot

- **Files**: `app/components/home/Reviews.tsx`
- **Problem**: 3 reviews + 4.87★ summary were copied from the admin pull
  on 2026-05-18. Newer reviews in CloudCart won't appear on the homepage
  until someone manually re-runs the snapshot.
- **Fix**: Add a loader query in `_index.tsx`:
  ```ts
  ctx.storefront.query(REVIEW_SUMMARY_QUERY)
  ```
  Pass `{reviews, summary}` as props into `<Reviews />`. Add fallback to
  the current hard-coded snapshot if the API errors out.
- **Acceptance**: When a new 5-star review is posted on bulgarbiotic.bg,
  it appears on the homepage Reviews carousel within one page reload.
- **ETA**: 1–2 hours.

### 6. Product Subscription widget is UI-only

- **Files**: `app/components/ProductSubscription.tsx` (PDP)
- **Problem**: Toggle works visually (−10% off when active, monthly cadence
  text shows) but clicking "Купи" with subscription active still submits a
  regular one-time order. There's no recurring orders backend.
- **Fix**: Either integrate CloudCart Subscriptions app (if available) or
  pick a third-party (Recharge, Stripe Subscriptions). Then add a `?sub=1`
  query param that the add-to-cart action recognizes and creates a
  subscription line item.
- **Acceptance**: Customer enables subscription → buys → receives confirmation
  + automatic re-bill in 30 days.
- **ETA**: Full sprint (1–2 weeks) depending on chosen platform.

### 7. Stories tiles have no live Instagram embed

- **Files**: `app/components/home/Stories.tsx`
- **Problem**: 10 tiles use static images from `/public/images/ugc-stills/`.
  Each has `reelId: null`, so clicking does NOT open the actual Instagram
  reel — just shows the still photo modal.
- **Fix options**:
  - Wire Instagram Graph API → fetch latest 10 reels from
    `@bulgarbiotic` → use Reel IDs as `reelId` values. Modal embeds via
    Instagram's `/embed.js`.
  - OR replace Stories with curated UGC video files (self-hosted MP4) for
    full control (no Instagram OAuth, no rate limits).
- **Acceptance**: Clicking a Stories tile plays the actual Reel inline.
- **ETA**: 4–8 hours for API integration, 2–3 hours for self-hosted.

---

## 🟢 Tier 3 — Tracked separately

### 8. One product image blocked by Gemini content filter

- **Files**: `scripts/gen-all-product-images.py` — entry for `paket-colongic`
- **Problem**: `gemini-3-pro-image-preview` returns `blockReason: OTHER`
  when given the source packaging photo. The product currently falls back
  to the raw CloudCart CDN image (still works, just inconsistent style).
- **Fix**: Try alternate prompt wording (e.g. drop the brand-name token
  near the failing image), or generate via DALL·E / Midjourney as a
  one-off and drop the PNG into `public/images/generated-v2/p-paket-colongic.png`.
- **Acceptance**: `/category/all-products` shows uniform pastel style for
  all products without any raw packaging shot.

### 9. Cart drawer + Sticky cart items use raw CDN images

- **Files**: `app/components/CartDrawer.tsx`, `app/components/MobileStickyCart.tsx`
- **Problem**: Cart line items come from CloudCart `cart` payload directly,
  not from the storefront `product` query. So they ignore our
  `ENHANCED_PRODUCT_IMAGES` map and show raw packaging shots.
- **Fix**: Build a `getEnhancedFeatured(handle)` lookup in the cart drawer
  render path — if the cart line's product handle is in the enhanced map,
  swap the thumbnail to the local enhanced PNG.
- **Acceptance**: Open cart with any product added → thumbnail matches
  the PDP / listing image (lifestyle photo, not packaging).
- **ETA**: 30 minutes.

---

## How to use this file

When you start work on any item:
1. Move it from this file into a git branch with `pending/<n>-short-name`.
2. After merge, delete the section here AND from the "Pending work"
   section in `CLAUDE.md`.
3. If a new gap is discovered, add it here in the right tier with the
   same structure (Files / Problem / Fix / Acceptance / ETA).

Last reviewer note (2026-05-21): All 9 items above are documented in
the codebase via comments — they are intentional, not bugs. Sequence
recommendation: 1 → 3 → 9 → 8 (quick wins), then 2/4 (backend wiring
together), then 5/7 (live data), finally 6 (full integration).
