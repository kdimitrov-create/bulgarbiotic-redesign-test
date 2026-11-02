# Оценка на проследяването след миграцията към Nitrogen

**Дата:** 20.08.2026 · **Повод:** Metrix твърдят, че не са пипали нищо и че преди
миграцията всичко е работело. · **Статус:** само оценка, НИЩО не е поправено.

Всичко тук е извадено от **публично четими източници** — тялото на самия контейнер
и живи класически магазини. Нула предположения, нула нужда от достъп.

---

## Кратко

Верни са и двете страни, но за различни неща.

- **GA4 ecommerce фунията (`view_item` / `add_to_cart` / `begin_checkout`)** —
  **не е наша.** Таговете са паузирани в техния контейнер и **никога не е имало
  GA4 Event таг**. Класическата тема също не е пращала тези събития, тоест те
  никога не са работили. Нашата витрина е ПЪРВОТО нещо, което изобщо ги излъчва.
- **GA4 трафикът (сесии, страници), таблото на CloudCart и `cc_customer_data`** —
  **наши са и наистина са счупени от миграцията.** Три отделни пропуска, описани
  като A1–A3 по-долу.

Тоест: „преди работеше" се отнася за нещо друго, не за фунията. И точно това
друго е наше.

---

# ЧАСТ 1 — НЕ Е НАША (доказано)

## 1.1 Таговете 47/48/53/54 са буквално `__paused` в живия контейнер

Тялото на контейнера е публично. Изтеглено и разчетено:

```bash
curl -s "https://www.googletagmanager.com/gtm.js?id=GTM-5X5M2HX" -o c.js
```

Google сервира паузираните тагове с функция `__paused`. Извадка от `resource.tags`:

| индекс | tag_id | function |
|---|---|---|
| 6 | **47** | `__paused` |
| 7 | **48** | `__paused` |
| 8 | **53** | `__paused` |
| 9 | **54** | `__paused` |

Паузирани са **11 от 19**: 22, 23, 39, **47, 48, 53, 54**, 66, 67, 68, 69.

⭐ Това не е наше разчитане. `__paused` е думата на самия Google в кода, който
браузърът на всеки посетител изпълнява в момента.

## 1.2 Правилата — кой таг слуша кое събитие

Разчетени `resource.predicates` + `resource.rules`, преведени от индекси към tag_id:

| събитие | тагове, които го слушат | резултат |
|---|---|---|
| `view_item` | **само 47** | ⛔ паузиран → **нищо** |
| `add_to_cart` | 48 + **71** | 48 паузиран · **71 (Google Ads) СЕ ПУСКА** ✅ |
| `begin_checkout` | **само 53** | ⛔ паузиран → **нищо** |
| `purchase` | 54 + **30** | 54 паузиран · **30 (Google Ads) СЕ ПУСКА** ✅ |
| `gtm.init` | 28, **59** (`G-TJENFFMPTW`), **70** (`AW-…`) | ✅ |
| `gtm.js` | 23, 39, 69, 66, **72** (Clarity) | само Clarity ✅ |

⭐ **Тагове 71 и 30 се пускат от НАШИЯ dataLayer в момента.** Това доказва, че
събитията ни са валидни и стигат до контейнера. Ако вината беше наша, и те щяха
да мълчат.

## 1.3 В контейнера няма НИТО ЕДИН GA4 Event таг

Всички тагове по тип:

- `__googtag` × 2 — **само конфигурация** (59 = `G-TJENFFMPTW`, 70 = `AW-17779035215`)
- `__awct` × 2 — Google Ads конверсии (30, 71)
- `__gclidw`, `__cvt_…` (Cookiebot), `__html` × 2 (21, 72 = Clarity)
- `__paused` × 11

⛔ **Липсва `__gaawe`** — това е типът „GA4 Event". Google тагът сам **не**
препраща ecommerce от dataLayer; за това служи GA4 Event таг.

Тоест дори да отпаузират 47/48/53/54, трябва да се провери, че са именно от този
тип. Паузираният таг не издава типа си отвън.

## 1.4 ⭐ Класическата тема НИКОГА не е пращала тези събития

Това е решаващото срещу „преди работеше". Проверено на два живи класически
магазина (`visvitalis.bg`, `zora.bg`) — начална + продуктова — и в самия сноп на
темата `assets.cloudcart.com/site/js/build.js` (2,1 MB):

