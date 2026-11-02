"""М.0: редакцията и Черновата, видени на самата страница (локалния сървър).

1. Добавя „ (тест)“ към заглавието на банера и засича кога страницата го показва.
   Така се вижда и че страницата наистина се рисува от записите.
2. Слага записа на страницата на Чернова: Storefront API трябва да върне null, а
   страницата да се покаже от конструктора (без „(тест)“, но с отговор 200).
3. Връща записа на Активна: „(тест)“ трябва да се върне.
4. Връща заглавието. Каквото и да стане, накрая записът е Активен със старото заглавие.

    python3 -I scripts/metaobjects/page_and_draft_test.py .env http://localhost:5173
"""
import json
import subprocess
import sys
import time

STORE = "bulgarbiotic.bg"
PAGE_TYPE, PAGE_HANDLE = "landing_page", "longevity-bactology"
HERO_TYPE, HERO_HANDLE, KEY = "section_hero", "longevity-hero", "title"
MARK = " (тест)"
POLL_S, LIMIT_S = 5, 15 * 60

env = {}
for line in open(sys.argv[1], encoding="utf-8"):
    if "=" in line and not line.lstrip().startswith("#"):
        k, v = line.strip().split("=", 1)
        env[k] = v.strip().strip("\"'")
ORIGIN, TOKEN = env["PUBLIC_API_ORIGIN"], env["PUBLIC_STOREFRONT_API_TOKEN"]
PAGE_URL = f"{sys.argv[2].rstrip('/')}/page/{PAGE_HANDLE}"

UPSERT = """mutation U($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
  metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
    metaobject { id updatedAt capabilities { publishable { status } } }
    userErrors { field code message }
  }
}"""


def log(msg):
    print(time.strftime("%H:%M:%S"), msg, flush=True)


def curl(*args):
    res = subprocess.run(["curl", "-sS", "--max-time", "30", *args],
                         capture_output=True, text=True, timeout=40, check=True)
    return res.stdout


def storefront(query):
    out = curl("-X", "POST", f"{ORIGIN}/api/sf", "-H", "Content-Type: application/json",
               "-H", f"X-Storefront-Access-Token: {TOKEN}", "--data", json.dumps({"query": query}))
    return json.loads(out)["data"]


def hero_title():
    q = '{ m: metaobject(handle:{type:"%s",handle:"%s"}){ field(key:"%s"){ value } } }' % (
        HERO_TYPE, HERO_HANDLE, KEY)
    return storefront(q)["m"]["field"]["value"]


def page_visible():
    q = '{ m: metaobject(handle:{type:"%s",handle:"%s"}){ handle } }' % (PAGE_TYPE, PAGE_HANDLE)
    return storefront(q)["m"] is not None


def upsert(type_, handle, metaobject, what):
    variables = {"handle": {"type": type_, "handle": handle}, "metaobject": metaobject}
    res = subprocess.run(
        ["cloudcart", "app", "execute", "-s", STORE, "--json", "-q", UPSERT,
         "-v", json.dumps(variables, ensure_ascii=False), "--timeout", "40"],
        capture_output=True, text=True, timeout=90)
    out = json.loads(res.stdout)["data"]["metaobjectUpsert"]
    if out["userErrors"]:
        raise RuntimeError(f"Грешка от админа ({what}): {out['userErrors']}")
    log(f"админ: {what}")


def set_title(value):
    upsert(HERO_TYPE, HERO_HANDLE, {"fields": [{"key": KEY, "value": value}]}, f"заглавие {value!r}")


def set_status(status):
    upsert(PAGE_TYPE, PAGE_HANDLE, {"capabilities": {"publishable": {"status": status}}},
           f"страницата е {status}")


def page_html():
    out = subprocess.run(["curl", "-sS", "--max-time", "60", "-w", "\n%{http_code}", PAGE_URL],
                         capture_output=True, text=True, timeout=70)
    body, _, code = out.stdout.rpartition("\n")
    return code, body


def wait_page(label, check):
    start = time.monotonic()
    while True:
        code, body = page_html()
        elapsed = time.monotonic() - start
        if code == "200" and check(body):
            log(f"страницата: {label} след {elapsed:.0f} s")
            return round(elapsed)
        if elapsed > LIMIT_S:
            log(f"страницата: {label} - НЕ и след {elapsed:.0f} s (код {code})")
            return None
        time.sleep(POLL_S)


def has_mark(body):
    return f"Серия{MARK}" in body


original = hero_title()
log(f"преди: заглавие {original!r}, страницата видима в API: {page_visible()}")
if MARK in original:
    sys.exit("Заглавието вече съдържа маркера - тестът е бил прекъснат. Провери ръчно.")
if not has_mark(original + MARK):
    sys.exit("Маркерът не може да се търси в страницата - провери заглавието.")

results = {}
try:
    set_title(original + MARK)
    results["редакция се вижда"] = wait_page("показва „(тест)“", has_mark)

    set_status("DRAFT")
    log(f"Storefront API при Чернова: страницата видима = {page_visible()}")
    results["Чернова → конструктора"] = wait_page(
        "е от конструктора (без „(тест)“, с Longevity)",
        lambda b: not has_mark(b) and "Longevity" in b)

    set_status("ACTIVE")
    results["Активна → отново от записите"] = wait_page("показва „(тест)“ отново", has_mark)
finally:
    set_status("ACTIVE")
    set_title(original)

results["връщане на заглавието"] = wait_page("е без „(тест)“", lambda b: not has_mark(b) and "Longevity" in b)
log(f"след: заглавие {hero_title()!r}, страницата видима в API: {page_visible()}")
log("РЕЗУЛТАТ (секунди): " + json.dumps(results, ensure_ascii=False))
