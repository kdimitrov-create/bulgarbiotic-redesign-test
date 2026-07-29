#!/usr/bin/env python3
"""
Generate editorial lifestyle photos for the PDP info tabs.

Goal: break up the walls of text in Употреба / Доставка / Описание with
brand-aligned editorial imagery so the page feels designed, not boring.

Style: editorial wellness magazine — soft natural light, cream / blush /
dusty-blue palette aligned with Bactology brand tokens. NO text overlays,
NO logos baked in (we layer real branding via React). Shallow depth of
field, hands-and-textures composition (avoid full faces — keeps content
brand-neutral so the same images work across all 27 SKUs).

Output: public/images/pdp-lifestyle/*.png — referenced by
app/components/ProductTabs.tsx in the Употреба / Доставка panels.

Re-run anytime: ~$0.30 / batch via Gemini 3 Pro Image. Replace the
single PNG if a specific shot needs an alternate take.
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

OUT_DIR = Path(__file__).parent.parent / "public" / "images" / "pdp-lifestyle"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Shared visual language — every image must feel like part of the same
# brand-aligned editorial shoot. Reused across all SPECS via prefix.
STYLE_EDITORIAL = (
    "Editorial wellness magazine photography, brand palette: warm cream "
    "(#FAF6EC), blush pink (#F5E2EA, #E3166C accent), dusty blue "
    "(#D6E2EC, #0267A0 accent). Soft natural window light, late morning. "
    "Shallow depth of field with intentional soft focus. Composition uses "
    "hands, textures, surfaces — NO faces, NO eye contact. Surfaces: warm "
    "oak wood, off-white linen, fluted ceramic, brushed brass, soft marble. "
    "Avoid bright saturated colors — everything in muted pastel range. "
    "NO TEXT, NO LOGOS, NO WATERMARKS, NO BRAND NAMES, NO PACKAGING LABELS "
    "of any kind in the frame. Image must read as quiet, premium, editorial. "
    "High resolution, sharp central subject, painterly background bokeh."
)

SPECS = [
    # ─── Употреба (Usage) tab ───────────────────────────────────────────
    {
        "name": "usage-dose.png",
        "shape": "16:9 wide editorial",
        "prompt": (
            "An open female hand on a cream linen tablecloth, palm gently "
            "cupping a single small white-and-clear probiotic capsule. "
            "Beside the hand: a tall clear glass of water with morning light "
            "refracting through it, casting soft caustics on the linen. "
            "Empty negative space on the right for text. Hero editorial photo "
            "for a 'recommended daily dose' section. 16:9 horizontal landscape."
        ),
    },
    {
        "name": "usage-timing.png",
        "shape": "16:9 wide editorial",
        "prompt": (
            "A warm breakfast scene on a fluted oak surface: an open leather-"
            "bound agenda planner with a fountain pen resting on it, a small "
            "espresso cup with golden crema, a glass water carafe, and a "
            "ceramic dish containing two probiotic capsules. Morning sunbeam "
            "from a window on the left casts long warm shadows. Editorial "
            "wellness photo for a 'when to take' section. 16:9 landscape."
        ),
    },
    {
        "name": "usage-duration.png",
        "shape": "16:9 wide editorial",
        "prompt": (
            "Top-down flat-lay on cream linen: a minimal weekly tracker "
            "notebook with small hand-drawn checkmarks on consecutive dates, "
            "a sprig of fresh eucalyptus, a small ceramic bowl with three "
            "probiotic capsules. Soft daylight, brushed brass paperclip "
            "detail. Editorial photo for 'consistency / duration' section. "
            "16:9 horizontal landscape framing."
        ),
    },
    {
        "name": "usage-storage.png",
        "shape": "4:3 editorial",
        "prompt": (
            "A clean bathroom shelf in soft morning light: an unlabeled "
            "small amber-glass apothecary jar standing beside a single sprig "
            "of dried lavender and a folded white linen cloth. Cream tiles "
            "behind, dusty blue accent. Editorial photo about 'cool dry "
            "storage'. 4:3 landscape framing."
        ),
    },
    # ─── Доставка (Shipping) tab ────────────────────────────────────────
    {
        "name": "shipping-arrival.png",
        "shape": "16:9 wide editorial",
        "prompt": (
            "An unmarked cream-colored cardboard parcel tied with a thin pink "
            "paper ribbon, resting on a warm oak doorstep beside a small "
            "potted olive plant. Soft afternoon sun creates a long shadow. "
            "Subtle morning haze. Editorial photo evoking 'fast home "
            "delivery'. 16:9 horizontal landscape."
        ),
    },
    {
        "name": "shipping-fast.png",
        "shape": "4:3 editorial",
        "prompt": (
            "Two hands meeting across a doorframe: one hand passing a small "
            "cream parcel to another open palm. Background is a softly blurred "
            "warm interior — dusty blue wall, cream linen runner. No faces in "
            "frame, only hands and parcel. Editorial moment of 'arrival'. "
            "4:3 landscape framing."
        ),
    },
    {
        "name": "shipping-return.png",
        "shape": "16:9 wide editorial",
        "prompt": (
            "On a warm oak desk: a small cream cardboard box partially open "
            "with crinkled tissue paper inside, a folded handwritten card with "
            "graceful italic script on cream paper (script is intentionally "
            "blurred / unreadable), a sprig of dried wildflowers. Brushed "
            "brass scissors out of focus. Editorial photo about 'easy 30-day "
            "return'. 16:9 horizontal landscape."
        ),
    },
]


def call_api(spec):
    name = spec["name"]
    prompt = STYLE_EDITORIAL + " " + spec["prompt"]
    parts = [{"text": prompt}]
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
    # Allow regenerating a single spec by name: `python gen-pdp-lifestyle-images.py usage-dose`
    targets = SPECS
    if len(sys.argv) > 1:
        wanted = set(sys.argv[1:])
        targets = [s for s in SPECS if Path(s["name"]).stem in wanted or s["name"] in wanted]
        if not targets:
            sys.exit(f"No spec matches {wanted}")

    print(f"Generating {len(targets)} editorial lifestyle photos via {MODEL}")
    print(f"Out: {OUT_DIR}\n")
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=4) as ex:
        results = list(ex.map(call_api, targets))
    print(f"Total elapsed: {time.time()-t0:.1f}s\n")
    ok = 0
    for name, success, msg, elapsed in results:
        flag = "OK" if success else "FAIL"
        ok += int(success)
        print(f"  [{flag:4}] [{elapsed:5.1f}s] {name:28} {msg}")
    print(f"\n{ok}/{len(results)} successful")


if __name__ == "__main__":
    main()
