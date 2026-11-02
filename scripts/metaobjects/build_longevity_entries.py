"""Сглобява записите на /page/longevity-bactology от сегашния HTML на страницата.

Вход: HTML-ът от блока „Код“ на страница 102 (конструктора).
Изход: JSON със записите (по ред на създаване) и Markdown за преглед.
Текстовете се вземат дума по дума от страницата; нищо не се преписва на ръка.
"""
import json
import re
import sys

from bs4 import BeautifulSoup, NavigableString

SRC, OUT_JSON, OUT_MD = sys.argv[1:4]
SITE = "https://bulgarbiotic.bg"

# Файлове (Настройки → Файлове), проверени по име на 27.10.2026.
FILES = {
    "longevity-hero.jpg": "37282",
    "longevity-intro.jpg": "37270",
    "longevity-hepato-care.jpg": "37278",
    "longevity-hepato-care.mp4": "37279",
    "longevity-hepato-video-poster.jpg": "37281",
    "longevity-menopause-balance.jpg": "37287",
    "longevity-longevity-cellular.jpg": "37284",
    "longevity-longevity-cellular.mp4": "37286",
    "longevity-cellular-video-poster.jpg": "37277",
    "longevity-bundle-her-evolution-40.jpg": "37273",
    "longevity-bundle-vatreshen-restart.jpg": "37274",
}
PRODUCTS = {
    "bactology-hepato-care": "152",
    "bactology-menopause-balance": "155",
    "bactology-longevity-cellular": "158",
    "bactology-her-evolution-40": "160",
    "bactology-vatreshen-restart": "162",
}
COLOR = {"sage": "маслинено", "rose": "розово", "lilac": "лилаво", "hepato": "маслинено",
         "menopause": "розово", "cellular": "лилаво"}

soup = BeautifulSoup(open(SRC, encoding="utf-8").read(), "html.parser")
entries = []


def clean(s):
    return re.sub(r"\s+", " ", s).strip()


def text(el):
    return clean(el.get_text(" ")) if el else ""


def lines(el):
    """Текст с редовете, разделени от <br>."""
    parts, cur = [], ""
    for node in el.descendants:
        if isinstance(node, NavigableString):
            cur += str(node)
        elif node.name == "br":
            parts.append(clean(cur)); cur = ""
    parts.append(clean(cur))
    return "\n".join(p for p in parts if p)


def file_gid(src):
    name = src.split("/")[-1].split("?")[0]
    return f"gid://cloudcart/File/{FILES[name]}"


def rich(*els):
    """HTML → дървото на форматирания текст. Всеки <br> и всеки елемент е нов абзац."""
    paragraphs = []
    for el in els:
        runs = []

        def walk(node, italic=False, bold=False):
            for ch in node.children:
                if isinstance(ch, NavigableString):
                    v = re.sub(r"\s+", " ", str(ch))
                    if v.strip() or (v == " " and runs):
                        t = {"type": "text", "value": v}
                        if italic: t["italic"] = True
                        if bold: t["bold"] = True
                        runs.append(t)
                elif ch.name == "br":
                    runs.append("BR")
                elif ch.name == "svg":
                    continue
                else:
                    walk(ch, italic or ch.name in ("em", "i"), bold or ch.name in ("b", "strong"))

        walk(el)
        cur = []
        for r in runs + ["BR"]:
            if r == "BR":
                while cur and not cur[-1]["value"].strip():
                    cur.pop()
                if cur:
                    cur[0]["value"] = cur[0]["value"].lstrip()
                    cur[-1]["value"] = cur[-1]["value"].rstrip()
                    paragraphs.append({"type": "paragraph", "children": cur})
                cur = []
            else:
                cur.append(r)
    return json.dumps({"type": "root", "children": paragraphs}, ensure_ascii=False)


def link(label, href):
    return json.dumps({"text": label, "url": SITE + href if href.startswith("/") else href}, ensure_ascii=False)


def add(type_, handle, fields, title):
    fields = {k: v for k, v in fields.items() if v not in (None, "", [])}
    for k, v in list(fields.items()):
        if isinstance(v, list):
            fields[k] = json.dumps(v, ensure_ascii=False)
    entries.append({"type": type_, "handle": handle, "title": title, "fields": fields})
    return f"@{type_}:{handle}"


# ---- Числа под въведението ----
stats = []
for st in soup.select("section.intro .intro-stats .stat"):
    value, label = text(st.select_one(".num-v")), text(st.select_one(".lbl"))
    stats.append(add("item", f"longevity-stat-{value}",
                     {"admin_name": f"Longevity – число {value}", "value": value, "label": label},
                     f"Число: {value} · {label}"))

