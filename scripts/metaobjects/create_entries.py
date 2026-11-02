"""Създава (или обновява) записите от JSON-а на build_longevity_entries.py.

Ползва metaobjectUpsert, затова е безопасно да се пусне пак: запис със същия адрес се
обновява, не се дублира. Препратките „@тип:адрес“ се заменят с id-то на вече създадения
запис. Новите записи са Активни, но нищо не се вижда на сайта, докато кодът не ги чете.
Спира при първата грешка.
"""
import json
import subprocess
import sys

STORE = "bulgarbiotic.bg"
ENTRIES, OUT = sys.argv[1], sys.argv[2]

MUTATION = """mutation Upsert($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
  metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
    metaobject { id handle displayName }
    userErrors { field code message }
  }
}"""


def run(variables):
    cmd = ["cloudcart", "app", "execute", "-s", STORE, "--json", "-q", MUTATION,
           "-v", json.dumps(variables, ensure_ascii=False), "--timeout", "40"]
    res = subprocess.run(cmd, capture_output=True, text=True, timeout=90)
    try:
        return json.loads(res.stdout)
    except json.JSONDecodeError:
        sys.exit(f"Неразбираем отговор:\n{res.stdout}\n{res.stderr}")


ids = {}


def resolve(value):
    if isinstance(value, str) and value.startswith("@"):
        return f"gid://cloudcart/Metaobject/{ids[value]}"
    if isinstance(value, str) and value.startswith("[") and '"@' in value:
        return json.dumps([resolve(v) for v in json.loads(value)], ensure_ascii=False)
    return value


for entry in json.load(open(ENTRIES, encoding="utf-8")):
    ref = f"@{entry['type']}:{entry['handle']}"
    fields = [{"key": k, "value": resolve(v)} for k, v in entry["fields"].items()]
    answer = run({"handle": {"type": entry["type"], "handle": entry["handle"]}, "metaobject": {"fields": fields}})
    payload = (answer.get("data") or {}).get("metaobjectUpsert") or {}
    errors = payload.get("userErrors") or answer.get("errors")
    if errors:
        print(f"✗ {entry['handle']}: {json.dumps(errors, ensure_ascii=False)}")
        break
    ids[ref] = payload["metaobject"]["id"]
    print(f"✓ {entry['type']:<18} {entry['handle']:<24} → {ids[ref]}")
    json.dump(ids, open(OUT, "w"), ensure_ascii=False, indent=1)
