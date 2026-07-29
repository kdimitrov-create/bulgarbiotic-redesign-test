# Тестово копие на редизайна — магазин `c2wjn.cloudcart.net`

Копие на редизайна на Bulgarbiotic, откачено от setup-а на Ники. Целта е
**репетиция на реалната процедура** по въвеждане на редизайна в жив магазин —
върху копие на `bulgarbiotic.bg`, без риск за оригинала. Затова deploy методът е
същият по същност като на Ники: **push към `main` → GitHub Actions → Nova**.

## Координати

| | |
|---|---|
| Магазин | `c2wjn.cloudcart.net` (Store ID 75235) |
| Storefront | `bulgarbiotic-redesign-test` · **`nova_storefront_id: 111`** |
| Nova URL | https://bulgarbiotic-redesign-test-ccdd5ce2b4f387ec.cloudcart.dev |
| Repo (деплойва) | `kdimitrov-create/bulgarbiotic-redesign-test` — **създадено от CloudCart** |
| Работно копие | `C:\Work AI\bb-copy-c2wjn` · клон `main` |

### Remotes

| Remote | Repo | Роля |
|---|---|---|
| `origin` | `kdimitrov-create/bulgarbiotic-redesign-test` | **деплойва** — push към `main` пуска Actions |
| `backup` | `kdimitrov-create/Test-BulgarBiotic-design` | бекъп на кода преди GitHub връзката |
| `niki-upstream` | `niliev-hub/bulgarbiotic-redesign` | само fetch — **push URL нарочно счупен** |

⚠️ CloudCart създава **собствено** repo при създаването на storefront-а. Свързване
към вече съществуващо repo не се предлага, а `deploymentMethod` е read-only в
Admin API — изборът GitHub/CLI се прави **веднъж, при създаване**.

## Как е сглобено

Базата е `fb7dd03` = `niki-upstream/main` @ 2026-07-29 (локалният клон
`redesign-corrections` беше точно равен на него). Отгоре: комит с дотогава
**некомитнатите** go-live файлове (`Analytics.tsx`, `lib/redirects.ts`, canonical,
robots, sitemap, бранд заглавия в 19 route-а) — обикновен `git clone` щеше да ги загуби.

Клонът `main` тук стъпва върху комита на CloudCart `aa80ab8` („Add Nova deployment
workflow"), така че `.github/workflows/nova-deploy.yml` със storefront 111 е
запазен непокътнат, а push-ът е чист fast-forward без force.

## Workflow-ът е по-нов от този на Ники

| | Ники (storefront 18) | Тук (storefront 111) |
|---|---|---|
| Deploy | директно към Cloudflare API | през `NOVA_DEPLOY_URL/deploy` |
| Secrets | 10 secrets + 3 vars | `NOVA_DEPLOY_TOKEN` + var `NOVA_DEPLOY_URL` |
| Assets | всеки файл в KV поединично | hash-dedup сесия (качва само новото) |

⚠️ **Preview — непроверено.** Панелът твърди, че комити към клон различен от `main`
отиват в preview среда, но в самия workflow `environment` е **закован на
`production`** (`branch` се праща отделно). Значи маршрутизацията става на сървъра.
**Тествай го, преди да разчиташ на него при реален cutover.**

## Правила

1. Никога не push-вай към `niki-upstream`.
2. Комит съобщенията са **на един ред** (многоредовите чупят Nova deploy стъпката).
3. `.env` (локален dev) сочи `c2wjn.cloudcart.net`. Ако покаже реалния магазин — спри.
4. **Не слагай реални GA/Meta ID-та** — тестът не бива да подава данни в живите акаунти.

## Проверка след deploy

- GitHub Actions run = success.
- `/assets/*.css` = **200** на Nova URL-а (иначе сайтът е без стилове).
- home / категория / продукт / cart рендират реални данни, без грешки.

## Проверено на 2026-07-29

- Всичките 10 `FEATURED_HANDLES` + продуктът на фокус се резолвват в копието — 10/10.
- Всички ключови маршрути 200, стилизирани, нула грешки; 404 е стилизиран.
- `lib/redirects.ts` е празна карта (no-op) — попълва се чак преди реален cutover.

<!-- preview routing test run-1 -->
