"""Rebuild the "Продукти" mega-menu in the CloudCart admin as three titled columns.

Existing items are MOVED (parentId) rather than deleted and recreated, so their
ids, link targets and any settings survive. Only genuinely new links are created.
"""
import json
import os
import re
import sys
import urllib.request

DOM = sys.argv[1]
PAT = sys.argv[2]
DRY = '--dry' in sys.argv

PRODUCTS_ID = '68'


def gql(query):
    body = json.dumps({'query': query}).encode('utf-8')
    req = urllib.request.Request(
        'https://%s/api/gql' % DOM, data=body,
        headers={'Authorization': 'Bearer ' + PAT, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=30) as r:
        out = json.loads(r.read().decode('utf-8'))
    if 'errors' in out:
        raise RuntimeError(json.dumps(out['errors'], ensure_ascii=False)[:300])
    return out['data']


def create_group(name):
    q = ('mutation { createNavigationItem(group: "main", input: '
         '{ name: "%s", type: "group", parentId: "%s" }) { id name } }' % (name, PRODUCTS_ID))
    if DRY:
        print('  [dry] group', name)
        return 'DRY'
    node = gql(q)['createNavigationItem']
    print('  + колона %-14s id=%s' % (name, node['id']))
    return node['id']


def create_link(name, kind, link_id, parent):
    q = ('mutation { createNavigationItem(group: "main", input: '
         '{ name: "%s", type: "%s", linkId: "%s", parentId: "%s" }) { id } }'
         % (name, kind, link_id, parent))
    if DRY:
        print('  [dry] link', name, kind, link_id)
        return
    node = gql(q)['createNavigationItem']
    print('  + %-22s %-9s %-4s id=%s' % (name, kind, link_id, node['id']))


def move(item_id, parent, new_name=None):
    fields = ['parentId: "%s"' % parent]
    if new_name:
        fields.append('name: "%s"' % new_name)
    q = ('mutation { updateNavigationItem(id: "%s", input: { %s }) { id name } }'
         % (item_id, ', '.join(fields)))
    if DRY:
        print('  [dry] move', item_id, '->', parent, new_name or '')
        return
    node = gql(q)['updateNavigationItem']
    print('  ~ преместен id=%-5s -> %-22s' % (item_id, node['name']))


def delete(item_id, why):
    q = 'mutation { deleteNavigationItem(id: "%s") }' % item_id
    if DRY:
        print('  [dry] delete', item_id, why)
        return
    gql(q)
    print('  - изтрит id=%s (%s)' % (item_id, why))


print('== колона 1: По цел ==')
goal = create_group('По цел')
move('101', goal, 'Храносмилане')
create_link('Имунитет', 'product', '75', goal)
create_link('Женско здраве', 'category', '3', goal)
create_link('Стрес и сън', 'product', '80', goal)
move('102', goal, 'Дебело черво')
move('71', goal, 'За отслабване')

print('== колона 2: За кого ==')
who = create_group('За кого')
move('107', who, 'За жени')
move('137', who, 'За мъже')
move('110', who, 'За бременни')
move('70', who, 'За деца')
move('105', who, 'За бебета')
create_link('За домашни любимци', 'product', '79', who)

print('== колона 3: По форма ==')
form = create_group('По форма')
create_link('DR-Caps капсули', 'category', '1', form)
create_link('Пробиотични перли', 'category', '14', form)
create_link('Дъвчащи таблетки', 'product', '62', form)
create_link('Сашета за бебета', 'product', '82', form)
create_link('Пакети с отстъпка', 'category', '8', form)

print('== почистване ==')
delete('97', 'дублира бутона „Виж всички продукти" под менюто')

print('готово')