# ---- Стъпките на ритуала ----
steps = []
for i, st in enumerate(soup.select("section.routine .r-step"), 1):
    dot = st.select_one(".r-dot").get("style", "")
    color = next((v for k, v in COLOR.items() if f"--{k}" in dot), None)
    steps.append(add("item", f"longevity-step-{i}",
                     {"admin_name": f"Longevity – ритуал {i}", "label": text(st.select_one(".r-time")),
                      "title": text(st.h3), "text": text(st.p), "color": color},
                     f"Стъпка {i}: {text(st.select_one('.r-time'))} · {text(st.h3)}"))

# ---- Предимствата ----
trust = []
for i, it in enumerate(soup.select("section.trust .trust-item"), 1):
    trust.append(add("item", f"longevity-trust-{i}",
                     {"admin_name": f"Longevity – предимство {i}", "title": text(it.h4), "text": text(it.p)},
                     f"Предимство {i}: {text(it.h4)}"))

# ---- Трите продукта ----
products = []
for sec in soup.select("section.product"):
    kind = [c for c in sec["class"] if c in ("hepato", "menopause", "cellular")][0]
    href = sec.select_one("a.p-frame-link")["href"]
    handle = href.rsplit("/", 1)[-1]
    video = sec.select_one("video")
    eyebrow = re.sub(r"^\s*\d+\s*/\s*", "", text(sec.select_one(".p-eyebrow")))
    products.append(add("product_block", f"longevity-{kind}", {
        "admin_name": f"Longevity – {text(sec.select_one('.p-title'))}",
        "product": f"gid://cloudcart/Product/{PRODUCTS[handle]}",
        "image": file_gid(sec.select_one(".p-frame img")["src"]),
        "video": file_gid(video["src"]) if video else None,
        "video_poster": file_gid(video["poster"]) if video else None,
        "video_caption": text(sec.select_one(".p-video-caption")),
        "eyebrow": eyebrow,
        "heading": rich(sec.select_one(".p-title")),
        "tagline": text(sec.select_one(".p-tag")),
        "text": rich(sec.select_one(".p-desc")),
        "benefits": [text(li) for li in sec.select(".p-list li")],
        "pills": [text(p) for p in sec.select(".p-pills .pill")],
        "badge_value": text(sec.select_one(".p-badge-float .n")),
        "badge_label": text(sec.select_one(".p-badge-float .t")),
        "sticker": lines(sec.select_one(".p-sticker")),
        "button_label": text(sec.select_one("button")),
        "color": COLOR[kind],
    }, f"Продукт: {text(sec.select_one('.p-title'))}"))

# ---- Двата пакета ----
bundles = []
for i, card in enumerate(soup.select("section.cta .bundle-card"), 1):
    href = card.select_one("a.bundle-card-img")["href"]
    handle = href.rsplit("/", 1)[-1]
    bundles.append(add("product_block", f"longevity-bundle-{i}", {
        "admin_name": f"Longevity – пакет {text(card.select_one('.bundle-card-title em'))}",
        "product": f"gid://cloudcart/Product/{PRODUCTS[handle]}",
        "image": file_gid(card.select_one(".bundle-card-img img")["src"]),
        "eyebrow": text(card.select_one(".bundle-card-eyebrow")),
        "heading": rich(card.select_one(".bundle-card-title")),
        "subtitle": text(card.select_one(".bundle-card-sub")),
        "tagline": text(card.select_one(".bundle-card-tagline")),
        "text": rich(*card.select(".bundle-card-desc")),
        "button_label": text(card.select_one("button")),
        "color": "корал",
    }, f"Пакет: {text(card.select_one('.bundle-card-title'))}"))

# ---- Секциите ----
hero = soup.select_one("header.hero")
cta = hero.select_one(".hero-cta a")
s_hero = add("section_hero", "longevity-hero", {
    "admin_name": "Longevity – начален банер",
    "image": file_gid(hero.select_one("img.hero-img")["src"]),
    "title": "\n".join(text(l) for l in hero.select(".hero-title .line")),
    "subtitle": lines(hero.select_one(".hero-sub")),
    "button": link(text(cta), cta["href"]),
    "scroll_label": text(hero.select_one(".hero-scroll span")),
}, "Начален банер")

items, seen = [], set()
for sp in soup.select(".marquee .marquee-track span"):
    t = text(sp)
    if t not in seen:
        seen.add(t); items.append(t)
