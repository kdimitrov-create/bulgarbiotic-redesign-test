# Въпроси към екипа на CloudCart — Nitrogen storefront с насочен домейн

Подготвено 2026-07-29 от теста върху копие на реален магазин.
Среда: магазин `c2wjn.cloudcart.net` (Store ID 75235) · Nitrogen storefront **111**
`bulgarbiotic-redesign-test` · домейн `testnitrogen.live`, насочен към storefront-а
· deploy през GitHub (repo `kdimitrov-create/bulgarbiotic-redesign-test`).

**Контекст:** репетираме прехвърляне на Nitrogen редизайн върху съществуващ жив
магазин (предстои за `bulgarbiotic.bg`). Тестваме на копие, за да не изненадаме
клиент с трафик. Трите въпроса по-долу са това, което не можем да решим отвън.

---

## 1. ⛔ БЛОКИРАЩО — предаването към checkout не работи, поръчки не могат да се правят

`cart.checkoutUrl` от Storefront API връща **`https://c2wjn.cloudcart.net/cart`** —
без cart id, без JWT. Освен това:

- `cartCreate` **не връща `Set-Cookie`** (проверено с `curl -D -`), значи браузърът
  няма как да носи количката към този адрес.
- Класическата тема отговаря на `/cart` с **404**, когато сесията ѝ е празна.
- В Storefront API няма мутация за предаване. Пълният списък е: `cartCreate`,
  `cartLinesAdd`, `cartLinesUpdate`, `cartLinesRemove`, `cartDiscountCodesUpdate`,
  `cartBuyerIdentityUpdate`, `cartNoteUpdate`, `cartAttributesUpdate`.

Същевременно типовете на `@cloudcart/nitro` (`dist/cart-*.d.ts`) описват друго:

> *„Signed handoff URL to `/checkout/adopt/{jwt}` on the Smarty side. Navigate the
> browser here on 'Checkout' — the server will write the cart.key into the Smarty
> session (and log the customer in, when a customer JWT was forwarded on this
> query) and 302 to /checkout."*

**Въпрос:** как се задейства този подписан `/checkout/adopt/{jwt}` адрес? Има ли
настройка или частен storefront токен, който липсва? В панела на storefront-а
таб „Storefront API" показва **само Public access token** — секция за
private/server токен няма.

## 2. Кои пътища остават на платформата след насочване на домейн

Изключенията изглеждат да са по **точен път**, не по префикс. Измерено на
`testnitrogen.live` (насочен към storefront 111):

| Път | Кой отговаря |
|---|---|
| `/checkout`, `/checkout/` | платформата (302) |
| `/admin/**` | платформата |
| `/api/**` | платформата |
| `/cdn/**` | платформата |
| **`/cart`** | storefront worker-ът |
| **`/cart/<token>`** | storefront worker-ът |
| **`/checkout/adopt/*`** | storefront worker-ът |

Следствие: `/checkout` на насочения домейн 302-ва към `/cart/<token>` — адрес,
който вече принадлежи на storefront-а. Тоест дори коректен adopt адрес би
попаднал обратно в storefront-а.

**Въпрос:** може ли **`/cart/*` да бъде добавен към изключенията**, както вече са
`/checkout` и `/api/*`? Ако да, можем сами да довършим предаването — класическата
тема приема `POST /cart/add` с `product_id` / `variant_id` / `quantity`, а ID-тата
от Storefront API съвпадат едно към едно (`gid://cloudcart/Product/67` → `67`).

## 3. Deploy Pipeline се чупи при всяка смяна на основния домейн

Генерираният `nova-deploy.yml` чете `vars.NOVA_DEPLOY_URL`, зададен към хоста,
който е бил основен при създаването на storefront-а. Щом основният домейн се
смени, старият хост започва да 301/302-ва — включително
`/admin/api/core/nitrogen/nova/deploy/assets-session`. `curl` в workflow-а е без
`-L`, така че получава HTML вместо JSON и стъпката пада с:

```
SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

Случи се **три пъти** при нас. Лекува се ръчно, като се пренапише
`NOVA_DEPLOY_URL`. При реален cutover това означава да останеш без работещ
deploy точно в момента, в който най-много ти трябва.

**Въпрос:** може ли `NOVA_DEPLOY_URL` да следва автоматично основния домейн, или
`curl` в генерирания workflow да ползва `-L`?

## 4. Наблюдение — `PUBLIC_STORE_DOMAIN` след насочване (решено от наша страна)

След насочване на домейна read-only променливата `PUBLIC_STORE_DOMAIN` става
публичния домейн, който **самият worker обслужва**. `@cloudcart/nitro@0.8` строи
адреса на Storefront API от нея (`storeDomain: env.PUBLIC_STORE_DOMAIN`), тоест
worker-ът вика себе си → получава HTML вместо JSON → **500 на всеки маршрут с
данни**, докато `/robots.txt` продължава да работи (което подвежда, че проблемът
е в приложението).

Заобиколихме го, като ползваме `PUBLIC_API_ORIGIN`. Споделяме го, защото
подразбиращият се scaffold ще срещне същото — струва си или пакетът да предпочита
`PUBLIC_API_ORIGIN`, или това да е ясно документирано в стъпките за cutover.

---

## Какво молим

1. Работещ начин за предаване на количката към checkout след насочване на домейн
   (точка 1) — това блокира поръчки.
2. `/cart/*` в списъка с пътища, оставащи на платформата (точка 2) — ако това е
   възможно, точка 1 отпада, защото си дописваме предаването сами.
3. Устойчив `NOVA_DEPLOY_URL` при смяна на основния домейн (точка 3).
