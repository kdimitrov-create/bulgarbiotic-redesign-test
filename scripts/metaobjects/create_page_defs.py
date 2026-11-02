"""Създава 8-те дефиниции на метаобекти за страниците (docs/PAGE-SECTIONS-MODEL.md).

Пуска се веднъж. Спира при първата грешка. Пропуска тип, който вече съществува.
"""
import json
import subprocess
import sys

STORE = "bulgarbiotic.bg"
OUT = sys.argv[1]  # файл, в който се записват създадените id-та

MUTATION = """mutation CreateDef($definition: MetaobjectDefinitionCreateInput!) {
  metaobjectDefinitionCreate(definition: $definition) {
    metaobjectDefinition { id type name displayNameKey }
    userErrors { field code message }
  }
}"""

COLORS = ["маслинено", "розово", "лилаво", "корал"]
ICONS = ["няма", "капсула", "щит", "колба", "лист", "бактерия", "сърце", "звезда", "отметка"]


def run(query, variables=None):
    cmd = ["cloudcart", "app", "execute", "-s", STORE, "--json", "-q", query]
    if variables is not None:
        cmd += ["-v", json.dumps(variables, ensure_ascii=False)]
    res = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    try:
        return json.loads(res.stdout)
    except json.JSONDecodeError:
        sys.exit(f"Неразбираем отговор:\n{res.stdout}\n{res.stderr}")


def f(key, name, type_, required=False, **validations):
    field = {"key": key, "name": name, "type": type_}
    if required:
        field["required"] = True
    vals = []
    for vname, value in validations.items():
        vname = vname.replace("__", ".")
        vals.append({"name": vname, "value": value if isinstance(value, str) else json.dumps(value, ensure_ascii=False)})
    if vals:
        field["validations"] = vals
    return field


def admin_name():
    return f("admin_name", "Име в админа", "single_line_text_field")


def image(key, name):
    return f(key, name, "file_reference", file_type_options=["Image"])


existing = run("{ metaobjectDefinitions(first: 100) { nodes { id type } } }")
ids = {n["type"]: n["id"] for n in existing["data"]["metaobjectDefinitions"]["nodes"]}
gid = lambda t: f"gid://cloudcart/MetaobjectDefinition/{ids[t]}"

