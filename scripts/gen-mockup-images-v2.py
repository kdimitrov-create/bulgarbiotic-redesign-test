#!/usr/bin/env python3
"""
v2 — Generate Bactology homepage assets via Gemini 3 Pro Image (highest quality)
   - Image-to-image enhancement of real Bactology product photos (preserves packaging!)
   - Higher resolution outputs
   - Pastel palette enforced
"""
import os, sys, json, base64, time, urllib.request, urllib.error
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

API_KEY = None
ENV_PATH = Path(__file__).parent.parent / ".env"
for line in ENV_PATH.read_text().splitlines():
    if line.startswith("GEMINI_API_KEY="):
        API_KEY = line.split("=", 1)[1].strip().strip('"').strip("'")
        break
if not API_KEY:
    sys.exit("Need GEMINI_API_KEY")

# ⭐ Gemini 3 Pro Image — best quality available
MODEL = "gemini-3-pro-image-preview"
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={API_KEY}"

OUT_DIR = Path(__file__).parent.parent / "public" / "images" / "generated-v2"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# ⭐ Strict style instructions — preserve EXACT packaging while elevating photography
STYLE_PRESERVE = (
    "CRITICAL: preserve the EXACT product packaging — every label, color, text, shape, and design element "
    "must remain IDENTICAL to the input image. Do not replace, redesign, or alter the products themselves. "
    "ONLY change the background, lighting, composition, and surrounding environment. "
    "Style: editorial wellness product photography. Soft warm pastel palette of warm cream beige (#F5EFE3), "
    "pale dusty blush pink (#F4D6E0), and pale dusty blue (#D5E3EE). "
    "Soft diffused natural light with subtle pastel pink and pale blue gradients. "
    "Hyper-detailed, premium magazine quality, slight bokeh haze, no harsh shadows. "
    "No added text, no added logos, no watermarks."
)

STYLE_SCENE = (
    "Editorial wellness product photography. Soft warm pastel palette of warm cream beige (#F5EFE3), "
    "pale dusty blush pink (#F4D6E0), and pale dusty blue (#D5E3EE). "
    "Soft diffused morning natural light, gentle haze, premium magazine aesthetic. "
    "Minimalist clean composition, hyper-detailed, shallow depth of field. "
    "No visible text, no logos, no watermarks."
)

