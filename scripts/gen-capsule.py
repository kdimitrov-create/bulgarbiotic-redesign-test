#!/usr/bin/env python3
"""Generate dramatic capsule visualization for the science section."""
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

SPECS = [
    {
        "name": "capsule-cutaway.png",
        "prompt": (
            "Hyper-realistic 3D macro render of a pharmaceutical DR-Caps probiotic capsule, separated open. "
            "TOP HALF: pastel dusty pink translucent capsule shell. "
            "BOTTOM HALF: pastel pale blue translucent capsule shell. "
            "BETWEEN them: a small swirl of creamy white probiotic powder cascading downward, suspended mid-air with motion blur. "
            "The two halves slightly tilted, separated by 60mm vertical gap, photographed from straight front. "
            "Set against a clean isolated transparent/cream background — capsule is the only subject, nothing else. "
            "Studio premium pharmaceutical product photography. Soft diffused light, very subtle shadows. "
            "Ultra detailed surface texture on the capsule shell. 4K detail."
        ),
    },
    {
        "name": "capsule-bacteria-bg.png",
        "prompt": (
            "Soft macro photograph: many small pearl-shaped probiotic bacteria gently floating in 3D space, "
            "predominantly pastel cream, dusty pink, and pale blue pearls of varying sizes (small to medium). "
            "Bokeh effect — some bacteria in sharp focus, others soft and out of focus. "
            "Background: warm cream beige to pastel pink gradient, dreamy painterly aesthetic. "
            "No central subject, evenly distributed for use as full-bleed background image. "
            "Wide 21:9 panoramic horizontal framing. Premium scientific wellness aesthetic, soft and luxurious."
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
    with ThreadPoolExecutor(max_workers=2) as ex:
        results = list(ex.map(call_api, SPECS))
    print(f"Total: {time.time()-t0:.1f}s\n")
    for n, ok, msg, t in results:
        print(f"  {'✓' if ok else '✗'} [{t:5.1f}s] {n} — {msg}")


if __name__ == "__main__":
    main()
