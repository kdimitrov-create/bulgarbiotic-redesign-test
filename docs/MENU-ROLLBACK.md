# Как се връща главното меню

Промените по менюто НЕ са в кода. Менюто идва от **Дизайн → Навигация** в
панела на `c2wjn.cloudcart.net` и се чете от `fetchMainMenu`. Тоест нито едно
пускане на код няма да ги върне - връщат се само оттук.

## 13.08.2026 — махнати „Beauty Серия" и „Bactology Pets"

По искане на клиента (документ „Корекции редизайн", т.5): двете да се скрият от
главното меню и да останат само като страници, за да има място за серията
Longevity. Самите страница и продукт **не са пипани** - махнат е само редът в
менюто.

⚠️ В `NavigationItem` няма поле за скриване. Единственият начин е записът да се
изтрие, затова тук стои точното му съдържание.

Състоянието преди промяната:

| поле | Beauty Серия | Bactology Pets |
|---|---|---|
| `id` | 98 | 91 |
| `order` | 3 | 4 |
| `type` / `linkType` | `page` | `product` |
| `linkId` | 29 | 79 |
| `route`, `url`, `class`, `widgetText`, `widgetConfig` | празни | празни |
| `blank` | false | false |
| `parentId` | няма | няма |
| подменюта | няма | няма |

### Връщане

```bash
source ~/.config/cloudcart/bulgarbiotic.env
export CLOUDCART_CLI_STORE=c2wjn.cloudcart.net

cloudcart app execute --json --query '
mutation {
  beauty: createNavigationItem(group: "main", input: {
    name: "Beauty Серия", type: "page", linkId: 29
  }) { id name }
  pets: createNavigationItem(group: "main", input: {
    name: "Bactology Pets", type: "product", linkId: 79
  }) { id name }
}'
```

Новите записи идват най-отдолу. Подредбата се оправя с
`reorderNavigationItem` или направо от панела, като се влачат на места 3 и 4 -
след „Промоции" и преди „Наука".

Проверка: `https://testnitrogen.live/` — двете имена не бива да се виждат в
горното меню, а `https://testnitrogen.live/page/kosa-koja-i-nokti` (това е страницата зад
„Beauty Серия", id 29) и продуктовата страница на Pets трябва да се отварят
нормално.