# Real Bactology product CDN URLs (sourced from CloudCart admin API)
PRODUCT_URLS = {
    "family-pack": "https://bulgarbiotic.bg/cdn/img/products/103/bactology-family-pack-image_67d02263cfe32.png?width=1500",
    "travel-pack": "https://bulgarbiotic.bg/cdn/img/products/106/travel-pack-680f2a3bb4649.png?width=1500",
    "gastro-balance-pack": "https://bulgarbiotic.bg/cdn/img/products/85/probioticen-paket-gastro-balance-656dafd8f15f9.png?width=1500",
    "gastro-balance-colongic": "https://bulgarbiotic.bg/cdn/img/products/83/gastro-balance-colongic-654dfa9651a35.png?width=1500",
    "babies-kids": "https://bulgarbiotic.bg/cdn/img/products/82/probiotik-za-bebe-deca-i-podrastvasi-babies-and-kids-654891f51b74e.png?width=1500",
    "colongic": "https://bulgarbiotic.bg/cdn/img/products/81/bactology-colongic-probiotik-za-debeloto-cervo-653a1516e3db9.jpeg?width=1500",
    "anti-stress": "https://bulgarbiotic.bg/cdn/img/products/80/bactology-anti-stress-6538dd04a4cad.png?width=1500",
    "pets": "https://bulgarbiotic.bg/cdn/img/products/79/bactology-pets-652e4fd7cfeb1.png?width=1500",
    "smart-start": "https://bulgarbiotic.bg/cdn/img/products/75/smart-start-paket-za-silen-imunitet-64edc1af13c61.png?width=1500",
    "gastro": "https://bulgarbiotic.bg/cdn/img/products/68/bactology-probiotik-za-podut-korem-i-gazove-30-kapsuli-64edbe455c895.png?width=1500",
    "femin": "https://bulgarbiotic.bg/cdn/img/products/67/bactology-probiotik-za-zeni-femin-30-kapsuli-64edbe7e16033.png?width=1500",
    "tablets": "https://bulgarbiotic.bg/cdn/img/products/62/bactology-probioticni-tableti-v-balansirana-kombinacia-64edbf00c7ba7.png?width=1500",
    "pearls-keto": "https://bulgarbiotic.bg/cdn/img/products/61/bactology-dieticni-probioticni-perli-s-naturalen-sokolad-bez-zahar-64edbf4eaf35b.png?width=1500",
    "pearls-kids": "https://bulgarbiotic.bg/cdn/img/products/60/bactology-probioticni-perli-s-mlecen-sokolad-podhodasi-za-deca-64edbf9198427.png?width=1500",
    "beauty-pack": "https://bulgarbiotic.bg/cdn/img/products/59/paket-beauty-64edbfequipped d7bfc.png?width=1500",
    "beauty-cosmetic": "https://bulgarbiotic.bg/cdn/img/products/58/aktivna-formula-za-siajna-i-elasticna-koza-bez-bracki-bactology-64edc00e49b75.png?width=1500",
    "femin-perli-promo": "https://bulgarbiotic.bg/cdn/img/products/38/probiotik-femin--probioticni-perli-s-naturalen-sokolad-promocia-651fb2042b81a.png?width=1500",
    "plosko-koremce": "https://bulgarbiotic.bg/cdn/img/products/37/probitsi-za-plosko-koremce-promocia-femin--gastro-balance-6523c1e798a57.png?width=1500",
}

