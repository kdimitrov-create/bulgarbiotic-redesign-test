#!/usr/bin/env python3
"""
Generate editorial cover images for Bactology blog articles via Gemini 3 Pro Image.

Each article gets a custom prompt tuned to its topic so the visual matches the
content. Same pastel brand palette as homepage product photography (cream, pink,
blue) for cohesive visual identity across PDP + Blog.

Outputs to public/images/articles/{handle}.png — referenced by
app/lib/article-images.ts via the `enhancedFilename` field.

Usage:
  python3 scripts/gen-article-images.py            # generate everything missing
  python3 scripts/gen-article-images.py handle1    # regenerate one
"""
import os, sys, json, base64, time, urllib.request, urllib.error
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

# ── Setup ──
API_KEY = None
ENV_PATH = Path(__file__).parent.parent / ".env"
for line in ENV_PATH.read_text().splitlines():
    if line.startswith("GEMINI_API_KEY="):
        API_KEY = line.split("=", 1)[1].strip().strip('"').strip("'")
        break
if not API_KEY:
    sys.exit("Need GEMINI_API_KEY in .env")

MODEL = "gemini-3-pro-image-preview"
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={API_KEY}"
OUT_DIR = Path(__file__).parent.parent / "public" / "images" / "articles"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Shared style — same pastel palette as homepage product photos so the blog
# feels visually continuous with the rest of the site.
STYLE = (
    "Editorial wellness magazine photography. Soft warm pastel palette of "
    "warm cream beige (#F5EFE3), pale dusty blush pink (#F4D6E0), and pale "
    "dusty blue (#D5E3EE). Soft diffused natural morning light, subtle haze. "
    "Hyper-detailed, premium magazine quality, shallow depth of field, "
    "minimalist composition. No visible text, no logos, no watermarks, no "
    "people's faces directly visible. Wide horizontal 16:9 framing."
)