s_marquee = add("section_marquee", "longevity-marquee",
                {"admin_name": "Longevity – бягаща лента", "items": items}, "Бягаща лента")

intro = soup.select_one("section.intro")
s_intro = add("section_text_media", "longevity-intro", {
    "admin_name": "Longevity – философията",
    "eyebrow": text(intro.select_one(".eyebrow")),
    "heading": rich(intro.h2),
    "text": rich(intro.select_one(".lng-rv > p")),
    "image": file_gid(intro.select_one(".intro-photo-frame img")["src"]),
    "image_side": "дясно",
    "stats": stats,
}, "Текст със снимка: Философията")

routine = soup.select_one("section.routine")
s_routine = add("section_cards", "longevity-routine", {
    "admin_name": "Longevity – ритуал",
    "eyebrow": text(routine.select_one(".eyebrow")),
    "heading": rich(routine.h2),
    "text": rich(routine.select_one(".routine-head p")),
    "layout": "стъпки",
    "items": steps,
}, "Карти: Един ритуал, три формули")

s_trust = add("section_cards", "longevity-trust", {
    "admin_name": "Longevity – предимства", "layout": "предимства", "items": trust,
}, "Карти: предимства")

cta_sec = soup.select_one("section.cta")
s_offers = add("section_offers", "longevity-offers", {
    "admin_name": "Longevity – пакети",
    "eyebrow": text(cta_sec.select_one(".eyebrow")),
    "heading": rich(cta_sec.h2),
    "text": rich(cta_sec.select_one(".wrap > p")),
    "offers": bundles,
}, "Оферти: пакетите")

bar = soup.select_one("#stickyBar")
add("landing_page", "longevity-bactology", {
    "title": "Longevity Серия",
    "seo_title": "Longevity Серия | Bactology",
    "seo_description": "Longevity Серия | Bactology",
    "sections": [s_hero, s_marquee, s_intro, *products, s_routine, s_trust, s_offers],
    "sticky_text": rich(bar.select_one(".sb-text")),
    "sticky_button": link(text(bar.select_one("a")), bar.select_one("a")["href"]),
    "footnote": text(soup.select_one(".foot-note")),
}, "Страница: Longevity Серия")

json.dump(entries, open(OUT_JSON, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

# ---- Преглед ----
NAMES = {"item": "Елемент", "product_block": "Продукт", "section_hero": "Начален банер",
         "section_marquee": "Бягаща лента", "section_text_media": "Текст със снимка",
         "section_cards": "Карти", "section_offers": "Оферти", "landing_page": "Страница"}
FILE_NAMES = {v: k for k, v in FILES.items()}
PRODUCT_NAMES = {v: k for k, v in PRODUCTS.items()}
TITLES = {f"@{e['type']}:{e['handle']}": e["title"] for e in entries}


def show(v):
    try:
        data = json.loads(v)
    except (json.JSONDecodeError, TypeError):
        data = v
    if isinstance(data, dict) and data.get("type") == "root":
        out = []
        for p in data["children"]:
            out.append("".join(f"*{c['value']}*" if c.get("italic") else f"**{c['value']}**" if c.get("bold") else c["value"]
                               for c in p["children"]))
        return " ⏎ ".join(out)
    if isinstance(data, dict) and "url" in data:
        return f"{data['text']} → {data['url']}"
    if isinstance(data, list):
        return " · ".join(show(x) for x in data)
    s = str(data)
    if s.startswith("gid://cloudcart/File/"):
        return "файл " + FILE_NAMES[s.rsplit("/", 1)[-1]]
    if s.startswith("gid://cloudcart/Product/"):
        return "продукт " + PRODUCT_NAMES[s.rsplit("/", 1)[-1]]
    if s.startswith("@"):
        return "→ " + TITLES[s]
    return s.replace("\n", " ⏎ ")


md = ["# Записите на Longevity (за преглед)", "",
      f"{len(entries)} записа, в реда, в който се създават. ⏎ = нов ред; *курсив*, **удебелено** както на страницата.", ""]
for n, e in enumerate(entries, 1):
    md.append(f"## {n}. {NAMES[e['type']]} – {e['title']}  (`{e['handle']}`)")
    md.append("")
    md.append("| Поле | Стойност |")
    md.append("| --- | --- |")
    for k, v in e["fields"].items():
        md.append(f"| {k} | {show(v).replace('|', '/')} |")
    md.append("")
open(OUT_MD, "w", encoding="utf-8").write("\n".join(md))
print(len(entries), "записа")