# Редът е важен: по-късните сочат към по-ранните.
steps = [
    lambda: {
        "type": "item", "name": "Елемент", "displayNameKey": "admin_name",
        "description": "Малка единица за числа, стъпки и предимства в секциите на страниците.",
        "fieldDefinitions": [
            admin_name(),
            f("value", "Стойност", "single_line_text_field"),
            f("label", "Етикет", "single_line_text_field"),
            f("title", "Заглавие", "single_line_text_field"),
            f("text", "Текст", "multi_line_text_field"),
            f("icon", "Иконка", "single_line_text_field", choices=ICONS),
            f("color", "Цвят", "single_line_text_field", choices=COLORS),
        ],
    },
    lambda: {
        "type": "product_block", "name": "Продукт", "displayNameKey": "admin_name",
        "description": "Продукт на страница: самостоятелна секция или карта в „Оферти“. Цената, адресът и бутонът идват от продукта.",
        "fieldDefinitions": [
            admin_name(),
            f("product", "Продукт", "product_reference", required=True),
            image("image", "Снимка"),
            f("video", "Видео", "file_reference", file_type_options=["Video"]),
            image("video_poster", "Корица на видеото"),
            f("video_caption", "Надпис под видеото", "single_line_text_field"),
            f("eyebrow", "Надзаглавие", "single_line_text_field"),
            f("heading", "Заглавие", "rich_text_field"),
            f("subtitle", "Подзаглавие", "single_line_text_field"),
            f("tagline", "Ред със съставки / мото", "single_line_text_field"),
            f("text", "Текст", "rich_text_field"),
            f("benefits", "Ползи", "list.single_line_text_field"),
            f("pills", "Етикети", "list.single_line_text_field"),
            f("badge_value", "Значка – число", "single_line_text_field"),
            f("badge_label", "Значка – надпис", "single_line_text_field"),
            f("sticker", "Стикер", "multi_line_text_field"),
            f("button_label", "Надпис на бутона", "single_line_text_field"),
            f("color", "Цвят", "single_line_text_field", choices=COLORS),
        ],
    },
    lambda: {
        "type": "section_hero", "name": "Начален банер", "displayNameKey": "admin_name",
        "fieldDefinitions": [
            admin_name(),
            image("image", "Снимка за компютър"),
            image("image_mobile", "Снимка за телефон"),
            f("title", "Заглавие", "multi_line_text_field"),
            f("subtitle", "Подзаглавие", "multi_line_text_field"),
            f("button", "Бутон", "link"),
            f("scroll_label", "Надпис за превъртане", "single_line_text_field"),
        ],
    },
    lambda: {
        "type": "section_marquee", "name": "Бягаща лента", "displayNameKey": "admin_name",
        "fieldDefinitions": [
            admin_name(),
            f("items", "Редове", "list.single_line_text_field"),
        ],
    },
    lambda: {
        "type": "section_text_media", "name": "Текст със снимка", "displayNameKey": "admin_name",
        "fieldDefinitions": [
            admin_name(),
            f("eyebrow", "Надзаглавие", "single_line_text_field"),
            f("heading", "Заглавие", "rich_text_field"),
            f("text", "Текст", "rich_text_field"),
            image("image", "Снимка"),
            f("image_side", "Страна на снимката", "single_line_text_field", choices=["ляво", "дясно"]),
            f("stats", "Числа", "list.metaobject_reference", metaobject_definition_id=gid("item")),
        ],
    },
    lambda: {
        "type": "section_cards", "name": "Карти", "displayNameKey": "admin_name",
        "fieldDefinitions": [
            admin_name(),
            f("eyebrow", "Надзаглавие", "single_line_text_field"),
            f("heading", "Заглавие", "rich_text_field"),
            f("text", "Текст", "rich_text_field"),
            f("layout", "Изглед", "single_line_text_field", choices=["стъпки", "предимства", "числа"]),
            f("items", "Карти", "list.metaobject_reference", metaobject_definition_id=gid("item")),
        ],
    },
    lambda: {
        "type": "section_offers", "name": "Оферти", "displayNameKey": "admin_name",
        "fieldDefinitions": [
            admin_name(),
            f("eyebrow", "Надзаглавие", "single_line_text_field"),
            f("heading", "Заглавие", "rich_text_field"),
            f("text", "Текст", "rich_text_field"),
            f("offers", "Оферти", "list.metaobject_reference", metaobject_definition_id=gid("product_block")),
        ],
    },
    lambda: {
        "type": "landing_page", "name": "Страница", "displayNameKey": "title",
        "description": "Страница от секции. Адресът (handle) на записа е адресът на страницата, напр. longevity-bactology. Чернова = страницата се показва както преди.",
        "fieldDefinitions": [
            f("title", "Заглавие", "single_line_text_field", required=True),
            f("seo_title", "SEO заглавие", "single_line_text_field"),
            f("seo_description", "SEO описание", "multi_line_text_field"),
            f("sections", "Секции", "list.mixed_reference", metaobject_definition_ids=[
                gid(t) for t in ("section_hero", "section_marquee", "section_text_media",
                                 "product_block", "section_cards", "section_offers")
            ]),
            f("sticky_text", "Лента долу – текст", "rich_text_field"),
            f("sticky_button", "Лента долу – бутон", "link"),
            f("footnote", "Бележка най-долу", "multi_line_text_field"),
        ],
    },
]

for build in steps:
    definition = build()
    t = definition["type"]
    if t in ids:
        print(f"= {t}: вече съществува ({ids[t]}), пропускам")
        continue
    answer = run(MUTATION, {"definition": definition})
    payload = (answer.get("data") or {}).get("metaobjectDefinitionCreate") or {}
    errors = payload.get("userErrors") or answer.get("errors")
    if errors:
        print(f"✗ {t}: {json.dumps(errors, ensure_ascii=False)}")
        break
    created = payload["metaobjectDefinition"]
    ids[t] = created["id"]
    print(f"✓ {t} → id {created['id']} „{created['name']}“ ({len(definition['fieldDefinitions'])} полета)")
    with open(OUT, "w") as fh:
        json.dump(ids, fh, ensure_ascii=False, indent=2)
