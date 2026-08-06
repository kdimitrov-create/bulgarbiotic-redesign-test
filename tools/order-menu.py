"""Put each mega-menu column into the intended reading order.

Moved items keep the order number they had as loose links, so they interleave
with the newly created ones. Chaining "place X after the previous one" fixes the
whole column in one pass.
"""
import json
import sys
import urllib.request

DOM, PAT = sys.argv[1], sys.argv[2]

COLUMNS = {
    'По цел': ['101', '139', '140', '141', '102', '71'],
    'За кого': ['107', '137', '110', '70', '105', '143'],
    'По форма': ['145', '146', '147', '148', '149'],
}


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


for column, ids in COLUMNS.items():
    print('==', column)
    for prev, cur in zip(ids, ids[1:]):
        # Returns Boolean!, so no sub-selection.
        gql('mutation { reorderNavigationItem(input: { id: "%s", targetId: "%s", position: after }) }'
            % (cur, prev))
        print('   %s след %s' % (cur, prev))
print('готово')
