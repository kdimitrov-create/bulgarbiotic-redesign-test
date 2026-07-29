# Тестово копие на редизайна — магазин `c2wjn.cloudcart.net`

Този проект е **копие на редизайна на Bulgarbiotic**, откачено от setup-а на Ники.
Целта: **репетиция на реалната процедура** по въвеждане на редизайна в жив магазин —
върху копие на `bulgarbiotic.bg`, без риск за оригинала.

Затова deploy методът е **същият като на Ники: GitHub Actions**, само че срещу
собствено repo и собствен storefront.

## Какво е различно спрямо оригинала

| | Оригинал (`C:\Work AI\bb-redesign-live`) | Това копие |
|---|---|---|
| Repo | `niliev-hub/bulgarbiotic-redesign` (чуждо) | собствено repo под `kdimitrov-create` |
| Remote | `origin` | `origin` (новото) + `niki-upstream` (само fetch, **push забранен**) |
| Клон | `redesign-corrections` | **`main`** (за да съвпадне с trigger-а) |
| Deploy | GitHub Actions → storefront **18** = реалният магазин | GitHub Actions → нов storefront в копието |
| `nova_storefront_id` | `18` | нов (CloudCart го записва при свързването) |
| `PUBLIC_STORE_DOMAIN` | `bulgarbiotic.bg` | `c2wjn.cloudcart.net` |

**Базова точка:** `fb7dd03` = `niki-upstream/main` към 2026-07-29 — цялата работа
до момента. Отгоре: `18ba24f` добавя дотогава некомитнатите go-live файлове
(`Analytics.tsx`, `lib/redirects.ts`, canonical/robots/sitemap, бранд заглавия) и
маха стария workflow, закован на storefront 18.

## Правила

1. **Никога не push-вай към `niki-upstream`.** Push URL-ът е нарочно счупен.
2. При свързване на storefront-а в панела — избери **новото** repo, никога
   `niliev-hub/bulgarbiotic-redesign`.
3. `.env` тук сочи копието. Ако някога покаже `bulgarbiotic.bg` — спри и провери.
4. Комит съобщенията са **на един ред** (многоредовите чупят Nova deploy стъпката).
5. ⚠️ Като на оригинала: **всеки push към `main` И всеки PR** тригерва deploy
   към единствения worker на този storefront. Няма изолиран preview.

## Setup

1. Създай **private** repo под `kdimitrov-create`.
2. `git remote add origin <url>` → `git push -u origin main`.
3. Панел на `c2wjn.cloudcart.net` → Nitrogen → Create Storefront → **GitHub** →
   свържи новото repo.
4. Ако CloudCart не запише сам `.github/workflows/nova-deploy.yml` — копира се от
   оригинала, сменя се първият ред `#! nova_storefront_id:` с новия id, и се
   попълват secrets/vars ръчно (виж таблицата долу).
5. Push → Actions → проверка.

### Secrets / vars, които workflow-ът иска

**Secrets:** `NOVA_CF_ACCOUNT_ID`, `NOVA_CF_API_TOKEN`, `PUBLIC_STORE_DOMAIN`,
`PUBLIC_STOREFRONT_API_TOKEN`, `PRIVATE_STOREFRONT_API_TOKEN`,
`PUBLIC_STOREFRONT_ID`, `SHOP_ID`, `SESSION_SECRET`, `NOVA_DEPLOY_CALLBACK_URL`,
`NOVA_DEPLOY_TOKEN`
**Vars:** `NOVA_CF_NAMESPACE`, `NOVA_CF_KV_NAMESPACE_ID`, `NOVA_WORKER_NAME`

## Проверка след deploy (задължителна)

- `/assets/*.css` връща **200** на Nova URL-а (иначе сайтът е без стилове).
- Home / категория / продукт рендират реални данни от копирания магазин.

## Известни неща за проверка след първия deploy

- `FEATURED_HANDLES` (10 продукта) и `FOCUS_PRODUCT_HANDLE = 'family-pack'` в
  `app/routes/_index.tsx` са заковани handle-и — ако копираният магазин има други
  handle-и, началната ще е празна.
- `lib/redirects.ts` е празна карта (no-op) — попълва се чак преди реален cutover.
- Аналитиката (`components/Analytics.tsx`) е инертна без `PUBLIC_GA_ID` /
  `PUBLIC_META_PIXEL_ID` — **не ги слагай тук**, тестовото копие не бива да
  подава данни в реалните GA/Meta акаунти.
