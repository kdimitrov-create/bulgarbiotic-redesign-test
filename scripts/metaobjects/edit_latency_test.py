"""М.0: след колко време редакция в метаобект се вижда в Storefront API.

Добавя „ (тест)“ към заглавието на банера `section_hero/longevity-hero`, пита
Storefront API на всеки 5 s, докато новият текст се появи, и връща старата
стойност. Засича и връщането. Живият сайт не чете записа, затова тестът не се вижда.

    python3 -I scripts/metaobjects/edit_latency_test.py .env
"""
import json
import subprocess
import sys
import time

STORE = "bulgarbiotic.bg"
TYPE, HANDLE, KEY = "section_hero", "longevity-hero", "title"
MARK = " (тест)"
POLL_S, LIMIT_S = 5, 30 * 60

env = {}
for line in open(sys.argv[1], encoding="utf-8"):
    if "=" in line and not line.lstrip().startswith("#"):
        k, v = line.strip().split("=", 1)
        env[k] = v.strip().strip("\"'")
ORIGIN, TOKEN = env["PUBLIC_API_ORIGIN"], env["PUBLIC_STOREFRONT_API_TOKEN"]

SF_QUERY = '{ metaobject(handle:{type:"%s",handle:"%s"}){ updatedAt field(key:"%s"){ value } } }' % (
    TYPE, HANDLE, KEY)
UPSERT = """mutation U($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
  metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
    metaobject { id updatedAt field(key: "%s") { value } }
    userErrors { field code message }
  }
}""" % KEY


def log(msg):
    print(time.strftime("%H:%M:%S"), msg, flush=True)


def storefront_value():
    # curl, а не urllib: Python от python.org няма свои сертификати за HTTPS.
    res = subprocess.run(
        ["curl", "-sS", "--max-time", "20", "-X", "POST", f"{ORIGIN}/api/sf",
         "-H", "Content-Type: application/json", "-H", f"X-Storefront-Access-Token: {TOKEN}",
         "--data", json.dumps({"query": SF_QUERY})],
        capture_output=True, text=True, timeout=30, check=True)
    mo = json.loads(res.stdout)["data"]["metaobject"]
    return mo["field"]["value"], mo["updatedAt"]


def admin_set(value):
    variables = {"handle": {"type": TYPE, "handle": HANDLE},
                 "metaobject": {"fields": [{"key": KEY, "value": value}]}}
    res = subprocess.run(
        ["cloudcart", "app", "execute", "-s", STORE, "--json", "-q", UPSERT,
         "-v", json.dumps(variables, ensure_ascii=False), "--timeout", "40"],
        capture_output=True, text=True, timeout=90)
    out = json.loads(res.stdout)["data"]["metaobjectUpsert"]
    if out["userErrors"]:
        sys.exit(f"Грешка от админа: {out['userErrors']}")
    log(f"админ: записано {value!r}, updatedAt {out['metaobject']['updatedAt']}")


def wait_for(expected):
    start = time.monotonic()
    while True:
        try:
            value, updated = storefront_value()
        except Exception as error:  # мрежата - опитва пак
            value, updated = None, str(error)
        elapsed = time.monotonic() - start
        if value == expected:
            log(f"Storefront API: новата стойност след {elapsed:.0f} s (updatedAt {updated})")
            return elapsed
        if elapsed > LIMIT_S:
            log(f"Storefront API: няма я и след {elapsed:.0f} s, спирам")
            return None
        time.sleep(POLL_S)


original, updated = storefront_value()
log(f"преди: {original!r} (updatedAt {updated})")
if MARK in original:
    sys.exit("Заглавието вече съдържа маркера - тестът е бил прекъснат. Провери ръчно.")

try:
    admin_set(original + MARK)
    edit_s = wait_for(original + MARK)
finally:
    admin_set(original)
revert_s = wait_for(original)
log(f"РЕЗУЛТАТ: редакция {edit_s} s, връщане {revert_s} s")
