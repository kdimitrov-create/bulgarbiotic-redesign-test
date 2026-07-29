# Bulgarbiotic / Bactology — Action Plan: въвеждане на одобрения редизайн (go-live)

> **Обхват:** новият Nitrogen дизайн е **готов и одобрен**. Този план НЕ е за
> проектиране/изграждане — а за **въвеждането** му върху съществуващия жив
> магазин `bulgarbiotic.bg`: финална подготовка → SEO/паритет → deploy →
> cutover → rollback → мониторинг. (Редизайн на заварен магазин, не нов магазин.)

## Принцип №0 — само реални елементи, без макети

Правило на проекта ([`CLAUDE.md`](../CLAUDE.md)): цялата работа е в реалния
Nitrogen проект; **никакви статични HTML макети**, никакви hard-coded данни —
всичко от **CloudCart Storefront API**. Верификация на живо (`localhost:3000` /
Nova preview), не в изолиран preview файл.

## Контекст

| | |
|---|---|
| Repo | `niliev-hub/bulgarbiotic-redesign` · клон `redesign-corrections` |
| Работно копие | `C:/Work AI/bb-redesign-live` · dev `cloudcart nitrogen dev -p 3000` |
| Nova preview | https://bulgarbiotic-redesign-f9ec9505b34324a9.nova.cloudcart.dev/ |
| Storefront | `nova_storefront_id: 18` · магазин `bulgarbiotic.bg` |
| Заварен сайт | старата CloudCart класик тема (още обслужва домейна) |
| Валута | двойна BGN + EUR (1 € = 1.95583 лв) |
| **Старт (time line)** | **20 август 2026** (четвъртък) — начало на пренасянето |

## График (прогнозен — коригира се спрямо входовете и sign-off)

Старт = **20 август 2026**. Проектирането/изграждането и одобрението са преди старта.