# Per-article custom prompt. Key = article handle (matches app/lib/article-images.ts).
# Value = topical scene description (style is auto-prepended).
ARTICLES = {
    # ── Recipes / food ──
    "barcheta-s-probiotichni-perli": (
        "Stacked chocolate-coated protein bars topped with crushed nuts on a cream "
        "linen surface. Soft pink and blue light. Editorial food styling."
    ),
    "fstcheni-barcheta-s-probiotik": (
        "Peanut-butter & chocolate energy bars cut open on cream parchment paper, "
        "crushed peanuts scattered around. Warm morning light. Wholesome editorial food."
    ),
    "mini-palachinki-s-izvara-i-probiotici": (
        "Stack of mini cottage-cheese pancakes drizzled with honey on a cream "
        "ceramic plate, fresh berries scattered. Soft morning light, blush pink napkin."
    ),
    "probiotic-chocolate-overnight-oats": (
        "Glass jar of overnight oats with chocolate drizzle and fresh raspberries on "
        "top, cream linen background, vintage spoon. Editorial breakfast styling."
    ),
    "triple-chocolate-cookie-dough": (
        "Cream ceramic bowl of edible triple-chocolate cookie dough with chocolate "
        "chunks, on warm beige linen. Soft pink afternoon light, decadent feel."
    ),
    "fit-tiramisu": (
        "Glass jars of layered healthy tiramisu with cocoa dust on top, on cream "
        "linen. Soft pink natural light, vintage spoons, elegant Italian café feel."
    ),
    "zdravoslovna-zakuska-s-femin": (
        "Healthy breakfast bowl with yogurt, berries, granola, and rose petals on "
        "cream linen. Pink Bactology Femin notes (no logo). Editorial breakfast."
    ),
    "vegan-sladoled-s-probiotichni-perli": (
        "Vegan ice cream scoops in a cream ceramic bowl topped with chocolate pearls. "
        "Soft pink and cream styling, summer afternoon light, beach picnic vibes."
    ),
    "oshte-edna-vkusna-recepta-s-shoko-perli": (
        "Chocolate pearls scattered on cream surface next to dessert with whipped "
        "cream and berries. Editorial food magazine styling, soft morning light."
    ),

    # ── Health conditions / digestion ──
    "gazove-v-chervata": (
        "Abstract wellness composition: cream ceramic bowl of fresh herbs (mint, "
        "fennel), digestive tea in glass cup, soft morning light. Calming, healing feel."
    ),
    "sindrom-na-razdraznenoto-debelo-chervo": (
        "Anatomical wellness illustration concept: cream linen background with "
        "ginger root, peppermint leaves, chamomile flowers arranged minimally. "
        "Soft healing light."
    ),
    "probiotik-pri-divertikulit": (
        "Cream ceramic mug of golden turmeric tea, fresh ginger root and turmeric "
        "slices on a wooden board, eucalyptus leaves. Healing wellness aesthetic."
    ),
    "probiotici-za-propusklivi-cherva": (
        "Cross-section of a fresh papaya alongside green leafy vegetables and a "
        "glass of fermented kombucha on cream linen. Gut-health editorial."
    ),
    "barzo-reshenie-pri-zapek-10-provereni-nachina-za-nezabavno-oblekchenie": (
        "Glass of warm water with lemon slices, fresh prunes and figs on cream "
        "linen, eucalyptus sprigs. Soft morning light, gentle wellness mood."
    ),
    "tejest-v-korema-kak-da-se-spravim-barzo-i-efektivno": (
        "Cream cup of chamomile tea with fresh chamomile flowers next to a small "
        "ceramic bowl of fennel seeds. Morning healing light, calming editorial."
    ),
    "kakvo-da-yadem-pri-podut-korem-i-gazove": (
        "Wellness ingredient flatlay: ginger, mint, fennel, banana, oats on cream "
        "linen. Top-down minimalist composition, soft morning light."
    ),
    "10-prichini-za-poduvane-na-korema-pri-jenite-kak-da-se-spravim": (
        "Abstract wellness scene: cream ceramic teapot pouring herbal tea into a "
        "cup, fresh herbs (mint, ginger) scattered around. Calming, feminine."
    ),
    "zadarjane-na-voda-kak-da-se-spravim-s-problema-lesno-i-efektivno": (
        "Glass pitcher of cucumber water with mint leaves, fresh cucumber slices "
        "on cream linen, soft morning light. Hydration wellness editorial."
    ),
    "probiotik-pri-razstroystvo": (
        "Cream ceramic bowl of plain yogurt with a swirl of honey and a sprig of "
        "mint, on cream linen with eucalyptus. Gentle healing food photography."
    ),
    "probiotici-pri-kiselini": (
        "Glass of fresh aloe vera juice with lemon slices and ginger on cream "
        "linen, soft morning sunlight. Soothing wellness aesthetic."
    ),

    # ── Ingredients / probiotic education ──
    "kakvo-sa-prebioticite-i-kak-podobryavat-hranosmilaneto": (
        "Wooden board with prebiotic-rich foods: garlic, onions, asparagus, bananas, "
        "oats, on cream linen. Educational ingredient flatlay, morning light."
    ),
    "disbioza-disbakterioza": (
        "Abstract scientific composition: glass petri dish with pastel bacteria "
        "illustration, soft pink and blue gradient background, minimalist scientific."
    ),
    "teleshka-kolastra-estestvena-podkrepa-za-imuniteta-i-cyalostnoto-zdrave": (
        "Glass bottle of golden milk-like liquid (colostrum) next to a copper "
        "scoop on cream linen, with soft morning sunlight from window left."
    ),
    "riben-kolagen-superproteinat-za-krasota-zdrave-i-jiznenost": (
        "Glass jar of collagen powder, scattered fish scales arranged artistically, "
        "soft pink and blue marine palette on cream linen. Beauty supplement editorial."
    ),
    "biotin-vitamin-b7-malkiyat-vitamin-s-golyamo-znachenie-za-kosata-kojata-i-noktite": (
        "Cream ceramic bowl of biotin-rich foods: walnuts, eggs, avocado slices, "
        "on cream linen. Beauty nutrition flatlay, soft morning light."
    ),
    "roza-damascena-taynata-na-jenskata-krasota-balans-i-dalgoletie": (
        "Cluster of fresh Bulgarian damask rose petals scattered around a small "
        "amber glass vial of rose oil on cream linen. Pink romantic editorial."
    ),

    # ── Beauty / lifestyle ──
    "top-10-saveta-kak-da-podobrish-metabolizma-si": (
        "Sneakers next to a water bottle and small dumbbells on cream linen, "
        "with eucalyptus sprigs. Active wellness lifestyle, soft morning light."
    ),
    "top-5-uprajneniya-za-korem-u-doma-za-stegnato-i-silno-tyalo": (
        "Cream yoga mat rolled out next to a small ceramic plant pot and water "
        "bottle on hardwood floor. Soft morning light streaming in from window."
    ),
    "top-10-saveta-kak-da-namalish-zadarjaneto-na-technosti": (
        "Glass pitcher of detox water with cucumber, lemon, and mint on cream "
        "linen, glass cups beside. Hydration editorial, morning light."
    ),
    "bactology-femin-shtipka-uverenost-za-lyatoto-i-ne-samo": (
        "Beach-ready scene: cream straw hat, pink linen scarf, and small ceramic "
        "bowls of strawberries on cream linen blanket. Summer feminine vibes."
    ),
    "bactology-femin-za-edno-spokoyno-lyato-bez-vaginalni-problemi": (
        "Pink peony flowers in a cream ceramic vase next to a glass of rose water "
        "on cream linen. Soft feminine wellness editorial, gentle morning light."
    ),
    "vaginalni-infekcii-i-prilojenie-na-probiotici": (
        "Pink peonies and white roses arranged on cream linen with small glass "
        "bottles of essential oil. Soft feminine intimate-care editorial."
    ),
    "kolko-chesto-e-dobre-jenata-da-poseshtava-ginekolog": (
        "Abstract feminine wellness: pink and cream flowers in soft morning light, "
        "a calendar and a cup of tea in background. Calming editorial."
    ),
    "mogat-li-probioticite-da-pomognat-za-upravlenieto-na-simptomite-na-menopauza": (
        "Cluster of dried lavender and roses next to a cream ceramic mug of "
        "herbal tea on linen. Soft warm light, mature feminine wellness."
    ),

    # ── Family / kids / pregnancy ──
    "probiotik-za-deca-pri-povrashtane": (
        "Small cream ceramic bowl of plain yogurt with banana slices and a child's "
        "wooden spoon on cream linen. Gentle parenting wellness, soft morning light."
    ),
    "bactology-babies-kids-probiotichni-perli-s-mlechen-shokolad-za-silen-detski-imunitet": (
        "Cream ceramic dish of chocolate pearls next to a child's wooden toy and "
        "small flowers on cream linen. Tender child-care editorial."
    ),
    "probioticite-neizmenen-pomoshtnik-po-vreme-na-bremennost-i-sled-rajdane": (
        "Soft cream-colored baby blanket folded on linen with small pink rosebuds "
        "and a cream ceramic mug. Tender pregnancy editorial, morning light."
    ),
    "blagodarya-ti-mamo": (
        "Mother's hands holding a small bouquet of pink peonies on cream linen, "
        "abstract framing without showing face. Tender motherhood editorial."
    ),
    "da-vazpitame-polezni-navici-u-deteto-s-bactojoy": (
        "Cream ceramic bowl of colorful fresh fruits (berries, banana, apple) and "
        "a child's wooden spoon on cream linen. Healthy kids food editorial."
    ),
    "zdravoslovno-vkusno-i-lyubimo-na-decata-shto-e-to-1": (
        "Cream tray with colorful berry parfait jars and granola, soft morning "
        "light, child-friendly healthy snacks editorial."
    ),

    # ── Travel / lifestyle / brand awards ──
    "otkriyte-chara-na-parij-s-bulgar-biotik": (
        "Parisian café table scene: cream coffee cup, small croissant on cream "
        "linen napkin, Eiffel Tower out of focus in pink-blue sunset background."
    ),
    "vlez-vav-forma-s-bulgar-biotik-i-razhodi-novo-tyalo-po-plajovete-v-dubay": (
        "Beach scene: cream-colored sun hat and pink linen wrap on golden sand, "
        "with palm tree shadow. Luxury Dubai resort vibes, soft pink sunset light."
    ),
    "bulgar-biotik-e-nay-dobriyat-balgarski-brand-za-probiotici-za-2025-g": (
        "Elegant cream ceramic award statuette on cream linen with small pink "
        "rose petals scattered. Award ceremony aesthetic, soft golden hour light."
    ),
    "nay-dobrite-balgarski-probiotici-bactojoy-s-nagrada-za-farma-brand-na-godinata": (
        "Stack of pharmacy awards or rosette ribbons on cream linen surface, "
        "fresh rose petals, soft pink warm sunset light. Award ceremony editorial."
    ),
    "marieta-zaharieva-biznesat-s-probiotici-mi-dade-drug-pogled-kam-sveta-i-horata": (
        "Notebook and a cream coffee cup on a wooden desk by window, soft morning "
        "light, fresh pink roses in cream vase. Founder lifestyle, no faces visible."
    ),
    "nie-sme-brand-koyto-sachetava-nauka-balgarska-tradiciya-i-choveshki-podhod": (
        "Bulgarian rose field at golden hour with mist over hills, pale pink and "
        "warm cream sky. Aspirational landscape, no text, dreamy editorial."
    ),
    "bulgarbiotik-vdahnovenie-ot-tradiciite-i-prirod": (
        "Traditional Bulgarian embroidered linen cloth with fresh pink rose petals "
        "and a small ceramic bowl of rose water. Heritage wellness editorial."
    ),

    # ── Probiotics general / education ──
    "probiotici-i-zdrave": (
        "Glass jar of homemade yogurt on cream linen surrounded by fresh berries "
        "and a cream ceramic spoon. Editorial wellness food photography."
    ),
    "probiotikat-bactojoy-immune-complex-predpazva-ot-covid-19": (
        "Cluster of fresh citrus fruits (lemons, oranges) and ginger root on cream "
        "linen, with a glass of warm honey-lemon water. Immunity wellness."
    ),
    "uchenite-sa-kategorichni-probioticite-mogat-da-ni-predpazyat-ot-covid-19": (
        "Glass petri dish with abstract pastel bacterial illustration, scientific "
        "instruments out of focus, cream linen background. Editorial science."
    ),
    "rolyata-na-probioticite-v-prevenciyata-i-lechenieto-na-autizma": (
        "Soft abstract wellness: cream ceramic vase with white flowers, sunlight "
        "filtering through, gentle and hopeful mood. Calm editorial."
    ),
    "kak-da-izbegnem-letnite-virusi-s-bactology-ste-edna-krachka-napred": (
        "Glass of fresh citrus juice with lemon and orange wedges, summer fruits "
        "on cream linen, soft sunny morning light. Summer immunity editorial."
    ),
    "kak-da-izbegnem-letnite-nerazpolojeniya-s-pomoshtta-na-probioticite": (
        "Cream tray with sliced watermelon, fresh mint, and a glass pitcher of "
        "infused water. Summer wellness flatlay, soft natural light."
    ),
    "koga-se-pie-probiotik-predi-ili-sled-antibiotika": (
        "Glass of water and a small cream ceramic dish next to a clock face on "
        "cream linen. Minimal editorial composition about timing."
    ),
    "leten-virus-li-s-bactojoy-mojete-da-badete-spokoyni": (
        "Cream linen scene with fresh oranges cut in half, lemon, ginger, and "
        "mint leaves. Summer immunity editorial, soft warm morning light."
    ),
    "mogat-li-dobrite-bakterii-da-ni-pomognat-v-ejednevnata-borba-sas-stresa-i-ima-li-vrazka-mejdu-chrevn": (
        "Abstract calming scene: cream ceramic mug of herbal tea, eucalyptus "
        "sprigs, and a small notebook on cream linen. Stress-relief editorial."
    ),
    "za-barnauta-za-edin-taen-chat-i-za-silata-na-bakteriite": (
        "Two cream coffee mugs on a wooden table with morning sunlight, an open "
        "notebook between them. Conversational warm cozy editorial."
    ),

    # ── Weight / fitness ──
    "probioticite-magicheskiyat-pomoshtnik-v-borbata-s-izlishnite-kilogrami": (
        "Cream linen flatlay: measuring tape arranged elegantly, glass of water "
        "with lemon, small dumbbells. Weight-loss wellness editorial."
    ),
    "iskash-da-otslabnesh-probioticite-idvat-na-pomosht": (
        "Cream yoga mat with measuring tape and a glass of green smoothie, fresh "
        "mint leaves scattered. Fitness wellness editorial."
    ),
    "sboguvay-se-s-izlishnite-kilogrami-s-bactojoy": (
        "Pair of pastel sneakers on cream linen with a water bottle and resistance "
        "band, soft morning light. Active lifestyle wellness."
    ),
    "otslabvaneto-lesno-i-priyatno-s-bactojoy": (
        "Cream ceramic bowl of vibrant Buddha-bowl-style salad with quinoa, "
        "avocado, berries on cream linen. Healthy eating editorial."
    ),

    # ── Dental / specialty ──
    "za-zdravi-zabi-i-venci-s-bactojoy": (
        "Wooden toothbrush and natural toothpaste tube on cream marble surface "
        "with mint leaves and fresh berries. Dental wellness editorial."
    ),
    "bactology-noviyat-nay-dobar-priyatel-na-detskite-zabki": (
        "Children's wooden toothbrush on cream marble with a small cream ceramic "
        "cup and fresh apple slices. Kids dental wellness."
    ),
    "probiotik-za-gabichki-v-ustata-kak-da-varnem-estestveniya-balans": (
        "Cream ceramic mug of green tea with fresh mint and lemon on cream linen. "
        "Oral wellness editorial, soft morning light."
    ),

    # ── Specific brand / Bactojoy ──
    "bactojoy-golyamata-strast-na-balgarskite-znamenitosti": (
        "Elegant pink rose petals scattered on cream linen with a champagne glass, "
        "celebrity glamour editorial, soft golden hour light."
    ),
    "misis-balgariya-zadelya-sredstva-ot-prodajbata-na-produktite-bactojoy-za-fondaciya-iskam-bebe": (
        "Soft pink baby items on cream linen: tiny cream booties, pink ribbon, "
        "small bouquet of pink rosebuds. Tender charity editorial."
    ),
    "15-septemvri-nablijava-povishete-imuniteta-na-deteto-s-bactojoy": (
        "Back-to-school scene: cream notebook, wooden pencils, apple, and a small "
        "ceramic cup on cream linen. Morning sunlight, parenting wellness."
    ),
    "ne-na-gazovete-i-podutiya-korem-s-bactojoy-gastro-balance": (
        "Cream ceramic teacup with chamomile flowers and a small bowl of fennel "
        "seeds, on cream linen. Soothing digestive wellness."
    ),
    "zabravete-za-zapeka-i-se-radvayte-na-jivota-s-bactojoy-gastro-balance": (
        "Glass of warm lemon water with mint, fresh prunes and figs on cream "
        "ceramic plate. Gentle digestive wellness editorial."
    ),
    "proletna-grija-za-damite-s-bactojoy-femin": (
        "Spring scene with pink cherry blossoms and a cream ceramic teacup on "
        "linen. Feminine spring wellness, soft warm light."
    ),
    "pokorihme-germaniya": (
        "European travel scene: cream linen with a postcard, small bouquet of "
        "wildflowers, soft morning Bavarian light. Aspirational travel editorial."
    ),
    "bakteriii-i-gabichki-probioticite-znayat-kak-da-se-spravyat-s-tyah": (
        "Abstract scientific wellness composition: glass petri dish with pastel "
        "soft bacteria illustration, on cream linen. Minimalist scientific editorial."
    ),
}