SPECS = [
    # ── HERO — Family Pack as iconic recognizable centerpiece ──
    {
        "name": "hero-family-pack.png",
        "input": "family-pack",
        "prompt": (
            "Place THIS Bactology Family Pack on a soft warm cream linen-covered table in a beautifully styled scene. "
            "Soft diffused morning sunlight from window left, casting subtle pastel pink and pale blue light shadows. "
            "A few sprigs of dried white flowers and small ceramic dishes nearby. The Bactology product is the hero — large, "
            "centered, in sharp focus. Background gently out of focus with warm pastel bokeh. Editorial magazine quality. "
            "Wide horizontal 16:9 framing for hero use."
        ),
    },
    # ── BUNDLE — Travel Pack styled lifestyle ──
    {
        "name": "bundle-travel.png",
        "input": "travel-pack",
        "prompt": (
            "Place THIS Bactology Travel Pack as a beautiful flat-lay top-down shot on warm cream linen surface. "
            "Around it: a small folded silk scarf in dusty pink, a vintage brass key, dried lavender sprig, "
            "and a tiny crystal water glass. Soft natural light with pastel pink and pale blue gradients. "
            "Premium travel-wellness aesthetic. Square 1:1 framing."
        ),
    },
    {
        "name": "bundle-family-feature.png",
        "input": "family-pack",
        "prompt": (
            "Top-down editorial flat-lay of THIS Bactology Family Pack on warm cream linen surface. "
            "Around it: a folded dusty pink linen napkin (left), a small ceramic dish with white pearl-shaped "
            "supplements (right), a sprig of dried white flowers (top). Pastel pink and pale blue ambient light. "
            "Premium editorial wellness magazine flat-lay. Square 1:1."
        ),
    },
    # ── PRODUCT CARDS — All major SKUs enhanced ──
    {
        "name": "p-babies.png",
        "input": "babies-kids",
        "prompt": "Center THIS product on a soft warm cream linen surface with a tiny knitted booty and small wooden spoon nearby. Pastel pink soft natural light from left, gentle bokeh. Square 1:1 framing.",
    },
    {
        "name": "p-femin.png",
        "input": "femin",
        "prompt": "Center THIS product on a soft cream surface with a single dried rose petal and small pearl beads scattered nearby. Pastel pink ambient light, dreamy bokeh. Square 1:1 framing.",
    },
    {
        "name": "p-colongic.png",
        "input": "colongic",
        "prompt": "Center THIS product on a soft cream linen surface with a small clear glass of water and one capsule placed beside it. Pale blue ambient light, premium wellness aesthetic. Square 1:1 framing.",
    },
    {
        "name": "p-anti-stress.png",
        "input": "anti-stress",
        "prompt": "Center THIS product on a soft cream surface with a small cup of herbal tea (steam visible) and a tiny succulent nearby. Soft pastel light, calming aesthetic. Square 1:1 framing.",
    },
    {
        "name": "p-gastro.png",
        "input": "gastro",
        "prompt": "Center THIS product on a soft cream linen with a small glass of milk and a folded white napkin. Soft pastel pink and blue ambient light. Square 1:1 framing.",
    },
    {
        "name": "p-pets.png",
        "input": "pets",
        "prompt": "Center THIS product on a soft cream surface with a small ceramic pet bowl and a wooden brush nearby. Warm pastel light, gentle bokeh. Square 1:1 framing.",
    },
    {
        "name": "p-pearls-kids.png",
        "input": "pearls-kids",
        "prompt": "Center THIS product on a soft cream surface with a few chocolate pearls scattered around in an artful arrangement. Pastel pink soft light, playful but premium. Square 1:1 framing.",
    },
    {
        "name": "p-smart-start.png",
        "input": "smart-start",
        "prompt": "Center THIS product on a soft cream surface with a few colorful wooden toy blocks (red, blue, yellow) artfully placed nearby. Pastel light, kid-friendly premium aesthetic. Square 1:1 framing.",
    },
    {
        "name": "p-beauty-pack.png",
        "input": "beauty-pack",
        "prompt": "Center THIS product on a soft cream surface with a small mirror, a single rose petal, and pearl beads nearby. Pastel pink dreamy light. Square 1:1 framing.",
    },
    # ── CATEGORY TILES — themed scenes with real product peeking in ──
    {
        "name": "c-women.png",
        "input": "femin",
        "prompt": (
            "Soft photograph: a woman's elegant hand (manicured, natural nails) gently holds THIS Bactology Femin product "
            "near soft cream linen curtains. Pastel pink and pale blue light, golden hour. Vertical 3:4 framing for tile."
        ),
    },
    {
        "name": "c-kids.png",
        "input": "pearls-kids",
        "prompt": (
            "Soft photograph: a small child's hand reaches toward THIS Bactology product placed on warm cream linen. "
            "A few chocolate pearls scattered around. Pastel pink soft natural light, playful warm aesthetic. Vertical 3:4."
        ),
    },
    {
        "name": "c-pearls.png",
        "input": "pearls-keto",
        "prompt": (
            "Soft photograph of THIS Bactology Pearls product on warm cream linen, with a small clear glass ramekin "
            "of dark chocolate pearls beside it. Pastel pink/blue split background light. Vertical 3:4."
        ),
    },
    {
        "name": "c-pets.png",
        "input": "pets",
        "prompt": (
            "Soft photograph of THIS Bactology Pets product on warm cream surface, with a sleeping golden puppy out of "
            "focus in background. Soft pastel light, warm pet-loving aesthetic. Vertical 3:4."
        ),
    },
    {
        "name": "c-bundles.png",
        "input": "smart-start",
        "prompt": (
            "Soft top-down photograph of THIS Bactology bundle product placed on warm cream linen, tied with thin pastel "
            "pink silk ribbon, with a handwritten gift tag attached. Soft pastel light, premium gift aesthetic. Vertical 3:4."
        ),
    },
    # ── BACKGROUND / ATMOSPHERE (no product) ──
    {
        "name": "science-microbiome.png",
        "prompt": (
            "Macro abstract painterly visualization of probiotic bacteria. Soft glowing pearl-pink and pale blue rod-shaped "
            "cells gently floating in a creamy warm beige translucent matrix. Bokeh light particles, painterly soft focus, "
            "dreamy science aesthetic. Like a watercolor of a probiotic microbiome landscape. Wide 16:9 framing."
        ),
    },
    # ── CTA banners ──
    {
        "name": "cta-labs.png",
        "prompt": (
            "Cinematic photograph of a scientist's gloved hands carefully placing white probiotic capsules into a glass "
            "petri dish in a clean modern wellness lab. Soft pastel blue and warm cream lighting. Out-of-focus glassware "
            "in background. Premium pharmaceutical aesthetic. Wide 16:9 framing."
        ),
    },
    {
        "name": "cta-quiz.png",
        "prompt": (
            "Photograph of an elegant unboxing moment: a slim cream-colored Bactology subscription box opens to reveal "
            "small probiotic jars perfectly nested in soft pastel pink tissue paper. A handwritten note on top. "
            "Soft natural morning light, premium subscription aesthetic. Wide 16:9 framing."
        ),
    },
    # ── BRAND STORY ──
    {
        "name": "brand-story.png",
        "prompt": (
            "Aspirational photograph of a Bulgarian mountain landscape at dawn — soft pastel pink and pale blue sky, "
            "mist rolling over rolling hills, a single wildflower in foreground. Dreamy editorial nature photography "
            "feel. Wide 16:9 framing."
        ),
    },
]