| търсено | начална | продуктова | build.js |
|---|---|---|---|
| `view_item` | 0 | 0 | 0 |
| `begin_checkout` | 0 | 0 | 0 |
| `purchase` | 0 | 0 | 0 |
| `ecommerce` | 0 | 0 | 0 |
| `gtm-ee-event` | 0 | 0 | 0 |

Единствените `dataLayer.push` в класическата тема са:

```js
dataLayer.push({cc_page_data: window.cc_page_data})
dataLayer.push(arguments)              // gtag shim
```

(20-те срещания на `add_to_cart` в `build.js` са името на jQuery променлива за
бутона — `$add_to_cart_btn`, а не събитие.)

**Извод:** тагове 47/48/53/54 не са имали на какво да се пуснат и преди
миграцията. Затова стоят паузирани. Тригерите са били построени за dataLayer,
какъвто CloudCart не е излъчвал.

---

# ЧАСТ 2 — НАША Е (три истински пропуска)

## A1. 🔴 GA4 получава ЕДИН преглед на страница за цялата сесия

**Най-вероятната истинска причина зад „преди работеше".**

- Контейнерът **няма нито един** тригер `gtm.historyChange` (проверено: 0 срещания).
- Google тагът (59) се пуска на `gtm.init` — веднъж на зареждане на страницата.
- Класическата тема презарежда при всяко кликване → преглед на всяка страница.
- **Nitrogen е SPA** — маршрутът се сменя без презареждане.
- Нашият `pushPageView()` (`app/lib/analytics.ts:351`) вика **само** `fbq` и
  `ttq`. **Нищо не отива към GA4.**

**Следствие:** сесиите изглеждат едностранични, „страници на сесия" ≈ 1, честотата
на отпадане е надута, а всеки отчет по страници е грешен. Точно това би видял
маркетолог и би казал „счупи се след миграцията".

⚠️ **Преди да се пипа — да се провери.** GA4 има Enhanced Measurement →
**„Page changes based on browser history events"**. Ако е ВКЛЮЧЕНО, Google тагът
сам слуша `history` и A1 може да е по-малък, отколкото изглежда. Ако е ИЗКЛЮЧЕНО,
A1 е в пълен размер. Добавим ли ръчен `page_view`, без да проверим — броим двойно.
**Проверката иска достъп до GA4 Data Stream, който нямаме.**

## A2. 🔴 Таблото на CloudCart не получава нищо

CloudCart има **собствена** първична аналитика — тя пълни таблото в админ панела.
Класическата тема я вдига така (взето живо от `visvitalis.bg`):

```html
<script src="https://assets.cloudcart.com/sitecp/assetic/js/user_analytics.min.js"></script>
<script>
window.CCE = new CCUA({
  tracker: new (window.ScribeFetchTracker ? ScribeFetchTracker : ScribeScriptTracker)({
    baseUrl: 'https://cca.cloudcart.com/10383'      // 10383 = id на магазина
  })
});
if (!CCE.getUuid()) CCE.init({"site":{"language":"bg","currency":"EUR"}});
</script>
```

и после, според типа страница:

```js
CCE.init({ccuid, site:{language,currency}, customer:{subscriber_id,type,address:{country,city}}})
CCE.event('updateCustomer', {subscriber_id, type, address:{country:{iso,name}, city:{iso,name}}})
CCE.event('homePageView',   {homePageView: {home_id, name}})
CCE.event('viewProduct',    {viewProduct:  {product_id, name, …}})
```

Известни са и `viewCollection` (от PF-018).

⛔ **Нашата витрина не вика нищо от това** — нула срещания на `cca.` в `app/`.
Значи таблото на CloudCart за bulgarbiotic е сляпо от деня на миграцията. Това е
точно наблюдението „аналитиката в таблото на CloudCart не е добра".

⚠️ Отделно: PF-018 казва, че самият beacon връща `void(0)` като `text/html` и
хвърля непрехваната грешка на всяка страница. Ако го включим, ще внесем и това —
затова повикването трябва да е през `.catch()`.

## A3. 🟡 `/datalayer.js` връща 404 със сървирана HTML страница

Класическата тема зарежда `https://<магазин>/datalayer.js`:

