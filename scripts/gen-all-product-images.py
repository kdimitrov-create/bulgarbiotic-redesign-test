#!/usr/bin/env python3
"""
Generate AI-enhanced lifestyle photos for EVERY product so the brand
visual language is consistent across listing / sale / cart / PDP / home.

Same approach as gen-mockup-images-v2.py:
  - Image-to-image with Gemini 3 Pro Image (preserves packaging exactly)
  - Cream + dusty pink + dusty blue pastel palette
  - Soft diffused morning light, editorial magazine aesthetic
  - Output → public/images/generated-v2/p-<short>.png

Reads the CDN URLs from CloudCart admin (already scraped below).
"""
import os, sys, json, base64, time, urllib.request, urllib.error
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

API_KEY = None
ENV = Path(__file__).parent.parent / ".env"
for line in ENV.read_text().splitlines():
    if line.startswith("GEMINI_API_KEY="):
        API_KEY = line.split("=", 1)[1].strip().strip('"').strip("'")
        break
if not API_KEY:
    sys.exit("Need GEMINI_API_KEY in .env")

MODEL = "gemini-3-pro-image-preview"
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={API_KEY}"
OUT = Path(__file__).parent.parent / "public" / "images" / "generated-v2"
OUT.mkdir(parents=True, exist_ok=True)
CDN = "https://bulgarbiotic.bg/cdn/img/products"

STYLE = (
    "CRITICAL: preserve the EXACT product packaging — every label, color, text, "
    "shape, design element must remain IDENTICAL to the input image. Do not "
    "redesign or alter the product. ONLY change background, lighting, props, "
    "composition. Editorial wellness product photography. Soft warm pastel "
    "palette: warm cream beige (#F5EFE3), pale dusty blush pink (#F4D6E0), "
    "pale dusty blue (#D5E3EE). Soft diffused natural morning light. "
    "Subtle bokeh, premium magazine aesthetic. Square 1:1 framing centred on "
    "the product. No added text, no logos, no watermarks."
)

