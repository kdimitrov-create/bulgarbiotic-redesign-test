# -*- coding: utf-8 -*-
"""Build the redesign's footer menu inside CloudCart's `footer` navigation group.

The footer in the code was a hardcoded list of links. This puts the same links
in the panel, so the merchant owns them the way they own the main menu.

Existing items are MOVED (parentId) and renamed rather than deleted and
recreated, so their ids and link targets survive. Nothing is deleted except
group shells that end up empty.

    python tools/build-footer.py DOMAIN TOKEN --dry     # show the plan
    python tools/build-footer.py DOMAIN TOKEN --write   # do it

⚠️ On the real store this group also drives the CLASSIC theme's footer, which
customers see today. Run it there only when that is intended.
"""
import json
import sys
import time
import urllib.request

DOM, PAT = sys.argv[1], sys.argv[2]
WRITE = '--write' in sys.argv
GROUP = 'footer'

# The footer exactly as the design renders it: three columns of links plus the
# thin bar under them. `kind` is the admin's link type; the handle is resolved
# to an id below.
COLUMNS = [
    ('Магазин', [
        ('Всички продукти', 'category', 'all-products'),
        ('Перли', 'category', 'perli'),
        ('Пакети', 'category', 'packages'),
        ('За жени', 'category', 'probiotik-za-jeni'),
        ('За деца', 'category', 'probiotik-za-deca'),
        ('Промоции', 'selection', 'sale'),
    ]),
    ('Bactology', [
        ('За нас', 'page', 'about-us'),
        ('Събития', 'page', 'events'),
        ('Медиите за нас', 'page', 'mediite-za-nas'),
        ('Науката', 'page', 'naukata-zad-bulgar-biotic'),
        ('Блог', 'blog', 'beauty-and-health'),
        ('Контакти', 'page', 'about-us'),
    ]),
    ('Помощ', [
        ('Доставка', 'page', 'shipping'),
        ('Плащане', 'page', 'payment'),
        ('Връщане на продукт', 'page', 'vrashtane-na-produkt'),
        ('Формуляр за отказ', 'page', 'formulyar-za-otkaz'),
        ('Бисквитки', 'page', 'politika-otnosno-biskvitkite'),
    ]),
    ('Долна лента', [
        ('Общи условия', 'page', 'terms-policy'),
        ('Поверителност', 'page', 'privacy-policy'),
        ('Бисквитки', 'page', 'politika-otnosno-biskvitkite'),
    ]),
]

# Admin query per link type, so a handle can be turned into the id the
# navigation item needs.
LOOKUPS = {
    'category': ('categories', 'category'),
    'page': ('pages', 'page'),
    'blog': ('blogCategories', 'blogCategory'),
    'selection': ('searchSmartCollections', 'smartCollection'),
}


def gql(query, tries=3):
    body = json.dumps({'query': query}).encode('utf-8')
    last = None
    for attempt in range(tries):
        try:
            req = urllib.request.Request(
                'https://%s/api/gql' % DOM, data=body,
                headers={'Authorization': 'Bearer ' + PAT,
                         'Content-Type': 'application/json'})
            with urllib.request.urlopen(req, timeout=90) as r:
                out = json.loads(r.read().decode('utf-8'))
            if 'errors' in out:
                raise RuntimeError(json.dumps(out['errors'], ensure_ascii=False)[:250])
            return out['data']
        except Exception as exc:
            last = exc
            time.sleep(2 + attempt * 3)
    raise last


def page(field, extra=''):
    """Every node of a connection, following the cursor."""
    rows, cursor = [], None
    while True:
        after = ', after: "%s"' % cursor if cursor else ''
        conn = gql('{ %s(first: 100%s%s) { edges { cursor node { id urlHandle name } } '
                   'pageInfo { hasNextPage } } }' % (field, after, extra))[field]
        rows += [e['node'] for e in conn['edges']]
        if not conn['pageInfo']['hasNextPage'] or not conn['edges']:
            return rows
        cursor = conn['edges'][-1]['cursor']


