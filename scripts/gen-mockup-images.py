#!/usr/bin/env python3
"""
Bulk generate Bactology homepage mockup images via Gemini 2.5 Flash Image (nano-banana).
Supports text-to-image and image-to-image (with input from URL).
Runs all generations in parallel via asyncio.
"""
import os, sys, json, asyncio, base64, urllib.request, time
from pathlib import Path

# Use stdlib only — no extra deps
import urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor

API_KEY = None
ENV_PATH = Path(__file__).parent.parent / ".env"
if ENV_PATH.exists():
    for line in ENV_PATH.read_text().splitlines():
        if line.startswith("GEMINI_API_KEY="):
            API_KEY = line.split("=", 1)[1].strip().strip('"').strip("'")
            break
if not API_KEY:
    sys.exit("Set GEMINI_API_KEY in .env")

MODEL = "gemini-2.5-flash-image"
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={API_KEY}"

OUT_DIR = Path(__file__).parent.parent / "public" / "images" / "generated"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Style prefix applied to every text-to-image prompt — ensures cohesion
STYLE = (
    "Editorial wellness product photography. Soft pastel color palette of warm cream beige (#F5EFE3), "
    "pale dusty blush pink (#F4D6E0), and pale dusty blue (#D5E3EE). "
    "Soft diffused morning natural light, gentle haze, premium magazine aesthetic. "
    "Minimalist clean composition. Hyper-detailed, shallow depth of field. "
    "No visible text, no logos, no watermarks. Square 1:1 framing unless specified."
)

# Image specs: name → prompt (text2img) or {prompt, input_url} (img2img enhancement)
SPECS = [
    # ── HERO + KEY VISUAL ──
    {
        "name": "hero-main.png",
        "prompt": (
            "A cluster of 4 minimalist white probiotic supplement jars with brushed silver lids, "
            "arranged elegantly on a light beige linen-covered table near a window. "
            "Soft morning sunlight streams through gauzy white curtains, casting gentle pastel pink and "
            "pastel blue light shadows. A sprig of soft eucalyptus and a small ceramic dish with white "
            "pearl-shaped supplements beside the jars. Background out of focus, dreamy bokeh."
        ),
    },
    {
        "name": "bundle-feature.png",
        "prompt": (
            "Premium product hero photograph: a Bactology family-pack of 4 small white probiotic jars "
            "arranged in a flat-lay on a soft warm beige surface. Surrounding them: a few delicate dried "
            "white flowers, a pearl-shaped chocolate, a tiny glass of milk, and folded linen napkin. "
            "Soft pastel pink reflection on left, pastel blue tint on right. Editorial top-down shot."
        ),
    },
    # ── SCIENCE / MICROBIOME ──
    {
        "name": "science-microbiome.png",
        "prompt": (
            "Macro abstract photograph of a soft pastel microbiome visualization. Microscopic bacteria "
            "depicted as soft glowing pearl-pink and pale blue rod-shaped cells, gently floating in a "
            "creamy warm beige translucent matrix. Bokeh light particles, soft focus, dreamy science aesthetic. "
            "Like an artistic watercolor of a probiotic landscape, painterly yet luminous. Editorial wellness magazine style."
        ),
    },
    # ── CATEGORY TILES ──
    {
        "name": "cat-women.png",
        "prompt": (
            "Close-up photograph of a woman's elegant hand holding a single small white probiotic jar "
            "against a soft pastel pink and warm cream background. Manicured natural nails, golden hour "
            "soft light, intimate wellness moment. Vertical 3:4 framing."
        ),
    },
    {
        "name": "cat-kids.png",
        "prompt": (
            "Photograph of a small white ceramic bowl filled with chocolate-coated probiotic pearls "
            "on a soft pastel cream surface, with a small wooden spoon nearby and one pearl held mid-air "
            "by a small child's fingertips. Warm soft natural light, playful but premium. "
            "Vertical 3:4 framing."
        ),
    },
    {
        "name": "cat-pearls.png",
        "prompt": (
            "Macro photograph of glossy round chocolate-coated probiotic pearls in a small clear glass "
            "ramekin on a warm beige linen surface. Soft pastel pink light from one side, pale blue tint "
            "from the other. One pearl placed just outside the ramekin. Editorial wellness aesthetic. "
            "Vertical 3:4 framing."
        ),
    },
    {
        "name": "cat-pregnancy.png",
        "prompt": (
            "Soft photograph of pregnant woman's hand resting gently on her belly wearing a cream linen "
            "dress, while her other hand holds a small white probiotic jar. Pastel pink soft natural light, "
            "warm cream background, intimate wellness moment. Face out of frame. Vertical 3:4 framing."
        ),
    },
    {
        "name": "cat-bundles.png",
        "prompt": (
            "Top-down photograph of a flat-lay arrangement: 3 different sized white probiotic jars "
            "tied together with a thin pastel pink ribbon, on a warm cream linen surface. A small handwritten "
            "tag attached. Soft pastel light, premium gift packaging aesthetic. Vertical 3:4 framing."
        ),
    },
    # ── BOTTOM CTAs ──
    {
        "name": "cta-labs.png",
        "prompt": (
            "Cinematic photograph of scientist's gloved hands carefully placing white probiotic capsules "
            "into a glass petri dish in a clean modern lab. Soft pastel blue and warm cream lighting, "
            "out-of-focus lab equipment in background. Premium pharmaceutical aesthetic. Wide 16:9 framing."
        ),
    },
    {
        "name": "cta-quiz.png",
        "prompt": (
            "Photograph of an elegant unboxing moment: a slim cream-colored subscription box opens to "
            "reveal 3 small white probiotic jars perfectly nested in soft pastel pink tissue paper. "
            "A handwritten note on top. Soft natural morning light, premium subscription aesthetic. "
            "Wide 16:9 framing."
        ),
    },
    # ── PRODUCT ENHANCEMENTS (image-to-image) ──
    {
        "name": "pcard-family-enhanced.png",
        "input_url": "https://bulgarbiotic.bg/cdn/img/products/103/bactology-family-pack-image_67d02263cfe32.png?width=1200",
        "prompt": (
            "Take this product photo and enhance it: place the family pack of 4 jars on a soft warm cream "
            "linen surface with a hint of pastel pink and pastel blue light. Keep the products IDENTICAL "
            "(same labels, same shapes, same colors) — ONLY change the background and lighting to match "
            "premium editorial wellness photography style. Soft natural diffused light, slight haze. "
            "Centered composition, square 1:1 framing."
        ),
    },
    {
        "name": "pcard-babies-enhanced.png",
        "input_url": "https://bulgarbiotic.bg/cdn/img/products/82/probiotik-za-bebe-deca-i-podrastvasi-babies-and-kids-654891f51b74e.png?width=800",
        "prompt": (
            "Take this Babies & Kids probiotic product photo and enhance it: place the SAME product on a "
            "soft warm cream surface with subtle pastel pink and pale blue lighting. Keep labels and product "
            "EXACTLY as they are. Add gentle haze, premium editorial wellness aesthetic. Square 1:1 framing."
        ),
    },
    {
        "name": "pcard-travel-enhanced.png",
        "input_url": "https://bulgarbiotic.bg/cdn/img/products/106/travel-pack-680f2a3bb4649.png?width=800",
        "prompt": (
            "Take this Travel Pack product photo and enhance it: place the SAME products on a soft warm cream "
            "linen surface, with pastel pink/blue ambient light. Keep all labels, shapes, colors EXACTLY as "
            "they are. Premium magazine wellness aesthetic. Square 1:1 framing."
        ),
    },
    {
        "name": "pcard-pregnancy-enhanced.png",
        "input_url": "https://bulgarbiotic.bg/cdn/img/products/90/probiotik-za-bremenni-paket-668bad0a286df.png?width=800",
        "prompt": (
            "Take this Pregnancy Pack product photo and enhance it: place the SAME products on a soft cream "
            "background with very gentle pastel pink and pale blue light. Keep labels and packaging IDENTICAL. "
            "Add slight bokeh, soft natural diffused morning light. Premium editorial wellness style. "
            "Square 1:1 framing."
        ),
    },
]