# Per-product: {handle, productId, cdnFile, outFile, scenePrompt}
# Scene prompt is what's appended to STYLE — keep it short, evocative.
PRODUCTS = [
    # ── Single SKU bottles/boxes ──
    {"handle": "aktivna-formula-za-zdrava-i-blestyashta-kosa-i-nokti-bactology",
     "id": 57, "cdn": "aktivna-formula-za-zdrava-i-blestasa-kosa-i-nokti-bactology-64edc04bc711a.png",
     "out": "p-hair-nails.png",
     "scene": "On a cream linen surface with a soft pink rose petal scattered nearby. Soft morning sun from window left, gentle bokeh."},

    {"handle": "aktivna-formula-za-siyayna-i-elastichna-koja-bez-brachki-bactology",
     "id": 58, "cdn": "aktivna-formula-za-siajna-i-elasticna-koza-bez-bracki-bactology-64edc00e49b75.png",
     "out": "p-skin-formula.png",
     "scene": "On a cream marble surface with a fresh pink peony bud beside it. Soft pink and cream pastels, morning light."},

    {"handle": "probiotic-tablets-in-precisely-balanced-combination-copy",
     "id": 62, "cdn": "bactology-probioticni-tableti-v-balansirana-kombinacia-64edbf00c7ba7.png",
     "out": "p-tablets.png",
     "scene": "On a cream linen surface with a small cream ceramic spoon and one fresh mint leaf. Soft morning light."},

    {"handle": "dietary-probiotic-pearls-with-natural-chocolate-coating-without-added-sugar-copy",
     "id": 61, "cdn": "bactology-dieticni-probioticni-perli-s-naturalen-sokolad-bez-zahar-64edbf4eaf35b.png",
     "out": "p-pearls-keto.png",
     "scene": "On a cream linen with small chocolate pearls scattered around, hint of cocoa dust. Soft warm light."},

    {"handle": "probiotic-pearls-with-milk-chocolate-coating-suitable-for-kids-copy",
     "id": 60, "cdn": "bactology-probioticni-perli-s-mlecen-sokolad-podhodasi-za-deca-64edbf9198427.png",
     "out": "p-pearls-milk-kids.png",
     "scene": "On a cream surface with chocolate pearls scattered, a child's small wooden spoon nearby. Soft warm light."},

    {"handle": "probiotik-za-zdravi-zabi-i-venci-mini",
     "id": 49, "cdn": "probiotik-za-zdravi-zabi-i-venci-mini-653a3d023e110.png",
     "out": "p-teeth-mini.png",
     "scene": "On a cream marble surface with a small cream ceramic dish and fresh mint leaf. Soft morning light, dental wellness feel."},

    # ── Promo bundles (multi-pack) ──
    {"handle": "family-pack",
     "id": 103, "cdn": "bactology-family-pack-image_67d02263cfe32.png",
     "out": "p-family-pack.png",
     "scene": "On a cream linen-covered table with soft pink dried flowers nearby. Family wellness aesthetic, premium morning light."},

    {"handle": "travel-pack-1",
     "id": 106, "cdn": "travel-pack-680f2a3bb4649.png",
     "out": "p-travel-pack.png",
     "scene": "On a cream linen surface beside a small leather luggage tag and a sprig of eucalyptus. Travel wellness aesthetic, morning light."},

    {"handle": "paket-beauty",
     "id": 59, "cdn": "paket-beauty-64edbfebd7bfc.png",
     "out": "p-paket-beauty.png",
     "scene": "On a cream marble surface with fresh pink peony petals scattered around. Soft beauty editorial light, dreamy."},

    {"handle": "paket-otslabvane",
     "id": 13, "cdn": "probiotik-za-zeni-paket-otslabvane-657041e693f38.png",
     "out": "p-paket-otslabvane.png",
     "scene": "On cream linen with a tape measure folded nearby and a small glass of water with lemon slice. Wellness weight aesthetic."},

    {"handle": "paket-otslabvane-za-maje",
     "id": 14, "cdn": "probiotik-za-maze-paket-otslabvane-675801dd30336.png",
     "out": "p-paket-otslabvane-maje.png",
     "scene": "On cream linen surface with subtle leather watchband and tape measure. Masculine wellness aesthetic, soft morning light."},

    {"handle": "paket-colongic",
     "id": 10, "cdn": "probioticen-paket-colongic-656db04442fce.png",
     "out": "p-paket-colongic.png",
     "scene": "On cream linen with a fresh sprig of mint and small cream ceramic bowl. Soft warm morning light, digestive wellness."},

    {"handle": "paket-gastro-balance",
     "id": 85, "cdn": "probioticen-paket-gastro-balance-656dafd8f15f9.png",
     "out": "p-paket-gastro.png",
     "scene": "On cream linen with fresh ginger root slice and chamomile flower. Soothing morning light, digestive wellness."},

    {"handle": "gastro-balance-colongic",
     "id": 83, "cdn": "gastro-balance-colongic-654dfa9651a35.png",
     "out": "p-gastro-colongic.png",
     "scene": "On cream linen with chamomile flowers and a small ceramic teacup. Soft warm light, gut-health editorial."},

    {"handle": "probiotik-za-bremenni-paket",
     "id": 90, "cdn": "probiotik-za-bremenni-paket-668bad0a286df.png",
     "out": "p-bremenni.png",
     "scene": "On soft cream blanket with a small pink rosebud and folded pastel baby ribbon nearby. Tender pregnancy aesthetic."},

    {"handle": "dvoyno-udovolstvie",
     "id": 34, "cdn": "probioticni-perli-s-mlecen-sokolad-2-br--na-promo-cena-dvojno-udovolstvie-648046fab7cda.png",
     "out": "p-pearls-double.png",
     "scene": "On cream linen with chocolate pearls scattered, soft warm light, indulgent feel."},

    # ── Promo SKUs (have their own pack art) ──
    {"handle": "probiotici-za-plosko-koremche-promociya-femin-gastro-balance",
     "id": 37, "cdn": "probiotici-za-plosko-koremce-promocia-femin--gastro-balance-6523c1e798a57.png",
     "out": "p-plosko-koremche.png",
     "scene": "On cream linen with a small measuring tape and fresh mint leaves. Soft morning light, slim wellness aesthetic."},

    {"handle": "promociya-3-br-probiotichni-tabletki-za-smuchene",
     "id": 39, "cdn": "probioticni-tabletki-za-smucene-3br-promocia-64804d0d6c840.png",
     "out": "p-3-tablets-promo.png",
     "scene": "On cream marble surface with a small cream ceramic dish and a fresh mint sprig. Dental wellness, soft morning light."},

    {"handle": "promociya-probiotik-femin-probiotichni-perli-s-naturalen-shokolad",
     "id": 38, "cdn": "probiotik-femin--probioticni-perli-s-naturalen-sokolad-promocia-651fb2042b81a.png",
     "out": "p-femin-pearls-promo.png",
     "scene": "On cream linen with fresh pink rose petals and chocolate pearls scattered. Feminine indulgent aesthetic."},

    {"handle": "promociya-babies-and-kids-probiotichni-perli-s-mlechen-shokolad",
     "id": 35, "cdn": "promocia-babies-and-kids--probioticni-perli-s-mlecen-sokolad-65c20d0a10d97.png",
     "out": "p-babies-pearls-promo.png",
     "scene": "On cream linen with chocolate pearls and a small wooden child's toy. Tender child-care aesthetic."},

    # ── Duplicate handle (Gastro Copy = same as main Gastro) ──
    {"handle": "bactology-probiotik-za-podut-korem-i-gazove-gastro-balance-copy",
     "id": 119, "cdn": "bactology-gastro-probiotik-za-podut-korem-i-gazove-copy-6a0b067d78f71.webp",
     "out": "p-gastro-copy.png",
     "scene": "On cream linen with fresh ginger and chamomile flowers. Soft warm morning light, digestive editorial."},
]


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def call(item):
    out = OUT / item["out"]
    if out.exists():
        return (item["out"], True, "skip (exists)", 0)
    src = f"{CDN}/{item['id']}/{item['cdn']}?width=1500"
    try:
        img = fetch(src)
    except Exception as e:
        return (item["out"], False, f"fetch failed: {e}", 0)
    prompt = STYLE + " " + item["scene"]
    payload = {
        "contents": [{"parts": [
            {"text": prompt},
            {"inlineData": {"mimeType": "image/png", "data": base64.b64encode(img).decode()}},
        ]}],
        "generationConfig": {"responseModalities": ["IMAGE"]},
    }
    body = json.dumps(payload).encode()
    req = urllib.request.Request(
        URL, data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            data = json.loads(r.read())
    except urllib.error.HTTPError as e:
        return (item["out"], False, f"HTTP {e.code}: {e.read()[:200].decode(errors='ignore')}", time.time() - t0)
    except Exception as e:
        return (item["out"], False, f"err: {e}", time.time() - t0)
    elapsed = time.time() - t0
    parts = (data.get("candidates", [{}])[0].get("content", {}) or {}).get("parts", [])
    imgs = [p for p in parts if "inlineData" in p]
    if not imgs:
        return (item["out"], False, f"no image: {json.dumps(data)[:200]}", elapsed)
    raw = base64.b64decode(imgs[0]["inlineData"]["data"])
    out.write_bytes(raw)
    return (item["out"], True, f"{len(raw):,}b", elapsed)


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    items = PRODUCTS if not only else [p for p in PRODUCTS if only in p["handle"] or only in p["out"]]
    print(f"Generating {len(items)} product images via {MODEL}")
    print(f"Out: {OUT}\n")
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=6) as ex:
        results = list(ex.map(call, items))
    print(f"\nTotal elapsed: {time.time() - t0:.1f}s\n")
    ok = sum(1 for _, s, *_ in results if s)
    for name, success, msg, elapsed in results:
        flag = "✓" if success else "✗"
        print(f"  {flag} [{elapsed:5.1f}s] {name:32} {msg}")
    print(f"\n{ok}/{len(results)} successful")


if __name__ == "__main__":
    main()