def call_api(item):
    handle, prompt_extra = item
    out = OUT_DIR / f"{handle}.png"
    if out.exists():
        return (handle, True, "skip (exists)", 0)
    full_prompt = STYLE + " " + prompt_extra
    payload = {
        "contents": [{"parts": [{"text": full_prompt}]}],
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
        return (handle, False, f"HTTP {e.code}: {e.read()[:200].decode(errors='ignore')}", time.time() - t0)
    except Exception as e:
        return (handle, False, f"err: {e}", time.time() - t0)
    elapsed = time.time() - t0
    out_parts = (data.get("candidates", [{}])[0].get("content", {}) or {}).get("parts", [])
    img_parts = [p for p in out_parts if "inlineData" in p]
    if not img_parts:
        return (handle, False, f"no image: {json.dumps(data)[:200]}", elapsed)
    raw = base64.b64decode(img_parts[0]["inlineData"]["data"])
    out.write_bytes(raw)
    return (handle, True, f"{len(raw):,}b", elapsed)


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    items = list(ARTICLES.items())
    if only:
        items = [(h, p) for h, p in items if only in h]
    print(f"Generating {len(items)} article images via {MODEL}")
    print(f"Out: {OUT_DIR}")
    print()
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=6) as ex:
        results = list(ex.map(call_api, items))
    print(f"\nTotal elapsed: {time.time() - t0:.1f}s\n")
    ok = sum(1 for _, success, *_ in results if success)
    for handle, success, msg, elapsed in results:
        flag = "✓" if success else "✗"
        print(f"  {flag} [{elapsed:5.1f}s] {handle[:60]:60} {msg}")
    print(f"\n{ok}/{len(results)} successful")


if __name__ == "__main__":
    main()
