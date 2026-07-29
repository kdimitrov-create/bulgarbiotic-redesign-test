#!/usr/bin/env python3
"""Enhance the real founder portrait via Gemini 3 Pro Image — preserve identity, improve quality."""
import sys, json, base64, time, urllib.request, urllib.error
from pathlib import Path

API_KEY = None
ENV_PATH = Path(__file__).parent.parent / ".env"
for line in ENV_PATH.read_text().splitlines():
    if line.startswith("GEMINI_API_KEY="):
        API_KEY = line.split("=", 1)[1].strip().strip('"').strip("'")
        break

MODEL = "gemini-3-pro-image-preview"
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={API_KEY}"

INPUT = Path(__file__).parent.parent / "public" / "images" / "people" / "founder-real.jpeg"
OUTPUT = Path(__file__).parent.parent / "public" / "images" / "people" / "founder-enhanced.png"

PROMPT = (
    "CRITICAL: preserve the EXACT identity of the person — same face, same hair, same eyes, same expression, "
    "same clothing, same body language. Do NOT alter who she is. "
    "Take this professional portrait and enhance it: increase resolution, sharpen detail, refine soft natural light. "
    "Replace the background with a soft warm cream studio backdrop with subtle pastel pink and pale blue ambient lighting "
    "from a diffused window light source on her left. Premium editorial magazine quality. "
    "Add subtle bokeh in the background. Vertical 3:4 framing, head and shoulders, centered. "
    "Hyper-realistic, no text, no logos, no watermarks."
)

def main():
    img_bytes = INPUT.read_bytes()
    payload = {
        "contents": [{"parts": [
            {"text": PROMPT},
            {"inlineData": {"mimeType": "image/jpeg", "data": base64.b64encode(img_bytes).decode()}}
        ]}],
        "generationConfig": {"responseModalities": ["IMAGE"]},
    }
    req = urllib.request.Request(
        URL, data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    print(f"Enhancing founder portrait via {MODEL}...")
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            data = json.loads(r.read())
    except urllib.error.HTTPError as e:
        sys.exit(f"HTTP {e.code}: {e.read()[:300].decode(errors='ignore')}")
    parts = (data.get("candidates", [{}])[0].get("content", {}) or {}).get("parts", [])
    img_parts = [p for p in parts if "inlineData" in p]
    if not img_parts:
        sys.exit(f"No image returned: {json.dumps(data)[:300]}")
    raw = base64.b64decode(img_parts[0]["inlineData"]["data"])
    OUTPUT.write_bytes(raw)
    print(f"✓ {time.time()-t0:.1f}s · {len(raw):,}b → {OUTPUT}")

if __name__ == "__main__":
    main()
