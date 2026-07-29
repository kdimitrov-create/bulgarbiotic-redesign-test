#!/usr/bin/env python3
"""
Generate capsule animation frames via Gemini 3 Pro Image.
Each frame must be visually consistent — same capsule, different open state.
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

MODEL = "gemini-3-pro-image-preview"
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={API_KEY}"

OUT = Path(__file__).parent.parent / "public" / "images" / "capsule"
OUT.mkdir(parents=True, exist_ok=True)

# Base style: visual continuity across frames
BASE = (
    "Hyper-realistic 3D macro render of a pharmaceutical capsule, photographed straight from the front. "
    "TOP HALF: pastel dusty pink (#F4D6E0) translucent capsule shell, glossy gel surface. "
    "BOTTOM HALF: pastel pale dusty blue (#D5E3EE) translucent capsule shell, glossy gel surface. "
    "Capsule shape: classic two-piece pharmaceutical capsule, slightly elongated, smooth round ends. "
    "Background: completely clean isolated cream-beige (#F5EFE3) flat background, no other objects, no shadows below capsule. "
    "Subtle soft studio key light from upper-left, very gentle ambient fill light. "
    "Premium pharmaceutical product photography. Centered composition. Square 1:1 framing. "
)

SPECS = [
    {
        "name": "cap-frame-0.png",
        "prompt": BASE + "STATE: capsule fully CLOSED. The two halves perfectly joined in the middle, no gap, no powder visible. The capsule stands vertical, intact, untouched. Tight composition centered.",
    },
    {
        "name": "cap-frame-1.png",
        "prompt": BASE + "STATE: capsule JUST starting to open. The two halves slightly separated with a 5mm gap, the top pink half lifted barely, tiny grains of cream-white probiotic powder just beginning to peek out at the seam. Both halves still vertical, almost touching. Tight composition centered.",
    },
    {
        "name": "cap-frame-2.png",
        "prompt": BASE + "STATE: capsule HALF-OPEN. The two halves separated by a 30mm vertical gap. Cream-white probiotic powder visibly cascading down from the top pink half toward the bottom blue half, forming a soft column of falling powder between them. Motion blur on the powder. Both halves still aligned vertically. Centered composition.",
    },
    {
        "name": "cap-frame-3.png",
        "prompt": BASE + "STATE: capsule FULLY OPEN. The two halves separated by a 70mm vertical gap, both still aligned vertically with the pink half on top and blue half on bottom. A dense column of creamy white probiotic powder cascades dramatically downward between them, with motion blur and tiny powder particles floating outward. Centered composition.",
    },
    {
        "name": "cap-frame-4.png",
        "prompt": BASE + "STATE: capsule SEPARATED + dispersing. The two halves now drifting apart even more, separated by 90mm. The top pink half tilted slightly clockwise, the bottom blue half tilted slightly counter-clockwise. A spray of creamy white probiotic powder dispersing in all directions, with hundreds of small floating powder particles drifting outward into the frame. Dynamic motion. Centered composition.",
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
    print(f"Generating {len(SPECS)} capsule frames via {MODEL}\n")
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=5) as ex:
        results = list(ex.map(call_api, SPECS))
    print(f"Total: {time.time()-t0:.1f}s\n")
    for n, ok, msg, t in results:
        print(f"  {'✓' if ok else '✗'} [{t:5.1f}s] {n} — {msg}")


if __name__ == "__main__":
    main()
