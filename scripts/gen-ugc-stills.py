#!/usr/bin/env python3
"""
Generate UGC-style video cover stills via Gemini 3 Pro Image.
Mock real Bactology customer moments — first-person, authentic, varied tile shapes.
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

MODEL = "gemini-3-pro-image-preview"
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={API_KEY}"

OUT_DIR = Path(__file__).parent.parent / "public" / "images" / "ugc-stills"
OUT_DIR.mkdir(parents=True, exist_ok=True)

PRODUCT_URLS = {
    "femin": "https://bulgarbiotic.bg/cdn/img/products/67/bactology-probiotik-za-zeni-femin-30-kapsuli-64edbe7e16033.png?width=1200",
    "colongic": "https://bulgarbiotic.bg/cdn/img/products/81/bactology-colongic-probiotik-za-debeloto-cervo-653a1516e3db9.jpeg?width=1200",
    "anti-stress": "https://bulgarbiotic.bg/cdn/img/products/80/bactology-anti-stress-6538dd04a4cad.png?width=1200",
    "babies": "https://bulgarbiotic.bg/cdn/img/products/82/probiotik-za-bebe-deca-i-podrastvasi-babies-and-kids-654891f51b74e.png?width=1200",
    "family-pack": "https://bulgarbiotic.bg/cdn/img/products/103/bactology-family-pack-image_67d02263cfe32.png?width=1500",
    "pearls-kids": "https://bulgarbiotic.bg/cdn/img/products/60/bactology-probioticni-perli-s-mlecen-sokolad-podhodasi-za-deca-64edbf9198427.png?width=1200",
    "pets": "https://bulgarbiotic.bg/cdn/img/products/79/bactology-pets-652e4fd7cfeb1.png?width=1200",
    "smart-start": "https://bulgarbiotic.bg/cdn/img/products/75/smart-start-paket-za-silen-imunitet-64edc1af13c61.png?width=1200",
}

# Style: AUTHENTIC first-person UGC, NOT studio. Slight grain, casual phone-camera framing.
STYLE_UGC = (
    "CRITICAL: preserve the EXACT product packaging — every label, color, text, design element identical to input. "
    "Do not redesign or alter the product itself. ONLY change scene, lighting, person, environment. "
    "Style: AUTHENTIC user-generated-content (UGC) lifestyle photograph. Casual smartphone-camera framing — slight tilt, "
    "real natural daylight (not studio), real home / café / bathroom / outdoor environment. "
    "Soft pastel undertones in background lighting (warm cream, blush pink, dusty blue). "
    "People shown realistic, approachable Bulgarian / European demographic, ages 25-45, varied. "
    "Slight authentic imperfection — depth blur, minor reflection, natural texture. "
    "No added text, no added logos, no watermarks. Image must look like real customer's Instagram reel cover thumbnail."
)

# Mix of tile shapes — covered by aspect ratio
SPECS = [
    # Circular tile (avatar-style) — square crop, but framed with central subject
    {
        "name": "ugc-1-femin-bathroom.png",
        "input": "femin",
        "shape": "1:1 square",
        "prompt": (
            "First-person UGC photo: a young woman's hand placing THIS Bactology Femin box on a clean white "
            "bathroom counter beside a porcelain sink with brass faucet. Natural morning light from a window, "
            "soft pastel pink reflection on white tiles. Casual home bathroom aesthetic. Square 1:1 framing for circular crop."
        ),
    },
    # Vertical UGC selfie holding Colongic capsules in palm
    {
        "name": "ugc-2-colongic-palm.png",
        "input": "colongic",
        "shape": "9:16 vertical",
        "prompt": (
            "First-person UGC photo: woman in soft blue knit sweater holding open her palm with a few Bactology "
            "Colongic capsules visible in hand, the Colongic box visible behind in soft focus. Her face partially in frame "
            "showing she's smiling. Authentic kitchen window light, casual phone selfie framing. Vertical 9:16 framing."
        ),
    },
    # Square — woman talking to camera with Bactology product visible
    {
        "name": "ugc-3-anti-stress-talking.png",
        "input": "anti-stress",
        "shape": "1:1 square",
        "prompt": (
            "First-person UGC video screenshot: a 30-something woman in a cozy beige knit sweater sitting at a wooden home "
            "office desk, talking directly to camera with a slight smile. THIS Bactology Anti Stress box on the desk in "
            "front of her, slightly out of focus. Soft warm window light from left. Authentic vlog aesthetic. Square 1:1."
        ),
    },
    # Wide horizontal — bathroom shelf scene
    {
        "name": "ugc-4-shelf-flat.png",
        "input": "family-pack",
        "shape": "16:9 horizontal",
        "prompt": (
            "Lifestyle photograph: a clean modern bathroom shelf with the Bactology Family Pack components arranged "
            "alongside a bar of natural soap, a wooden brush, and a small glass jar with cotton pads. Soft pastel pink "
            "tile background visible. Warm morning natural light. Horizontal 16:9 framing."
        ),
    },
    # Vertical UGC — mother giving drops to baby
    {
        "name": "ugc-5-babies-mom.png",
        "input": "babies",
        "shape": "9:16 vertical",
        "prompt": (
            "First-person UGC photo: mother's hand holding THIS Bactology Babies & Kids product near a smiling baby "
            "(face out of frame for privacy, just chubby cheeks and tiny hand reaching). Soft pastel pink and blue baby "
            "blanket in background. Natural window light. Authentic mom-blogger aesthetic. Vertical 9:16 framing."
        ),
    },
    # Vertical — fitness woman with anti-stress
    {
        "name": "ugc-6-pearls-cafe.png",
        "input": "pearls-kids",
        "shape": "9:16 vertical",
        "prompt": (
            "First-person UGC photo: young woman in athletic wear at a sunny outdoor café table with THIS Bactology Pearls "
            "product and a cup of coffee. Open laptop slightly out of focus. Warm afternoon light, casual lifestyle "
            "framing. Vertical 9:16."
        ),
    },
    # Horizontal — family kitchen scene with Family Pack
    {
        "name": "ugc-7-family-kitchen.png",
        "input": "family-pack",
        "shape": "16:10 horizontal",
        "prompt": (
            "Lifestyle UGC photo: morning kitchen scene — Bactology Family Pack components on a wooden kitchen counter, "
            "with a glass of orange juice, a half-eaten croissant, and a small ceramic bowl with fruit. Warm window light, "
            "blurred kitchen background. Authentic family-life aesthetic. Horizontal 16:10."
        ),
    },
    # Vertical — pet owner with Pets product + dog
    {
        "name": "ugc-8-pets-dog.png",
        "input": "pets",
        "shape": "9:16 vertical",
        "prompt": (
            "First-person UGC photo: a hand holding THIS Bactology Pets product, with a happy golden retriever puppy "
            "looking up at it expectantly. Soft pastel cream rug background, warm afternoon natural light. Authentic "
            "pet-owner aesthetic. Vertical 9:16 framing."
        ),
    },
    # Square — Smart Start with toddler playing
    {
        "name": "ugc-9-kids-play.png",
        "input": "smart-start",
        "shape": "1:1 square",
        "prompt": (
            "First-person UGC photo: small wooden kid's table with THIS Bactology Smart Start product and several "
            "colorful wooden toys (red, yellow, blue blocks) artfully arranged. Soft cream rug visible at bottom of frame. "
            "Warm afternoon light, casual mom-blog aesthetic. Square 1:1 framing."
        ),
    },
]


def fetch_input_bytes(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def call_api(spec):
    name = spec["name"]
    prompt = STYLE_UGC + " " + spec["prompt"]
    parts = [{"text": prompt}]
    if "input" in spec:
        try:
            img = fetch_input_bytes(PRODUCT_URLS[spec["input"]])
            parts.append({"inlineData": {"mimeType": "image/png", "data": base64.b64encode(img).decode()}})
        except Exception as e:
            return (name, False, f"input fetch failed: {e}", 0)
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
        return (name, False, f"no image: {json.dumps(data)[:200]}", elapsed)
    raw = base64.b64decode(img_parts[0]["inlineData"]["data"])
    out = OUT_DIR / name
    out.write_bytes(raw)
    return (name, True, f"{len(raw):,}b · {spec.get('shape','?')}", elapsed)


def main():
    print(f"Generating {len(SPECS)} UGC stills via {MODEL}")
    print(f"Out: {OUT_DIR}\n")
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=8) as ex:
        results = list(ex.map(call_api, SPECS))
    print(f"Total elapsed: {time.time()-t0:.1f}s\n")
    ok = 0
    for name, success, msg, elapsed in results:
        flag = "✓" if success else "✗"
        ok += int(success)
        print(f"  {flag} [{elapsed:5.1f}s] {name:32} {msg}")
    print(f"\n{ok}/{len(results)} successful")


if __name__ == "__main__":
    main()