def fetch_input(url):
    """Fetch an image URL and return base64-encoded bytes."""
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return base64.b64encode(r.read()).decode()


def call_api(spec):
    """Generate one image via Gemini API. Returns (name, ok, msg, elapsed)."""
    name = spec["name"]
    prompt = spec["prompt"]
    if not prompt.startswith("Editorial"):
        prompt = STYLE + " " + prompt
    parts = [{"text": prompt}]
    if "input_url" in spec:
        try:
            img_b64 = fetch_input(spec["input_url"])
        except Exception as e:
            return (name, False, f"input fetch failed: {e}", 0)
        parts.append({"inlineData": {"mimeType": "image/png", "data": img_b64}})
    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {"responseModalities": ["IMAGE"]},
    }
    body = json.dumps(payload).encode()
    req = urllib.request.Request(
        URL,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            data = json.loads(r.read())
    except urllib.error.HTTPError as e:
        return (name, False, f"HTTP {e.code}: {e.read()[:200].decode(errors='ignore')}", time.time()-t0)
    except Exception as e:
        return (name, False, f"err: {e}", time.time()-t0)
    elapsed = time.time() - t0
    parts_out = (data.get("candidates", [{}])[0].get("content", {}) or {}).get("parts", [])
    img_parts = [p for p in parts_out if "inlineData" in p]
    if not img_parts:
        return (name, False, f"no image in response: {json.dumps(data)[:200]}", elapsed)
    raw = base64.b64decode(img_parts[0]["inlineData"]["data"])
    out = OUT_DIR / name
    out.write_bytes(raw)
    return (name, True, f"{len(raw):,}b", elapsed)


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    targets = SPECS if not only else [s for s in SPECS if only in s["name"]]
    print(f"Generating {len(targets)} images in parallel via {MODEL}...")
    print(f"Out: {OUT_DIR}")
    print()
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=len(targets)) as ex:
        results = list(ex.map(call_api, targets))
    print()
    print(f"Total elapsed: {time.time()-t0:.1f}s")
    print()
    ok = 0
    for name, success, msg, elapsed in results:
        flag = "✓" if success else "✗"
        ok += int(success)
        print(f"  {flag} [{elapsed:5.1f}s] {name:32} {msg}")
    print()
    print(f"{ok}/{len(results)} successful")


if __name__ == "__main__":
    main()