```js
var cc_customer_data = {"id":null,"group_id":2,"group_name":"Guests","type":"guest","country":"BG",…};
var cc_subscriber_data = [];
dataLayer.push(cc_customer_data);
dataLayer.push(cc_subscriber_data);
```

При нас:

```
GET https://bulgarbiotic.bg/datalayer.js  →  404 · text/html · 39 166 байта
```

Пътят удря нашия worker и връща цялата HTML страница. Две последици:

1. `cc_customer_data` **никога не влиза** в dataLayer;
2. 39 KB HTML на заявка за `.js` — дребно, но е чист боклук.

**Кой го чете:** контейнерът има променливи `cc_page_data.customer.first_name`,
`.last_name`, `.email` — това е храната за **Enhanced Conversions** на Google Ads
(тагове 30 и 71, които РАБОТЯТ). Ние пълним само `type` и `locale`, значи
конверсиите вървят, но **без подобрените данни**. Не е счупено — работи наполовина.

## A4. 🟡 `cc_page_data` е минимален

Контейнерът чете 7 полета от `cc_page_data`. Ние пълним **едно**:

| поле | пълним ли го | за какво служи |
|---|---|---|
| `cc_page_data.locale` | ✅ да | език |
| `cc_page_data.customer.first_name` | ❌ не | Enhanced Conversions |
| `cc_page_data.customer.last_name` | ❌ не | Enhanced Conversions |
| `cc_page_data.customer.email` | ❌ не | Enhanced Conversions |
| `cc_page_data.chosen_shipping.phone` | ❌ не | каса — рисува я платформата |
| `cc_page_data.chosen_shipping.post_code` | ❌ не | каса — рисува я платформата |

Двете за касата не са наши. Трите за клиента са — за влезли клиенти.

## A5. 🟢 Дребно, за сведение

- Макрос 33 в контейнера чете `eventModel.items.id` (вместо `items.0.id`) —
  масивът няма такова поле, тоест променливата винаги е празна. **Тяхна грешка**,
  не пречи на нищо днес.
- Платформеният контейнер `GTM-KT8R2G` тежи ~364 KB и на този магазин пуска
  практически само детектор за роботи (PF-052).

---

# Какво следва (нищо не е пипано)

## Не изисква никакъв достъп — можем веднага
1. **A2** — да върнем аналитиката на CloudCart (`user_analytics.min.js` + `CCE`),
   с `.catch()` заради PF-018. Нужно е id-то на магазина за `baseUrl`.
2. **A3** — да сервираме `/datalayer.js` с истински `cc_customer_data`,
   или направо да бутаме обекта от React слоя (по-чисто, без излишна заявка).
3. **A4** — да допълним `cc_page_data.customer.*` за влезли клиенти.

## Иска проверка ПРЕДИ да се пипа
4. **A1** — първо да се види в GA4 → Admin → Data Streams → Enhanced Measurement
   дали „page changes based on browser history events" е включено.
   ⛔ Ако е включено, ръчен `page_view` = двойно броене. **Иска достъп до GA4.**

## Остава при Metrix
5. Отпаузиране на 47/48/53/54 **и** проверка, че са от тип **GA4 Event**
   (`__gaawe`). Ако не са — да се създадат наново.

---

## Как се проверява всичко това пак

```bash
# паузираните тагове, от живия контейнер
curl -s "https://www.googletagmanager.com/gtm.js?id=GTM-5X5M2HX" -o /tmp/c.js
python3 -c "
import re,json,sys
s=open('/tmp/c.js',encoding='utf-8',errors='replace').read()
i=s.find('{',re.search(r'var data\s*=\s*\{',s).start())
d=0;
for j in range(i,len(s)):
    d+= s[j]=='{'; d-= s[j]=='}'
    if d==0: break
r=json.loads(s[i:j+1])['resource']
for t in r['tags']: print(t.get('tag_id'), t.get('function'))
"

# класическата тема не праща GA4 ecommerce
curl -s -A Mozilla https://visvitalis.bg/ | grep -c view_item      # 0

# CloudCart собствената аналитика
curl -s -A Mozilla https://visvitalis.bg/ | grep -o 'cca\.cloudcart\.com/[0-9]*'

# нашият 404
curl -s -o /dev/null -w '%{http_code} %{content_type} %{size_download}\n' https://bulgarbiotic.bg/datalayer.js
```