def fetch_input_bytes(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def call_api(spec):
    name = spec["name"]
    prompt = spec["prompt"]
    parts = []
    if "input" in spec:
        url = PRODUCT_URLS[spec["input"]]
        try:
            img_bytes = fetch_input_bytes(url)
        except Exception as e:
            return (name, False, f"input fetch failed: {e}", 0)
        # Image-to-image: prompt + input image
        full_prompt = STYLE_PRESERVE + " " + prompt
        parts = [
            {"text": full_prompt},
            {"inlineData": {"mimeType": "image/png", "data": base64.b64encode(img_bytes).decode()}},
        ]
    else:
        # Text-to-image only
        full_prompt = STYLE_SCENE + " " + prompt
        parts = [{"text": full_prompt}]

    payload = {
        "contents": [{"parts": parts}],
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
        return (name, False, f"HTTP {e.code}: {e.read()[:300].decode(errors='ignore')}", time.time()-t0)
    except Exception as e:
        return (name, False, f"err: {e}", time.time()-t0)
    elapsed = time.time() - t0
    out_parts = (data.get("candidates", [{}])[0].get("content", {}) or {}).get("parts", [])
    img_parts = [p for p in out_parts if "inlineData" in p]
    if not img_parts:
        return (name, False, f"no image: {json.dumps(data)[:300]}", elapsed)
    raw = base64.b64decode(img_parts[0]["inlineData"]["data"])
    out = OUT_DIR / name
    out.write_bytes(raw)
    return (name, True, f"{len(raw):,}b", elapsed)


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    targets = SPECS if not only else [s for s in SPECS if only in s["name"]]
    print(f"Generating {len(targets)} images via {MODEL}")
    print(f"Out: {OUT_DIR}")
    print()
    t0 = time.time()
    # Cap parallel — Gemini 3 may have lower rate limits than 2.5
    with ThreadPoolExecutor(max_workers=8) as ex:
        results = list(ex.map(call_api, targets))
    print(f"Total elapsed: {time.time()-t0:.1f}s\n")
    ok = 0
    for name, success, msg, elapsed in results:
        flag = "✓" if success else "✗"
        ok += int(success)
        print(f"  {flag} [{elapsed:5.1f}s] {name:32} {msg}")
    print(f"\n{ok}/{len(results)} successful")


if __name__ == "__main__":
    main()
