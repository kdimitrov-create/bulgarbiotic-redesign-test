#!/usr/bin/env python3
"""Generate v10 batch 2 images: founder portrait + 3 customer reviewer portraits."""
import os, sys, json, base64, time, urllib.request, urllib.error
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

API_KEY = None
ENV_PATH = Path(__file__).parent.parent / ".env"
for line in ENV_PATH.read_text().splitlines():
    if line.startswith("GEMINI_API_KEY="):
        API_KEY = line.split("=", 1)[1].strip().strip('"').strip("'")
        break

MODEL = "gemini-3-pro-image-preview"
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={API_KEY}"

OUT = Path(__file__).parent.parent / "public" / "images" / "people"
OUT.mkdir(parents=True, exist_ok=True)

SPECS = [
    {
        "name": "founder.png",
        "prompt": (
            "Editorial portrait of a Bulgarian female microbiology scientist in her early 40s, "
            "warm smile, natural shoulder-length brown hair, clear skin with subtle natural makeup. "
            "Wearing a soft cream linen shirt unbuttoned at the collar. Standing in a clean modern wellness "
            "laboratory with soft pastel cream and pale blue lighting, out-of-focus glassware in the background. "
            "Premium editorial photography, soft natural light from a window on her left, slight haze. "
            "Looking warmly toward the camera. Vertical 3:4 framing, head and shoulders visible. "
            "No visible logos, no text. Hyper-realistic, premium magazine aesthetic."
        ),
    },
    {
        "name": "reviewer-1.png",
        "prompt": (
            "Authentic UGC selfie portrait of a Bulgarian woman in her early 30s, natural smile, "
            "shoulder-length wavy dark hair, soft natural makeup. Wearing a soft pastel pink knit sweater. "
            "Sitting in a sunlit home kitchen with white linen curtains in the background, soft pastel ambient light. "
            "Casual smartphone selfie aesthetic, slight tilt, real natural daylight. "
            "Shoulders and head visible. Square 1:1 framing. Hyper-realistic, no text, no logos."
        ),
    },
    {
        "name": "reviewer-2.png",
        "prompt": (
            "Authentic UGC portrait of a Bulgarian man in his late 30s, short dark hair, light beard, "
            "warm genuine smile. Wearing a casual navy blue henley shirt. Standing in a bright modern home "
            "office with a wooden desk and plants in the background. Soft pastel cream lighting. "
            "Casual smartphone photo aesthetic. Square 1:1 framing. Head and shoulders visible. "
            "Hyper-realistic, no text, no logos."
        ),
    },
    {
        "name": "reviewer-3.png",
        "prompt": (
            "Authentic UGC portrait of a young Bulgarian mother in her early 30s, warm smile, "
            "natural blonde hair tied back, holding a small baby (face turned away from camera for privacy). "
            "Wearing a soft cream linen blouse. Sitting in a sunlit nursery with pastel pink and pale blue "
            "soft toys in the background. Soft natural daylight, intimate family aesthetic. "
            "Square 1:1 framing. Hyper-realistic, no text, no logos."
        ),
    },
    {
        "name": "lab-detail.png",
        "prompt": (
            "Premium editorial photograph: close-up of two pairs of gloved hands carefully working in a clean "
            "modern microbiology laboratory — one hand holds a small glass petri dish, the other adjusts a "
            "pipette. Soft pastel pink and pale blue ambient lighting. Out-of-focus glassware and lab equipment. "
            "Hyper-detailed, premium scientific magazine aesthetic. Wide 16:9 framing. No text, no logos."
        ),
    },
]


def call_api(spec):
    payload = {
        "contents": [{"parts": [{"text": spec["prompt"]}]}],
        "generationConfig": {"responseModalities": ["IMAGE"]},
    }
    req = urllib.request.Request(
        URL, data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            data = json.loads(r.read())
    except urllib.error.HTTPError as e:
        return (spec["name"], False, f"HTTP {e.code}: {e.read()[:200].decode(errors='ignore')}", time.time()-t0)
    except Exception as e:
        return (spec["name"], False, f"err: {e}", time.time()-t0)
    elapsed = time.time() - t0
    parts = (data.get("candidates", [{}])[0].get("content", {}) or {}).get("parts", [])
    img_parts = [p for p in parts if "inlineData" in p]
    if not img_parts:
        return (spec["name"], False, f"no image: {json.dumps(data)[:200]}", elapsed)
    raw = base64.b64decode(img_parts[0]["inlineData"]["data"])
    (OUT / spec["name"]).write_bytes(raw)
    return (spec["name"], True, f"{len(raw):,}b", elapsed)


def main():
    print(f"Generating {len(SPECS)} via {MODEL}\n")
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=5) as ex:
        results = list(ex.map(call_api, SPECS))
    print(f"Total: {time.time()-t0:.1f}s\n")
    for n, ok, msg, t in results:
        print(f"  {'✓' if ok else '✗'} [{t:5.1f}s] {n} — {msg}")


if __name__ == "__main__":
    main()