| Дата | Стъпка |
|---|---|
| **20 авг** (четв.) | Ф1 Финална подготовка (RC) + събиране на входове: GA/Meta ID-та (#5), експорт на старите URL-и (#6) |
| **20–22 авг** | Ф2 SEO/паритет: попълване на редиректи, активиране на пиксели, canonical/meta/sitemap финал, функционален паритет |
| **25 авг** | Ф3 Deploy на preview + пълен QA; sign-off |
| **27 авг** | Ф4 **Cutover** (прозорец с нисък трафик) + Ф5 пост-cutover smoke |
| **27–29 авг** | Ф6 Rollback готовност + активен мониторинг (48–72ч) |
| **до нач. септ.** | Ф7 След пуска: Search Console, конверсия, итерации |

---

## Readiness — реален одит (2026-07-20)

Одит на четене на работното копие (без промени, без deploy).

**✅ Готова основа:** пълен набор маршрути (PDP, PLP, cart, search, account, blog,
policies, discount, 404, `robots.txt`, `sitemap.xml`); per-page SEO meta
(`getSeoMeta` в 25 маршрута); filter `noindex/follow` + пагинация `index/follow`;
`lang="bg"`, `theme-color #0a2540`; двойни BGN+EUR.

**Блокери преди cutover (статус 2026-07-20):**

| # | Проблем | Поправка | Статус |
|---|---|---|---|
| 1 | `robots.txt` sitemap → хардкоднат `localhost` | реален origin (`[robots.txt].tsx`, като sitemap-а) | ✅ поправено + проверено |
| 2 | Placeholder бранд „Nitro" (root default + **14** route заглавия) | → „Bactology" | ✅ поправено + проверено |
| 3 | Cookie consent само на home → GDPR риск | вдигнат в `PageLayout` (глобален на всеки route) | ✅ поправено + проверено |
| 4 | Няма `canonical` → дубликат-риск (filter/sort) | глобален canonical в `root.tsx` (маха query, пази `?page`) | ✅ поправено + проверено |
| 5 | Няма аналитика/пиксели (GA/Meta) | consent-gated GA4+Meta engine (`components/Analytics.tsx`) | 🔧 engine готов — чака ID-та + Nova binding |
| 6 | Няма 301 редиректи от стари URL-и → 404 | `lib/redirects.ts` + `$.tsx` (301) | 🔧 engine готов — чака експорт на старите URL-и |

Поправките #1–#4 са в работното копие (клон `redesign-corrections`), проверени на dev
(`localhost`, canonical/cookie/robots/title потвърдени); **не са деплойнати** — deploy
става само с изрична команда и в уговорен час (виж Фаза 3–4).

**⚠️ За проверка на живо:** функционален паритет (cart→checkout, търсене, филтри,
промо, акаунти) · structured data (Product/Breadcrumb JSON-LD).

**✅ Sitemap разширен** — вече включва блог статии (88) + страници (7) + блог landing
(общо **129 URL**, беше ~33). Проверено на dev.

---

## 1. Финална подготовка (release candidate)

Одобреният build = кандидат за пускане. Преди cutover:

- [ ] Финален QA пробег (`/nitrogen-review`): функционалност, responsive,
      performance, изображения, устойчивост.
- [ ] Съдържателен паритет: всички продукти/категории/страници/блог рендират от
      Storefront API; двойни BGN+EUR цени; правни страници (условия, поверителност).
- [ ] Маркирай известно-добро състояние: `git tag release-YYYY-MM-DD` (връщащ ориентир).
- [ ] Ако има недовършени одобрени корекции — приключват СЕГА, не след пуска.

## 2. SEO и паритет запазване ⭐ (същината на редизайна)

Завареният магазин има трафик и позиции — да не се счупят при смяната:

- [ ] **URL структура:** същите URL-и/handles ИЛИ **301 редиректи** от старите към новите.
- [ ] `canonical`, `<title>`, `meta description`, Open Graph — на всяка ключова страница.
- [ ] Стабилен `<h1>` (виж хероя: видимото заглавие е `div`, SEO `h1` — константен).
- [ ] `robots.txt` + `sitemap.xml` генерирани; филтър-страници `noindex/follow`,
      пагинация `index/follow`.
- [ ] Structured data (Product/Breadcrumb) където го е имало.
- [ ] **Функционален паритет** спрямо старата тема: cart → checkout, търсене,
      филтри, промо кодове, акаунти/wishlist.
- [ ] Аналитика/пиксели (GA/Meta) + GDPR cookie consent пренесени и гърмят.
- [ ] Свери списък-по-списък спрямо инвентара на стария сайт — нищо да не изпадне.

## 3. Deploy на одобрения build (Pipeline)

Deploy-ът е GitHub Actions Pipeline (`.github/workflows/nova-deploy.yml`):
`push`/PR → `npm ci` → `react-router build` → статика в **Cloudflare KV** →
worker в **Nova** (env като bindings, чете се през `ctx.env`) → callback към
CloudCart (`environment: production`).

- [ ] Deploy и проверка на preview: **`/assets/*.css = 200`**, реални данни на
      home/PLP/PDP, ключови флоу; скрийншот с `chrome --headless=new`.
- ⚠️ **Няма изолиран preview:** pipeline-ът презаписва единствения production
      worker (`f9ec9505…`) при всеки trigger. Планирай кога деплойваш; за истински
      before/after ползвай отделен worker/storefront.

## 4. Cutover (go-live)

- [ ] Насрочи **прозорец с нисък трафик**; уведоми клиента (Мариета).
- [ ] Превключи домейна `bulgarbiotic.bg`: **стара класик тема → Nitrogen
      storefront 18**. ⚠️ Това е **CloudCart-панел / PM действие** — не е в repo-то;
      вземи точните стъпки от PM/CloudCart екипа.
- [ ] Отчети DNS/кеш TTL; запиши **кой** изпълнява и **в колко**.

## 5. Пост-cutover проверка (веднага след пуска)

- [ ] `/assets/*.css = 200` на **реалния домейн**.
- [ ] Пълен клиентски флоу: home → категория → продукт → кошница → **checkout**.
- [ ] Търсене, филтри, двойни цени, мобилно (без хоризонтален скрол).
- [ ] SEO тагове присъстват; аналитика/пиксели гърмят; стари URL-и → редиректи (не 404).

## 6. Rollback готовност

- [ ] Старата CloudCart тема остава **публикувана и непокътната** = горещ резерв.
- [ ] Връщане = **1 флип** на домейна обратно към старата тема (минути).
- [ ] Код-ниво: `git revert` към `release-…` tag (без force-push) + редеплой.
- [ ] Записани **критерии за rollback** (напр. счупен checkout, срив в трафика) и **отговорник**.

## 7. След пуска (48–72 ч и нататък)

- [ ] Google Search Console: crawl/coverage грешки, 404-и, индексиране.
- [ ] Мониторинг: error логове, рангове, конверсия спрямо базлайна.
- [ ] Итерации и корекции по редизайна влизат **тук** (не блокират пуска).