# ── resolve every handle the design links to ────────────────────────────────
index = {}
for kind, (field, _) in LOOKUPS.items():
    if kind == 'selection':
        # Smart collections have no plain listing (the search field demands a
        # query), so the handful the footer links to are looked up one by one.
        index[kind] = {}
        for _, links in COLUMNS:
            for _, k, handle in links:
                if k != 'selection' or handle in index[kind]:
                    continue
                try:
                    node = gql('{ smartCollectionByHandle(urlHandle: "%s") { id } }' % handle)
                    node = node.get('smartCollectionByHandle')
                    if node:
                        index[kind][handle] = str(node['id'])
                except Exception as exc:
                    print('⚠️  не можах да намеря промоцията %s: %s' % (handle, exc))
        continue
    try:
        index[kind] = {r['urlHandle']: str(r['id']) for r in page(field)}
    except Exception as exc:
        print('⚠️  не можах да прочета %s: %s' % (field, exc))
        index[kind] = {}

missing = []
for title, links in COLUMNS:
    for name, kind, handle in links:
        if handle not in index.get(kind, {}):
            missing.append((title, name, kind, handle))

# ── what is in the panel today ──────────────────────────────────────────────
tree = gql('''{ navigation(group: "%s") { items {
  id name type linkType linkId
  children { id name type linkType linkId
    children { id name type linkType linkId } } } } }''' % GROUP)['navigation']['items']

existing = {}          # (kind, id) → navigation item id


def walk(items):
    for it in items:
        if it.get('linkType') and it.get('linkId'):
            existing.setdefault((it['linkType'], str(it['linkId'])), it)
        walk(it.get('children') or [])


walk(tree)

print('в панела днес:')
for it in tree:
    print('  ■ %-24s id=%-5s (%d деца)' % (it['name'], it['id'], len(it.get('children') or [])))
print()

if missing:
    print('⚠️  тези адреси от дизайна нямат съответствие в магазина:')
    for title, name, kind, handle in missing:
        print('     %-14s %-22s %s/%s' % (title, name, kind, handle))
    print()

plan = []
unclaimed = dict(existing)
for title, links in COLUMNS:
    plan.append(('group', title, None, None))
    for name, kind, handle in links:
        link_id = index.get(kind, {}).get(handle)
        if not link_id:
            continue
        # A single navigation item cannot sit in two columns, so the second
        # link to the same target is a new item, not a move.
        found = unclaimed.pop((kind, link_id), None)
        plan.append(('move' if found else 'create', name, kind, (found, link_id)))

print('план:')
for what, name, kind, extra in plan:
    if what == 'group':
        print('  ■ колона %s' % name)
    elif what == 'move':
        found, link_id = extra
        print('     ~ мести %-24s (има го като id=%-5s „%s")' % (name, found['id'], found['name'][:26]))
    else:
        print('     + нов   %-24s %s/%s' % (name, kind, extra[1]))

if not WRITE:
    print('\n(само план; за запис добави --write)')
    raise SystemExit


def create_group(name):
    node = gql('mutation { createNavigationItem(group: "%s", input: '
               '{ name: "%s", type: "group" }) { id name } }' % (GROUP, name))
    print('  + колона %-16s id=%s' % (name, node['createNavigationItem']['id']))
    return node['createNavigationItem']['id']


def create_link(name, kind, link_id, parent):
    node = gql('mutation { createNavigationItem(group: "%s", input: '
               '{ name: "%s", type: "%s", linkId: "%s", parentId: "%s" }) { id } }'
               % (GROUP, name, kind, link_id, parent))
    print('     + %-24s %-9s %-5s id=%s' % (name, kind, link_id, node['createNavigationItem']['id']))


def move(item_id, parent, new_name):
    gql('mutation { updateNavigationItem(id: "%s", input: '
        '{ parentId: "%s", name: "%s" }) { id } }' % (item_id, parent, new_name))
    print('     ~ %-24s (преместен id=%s)' % (new_name, item_id))


for title, links in COLUMNS:
    parent = create_group(title)
    for name, kind, handle in links:
        link_id = index.get(kind, {}).get(handle)
        if not link_id:
            print('     · пропуснат %-22s (няма %s/%s)' % (name, kind, handle))
            continue
        found = existing.pop((kind, link_id), None)
        if found:
            move(found['id'], parent, name)
        else:
            create_link(name, kind, link_id, parent)

# Group shells that are now empty carry nothing; anything still linked stays.
after = gql('{ navigation(group: "%s") { items { id name type children { id } } } }'
            % GROUP)['navigation']['items']
for it in after:
    if it['type'] == 'group' and not (it.get('children') or []) and \
            it['name'] not in [c[0] for c in COLUMNS]:
        gql('mutation { deleteNavigationItem(id: "%s") }' % it['id'])
        print('  - празна колона „%s" премахната' % it['name'])

print('готово')
