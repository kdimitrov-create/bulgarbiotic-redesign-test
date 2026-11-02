/**
 * Общ кеш между изолатите - за да спре витрината да залива магазина.
 *
 * ЗАЩО. Всяка страница дърпа десетина неща от магазина: меню, етикети, оферти,
 * отстъпки, модули на темата, плюс продуктите. Дотук всяко от тях се пазеше в
 * променлива в модула - тоест В ПАМЕТТА НА ЕДИН ИЗОЛАТ. Cloudflare обаче пуска
 * нов изолат за всеки сноп трафик, а новият изолат започва с празен кеш и
 * повтаря целите десетина заявки. При истински трафик кешът на практика не
 * работеше: магазинът удряше ограничението, връщаше 429, страниците даваха 500,
 * а търговецът получаваше 429 и в АДМИН ПАНЕЛА - от нашите заявки.
 *
 * Мерено на живо 17.08.2026: 55 от 160 страници с код 500. Вдигането на кеша в
 * паметта от 30 секунди на 15 минути не е лек - изолатите така или иначе са нови.
 *
 * КАК. Cache API-то на Cloudflare е общо за целия датацентър и преживява
 * смяната на изолати. Вкарва се ПОД fetch, тоест всички извиквания към магазина
 * минават през него, без да се пипа нито един модул поотделно.
 *
 * ⚠️ ЗАДЪЛЖИТЕЛНО `caches.open("...")`, НИКОГА `caches.default`.
 * Nova пуска работника в пясъчник, където подразбиращият се кеш е забранен:
 *   „This Worker is not permitted to access the default cache."
 * ИМЕНУВАНИЯТ кеш обаче е позволен - проверено на живо 17.08.2026 с проба на
 * самата витрина. Разликата е една дума, а цената ѝ е цял ден: с `default`
 * всяко търсене в кеша тихо хвърля, кешът се смъква до паметта на изолата и
 * изглежда, че „кеширането не помага" - докато всъщност никога не е работило.
 *
 * Три неща вършат работата:
 *
 *   1. ОБЩ КЕШ. Един отговор служи на всички посетители в датацентъра, докато е
 *      пресен. Оттук идва основното намаление на заявките.
 *
 *   2. СЛИВАНЕ НА ЕДНАКВИТЕ. Тръгнат ли десет еднакви заявки едновременно
 *      (десет посетители в един изолат), нагоре тръгва ЕДНА и десетте чакат нея.
 *      Без това пресният кеш не помага в мига на снопа - точно когато трябва.
 *
 *   3. СТАРО ВМЕСТО ГРЕШКА. Пази се и остарял отговор. Откаже ли магазинът
 *      (429 или 5xx), връща се старият вместо провал. Менюто отпреди пет минути
 *      е същото меню; страница с вчерашно меню е безкрайно по-добре от 500.
 *
 * КАКВО НЕ СЕ КЕШИРА - три забрани, всяка от които е задължителна:
 *
 *   • МУТАЦИИ. Записът никога не се кешира и никога не се слива с друг - иначе
 *     две поръчки биха си поделили един отговор.
 *   • КОЛИЧКА, КЛИЕНТ, ПОРЪЧКА, АБОНАТ. Лични данни. Два посетителя не бива да
 *     видят една количка, а проверката на абоната се пита пак след секунди
 *     (етикетът `popup-nl`) и трябва да вижда истината, не запомнен отговор.
 *   • ОТГОВОРИ С ГРЕШКА. Кешира се само чист отговор: `ok` и без `errors` в
 *     тялото. Иначе една грешка би се сервирала на всички за две минути.
 */

/** Докога отговорът е пресен - след това се пита пак, но старият се пази. */
/*
 * 5 минути, а не 60 секунди (25.08, одобрено от клиента след одита).
 *
 * 60-те секунди бяха компромисът от времето, когато кешът беше сляп за
 * промените в панела. Вече не е: webhook-ите (product/discount/category +
 * order.created) вдигат epoch-а и обезсилват всичко в секундата на промяната.
 * Дългият прозорец значи, че почти всеки посетител заварва топъл кеш
 * (0.1-0.8 s до първия байт вместо студените 2-4).
 *
 * ⚠️ ИЗКЛЮЧЕНИЕТО: заявките за СТРАНИЦИ (композициите от конструктора и
 * списъкът с флаговете им) остават на 60 s - за тях платформата НЯМА webhook
 * събитие, а точно тях търговецът редактира най-често (банерите на началната).
 * Виж isPageQuery() по-долу.
 *
 * Приети странични ефекти (документирани пред клиента): масов ИМПОРТ на
 * продукти (не-панелен запис, без webhook) и редакция на менюто се виждат до
 * 5 минути.
 */
const FRESH_MS: Record<string, number> = {
  '/api/gql': 5 * 60 * 1000,
  '/api/sf': 5 * 60 * 1000,
};

/** Краткият прозорец за нещата без webhook сигнал: композициите на страници. */
const PAGE_FRESH_MS = 60 * 1000;

/** Заявка за страница/списък страници - и в двата API-та. */
function isPageQuery(body: string): boolean {
  return /\bpage(?:s|ByHandle|BuilderDesign)?\s*\(/.test(body);
}

/** Колко се пази отговорът за черни дни, след като вече не е пресен.
 *
 * Свалено от 1 час на 10 минути (24.08). Часът се оказа прекалено щедър:
 * при 429 залп (точно докато търговецът редактира) витрината показваше
 * съдържание отпреди половин час и изглеждаше, че „панелът не работи".
 * Десет минути покриват реалните залпове от 17.08, а по-дълъг срив бездруго
 * се поема от резервните стойности в самите loader-и. */
const STALE_TTL_S = 10 * 60;

/** Носи се в кеширания отговор, за да се знае дали още е пресен. */
const FRESH_HEADER = 'x-bb-fresh-until';
/** Кога е записан отговорът - сравнява се с epoch-а на панела. */
const STORED_HEADER = 'x-bb-stored-at';

/*
 * Epoch на панела: „всичко, записано преди този момент, не е пресно".
 *
 * Панелът праща webhook при промяна по продукт/отстъпка/категория, а
 * `/bb-sync` вдига epoch-а. Следващото четене на ВСЕКИ кеширан отговор,
 * записан преди epoch-а, тръгва нагоре за нов - без да чака 60-те секунди.
 * Така запис в админа стига до витрината за секунди, не за минути.
 *
 * Ограничения, приети съзнателно:
 * - Cache API-то е на датацентър: webhook-ът опреснява колото, в което
 *   кацне (за България това е същото, което обслужва посетителите).
 * - Старите записи остават като резерва при грешка - epoch-ът маха само
 *   „пресността" им, не тях.
 * - Дебаунс 30 s: залп от записи в панела вдига epoch-а веднъж на половин
 *   минута, за да не подпали лавина от заявки (уроците от 17.08 важат).
 */
const EPOCH_KEY = 'https://bb-cache.internal/v1/sync-epoch';
const EPOCH_HEADER = 'x-bb-epoch';
/* 10 s, не 30 (25.08): при fresh прозорец от 5 минути една „погълната" от
 * дебаунса редакция би се виждала чак след 5 минути, не след 1. По-късият
 * дебаунс свива този прозорец, а пак удържа залповете от панела. */
const EPOCH_DEBOUNCE_MS = 10 * 1000;

/** Вдига epoch-а (ако не е вдиган в последните 30 s). Връща какво е станало. */
export async function bumpSyncEpoch(): Promise<{bumped: boolean; epoch: number}> {
  const cache = await storeCache();
  if (!cache) return {bumped: false, epoch: 0};
  const now = Date.now();
  const hit = await cache.match(EPOCH_KEY).catch(() => null);
  const current = Number(hit?.headers.get(EPOCH_HEADER) ?? 0);
  if (now - current < EPOCH_DEBOUNCE_MS) return {bumped: false, epoch: current};
  await cache
    .put(
      EPOCH_KEY,
      new Response('', {
        headers: {[EPOCH_HEADER]: String(now), 'Cache-Control': 'max-age=86400'},
      }),
    )
    .catch(() => {});
  return {bumped: true, epoch: now};
}

/**
 * Заявка, която докосва човек. Проверява се по ТЯЛОТО на GraphQL заявката.
 *
 * Нарочно е широко: по-добре да не кешираме нещо кешируемо, отколкото двама
 * посетители да си разменят количките.
 */
const PERSONAL =
  /\b(cart|checkout|customer|subscriber|address|coupon)|\border(s|Id|Number)?\b/i;
/* „order" нарочно иска цяла дума: `orderBy` и `sortOrder` са подредба, не
 * поръчка, и биха изключили от кеша точно продуктовите заявки - тоест най-
 * тежките. Днес витрината ползва `sortKey`, но утре може и да не е така. */

/**
 * 🚨 ТЯСНО изключение от `PERSONAL`, и ето защо съществува.
 *
 * `PERSONAL` търси думи в ЦЯЛОТО тяло, включително в имената на полетата. А
 * `cartRules` и `crossSell`/`cartRule` са НАСТРОЙКИ НА ТЪРГОВЕЦА - правилата на
 * количката и кръстосаните оферти, дефинирани в панела. Съдържат думата „cart",
 * но не носят ничия количка, клиент или поръчка.
 *
 * Цената на сляпото правило беше измерена на 03.09.2026 с брояча: обединената
 * заявка за настройките попадаше в `PERSONAL` заради едничкото `cartRules` и
 * затова НИКОГА не се кешираше - 14 излизания нагоре срещу 0 попадения, на
 * всяко зареждане. Тоест обединяването беше направило нещата по-лоши, не
 * по-добри, и точно това обясняваше защо разходът не мръдна (81 → 85/мин).
 *
 * ⚠️ ПРАВИЛОТО ЗА ДОБАВЯНЕ НА ИМЕ ТУК: проверява се, че заявката НЯМА нито
 * `cartId`, нито клиент, нито поръчка, нито каквото и да е, зависещо от
 * посетителя. Име се добавя само за заявка, която НИЕ пишем и контролираме.
 * Сгрешено име тук значи двама посетители да си поделят отговор.
 *
 * Мутациите НЕ минават оттук при никакви обстоятелства - виж `WRITE` по-долу.
 */
const CONFIG_OPS = new Set(['BbConfigBundle', 'BbConfigTail', 'CartOfferDetails']);

/** Името на операцията, за проверката по-горе. */
function opName(body: string): string {
  try {
    return /(?:query|mutation)\s+([A-Za-z0-9_]+)/.exec(body)?.[1] ?? '';
  } catch {
    return '';
  }
}

/** Записва. Никога не се кешира и никога не се слива с друга заявка. */
const WRITE = /\bmutation\b/i;

/**
 * Заявки, които НЕ се кешират, макар да са безобидни за кеша.
 *
 * Бутонът „Преглед" в панела се натиска веднага след запис, а за
 * кръстосаните оферти платформата не праща webhook, тоест epoch-ът не мърда.
 * Кеширан, прегледът би показвал версията отпреди до пет минути и търговецът
 * би решил, че записът не е минал. Натиска се рядко - цената е нищожна.
 */
const LIVE_OPS = new Set(['CrossSellPreview']);

/** Отваря се веднъж на изолат и се пази - `open` е обещание, не стойност. */
let cachePromise: Promise<any> | null = null;

export async function storeCache(): Promise<any | null> {
  const api = (globalThis as any).caches;
  if (!api?.open) return null;
  if (!cachePromise) cachePromise = api.open('bb-store').catch(() => null);
  return cachePromise;
}

interface Plan {
  key: string;
  freshMs: number;
  /** Име на операцията, само за брояча. Не влиза в ключа на кеша. */
  label: string;
}

/* ── Брояч на изходящите заявки ────────────────────────────────────────────
 *
 * ЗАЩО. Обединяването на седемте настройки в една заявка (03.09.2026) НЕ мръдна
 * разхода: 81/мин преди, 85/мин след. Значи бюджетът се яде другаде, а гадаенето
 * кое точно вече веднъж струва половин ден. Този брояч отговаря вместо да се
 * предполага: кой адрес колко пъти наистина е излязъл нагоре, колко пъти е
 * попаднал в кеша и колко пъти изобщо е заобиколил кеша.
 *
 * Живее в паметта на ЕДИН изолат, тоест числата са частични по устройство.
 * Затова се чете и `sinceMs` - интересува ни СЪОТНОШЕНИЕТО и скоростта, не
 * абсолютната сума за целия магазин.
 *
 * Нищо чувствително: само име на операция и брой. Без тела, без токени.
 */
type StatKind = 'upstream' | 'hit' | 'stale' | 'joined' | 'bypass';

interface StatRow {
  upstream: number;
  hit: number;
  stale: number;
  joined: number;
  bypass: number;
}

const stats = new Map<string, StatRow>();
/* ⚠️ НЕ `Date.now()` на ниво модул: в Workers часовникът при зареждане на
 * модула още не е тръгнал и връща 0, тоест „възрастта на изолата" излизаше
 * равна на самия timestamp. Отчита се при първото записване, вътре в заявка. */
let statsSince = 0;

/* ⚠️ Диагностика НИКОГА не бива да е причина за счупена заявка. Всичко тук е в
 * try/catch, а таблицата има таван: изолат, който живее часове, не бива да
 * трупа безкрайно ключове, ако някоя заявка носи променливо име. */
const STATS_MAX_LABELS = 200;

function bump(label: string, kind: StatKind): void {
  try {
    if (!statsSince) statsSince = Date.now();
    let row = stats.get(label);
    if (!row) {
      if (stats.size >= STATS_MAX_LABELS) return;
      row = {upstream: 0, hit: 0, stale: 0, joined: 0, bypass: 0};
      stats.set(label, row);
    }
    row[kind] += 1;
  } catch {
    /* броячът мълчи */
  }
}

/** Снимка на брояча за диагностичния адрес. */
export function getCallStats() {
  const rows = [...stats.entries()]
    .map(([label, v]) => ({label, ...v}))
    .sort((a, b) => b.upstream + b.bypass - (a.upstream + a.bypass));
  const total = rows.reduce(
    (acc, r) => {
      acc.upstream += r.upstream;
      acc.hit += r.hit;
      acc.stale += r.stale;
      acc.joined += r.joined;
      acc.bypass += r.bypass;
      return acc;
    },
    {upstream: 0, hit: 0, stale: 0, joined: 0, bypass: 0},
  );
  const ageMs = statsSince ? Date.now() - statsSince : 0;
  const minutes = Math.max(ageMs / 60000, 0.001);
  return {
    isolateAgeS: Math.round(ageMs / 1000),
    total,
    perMinute: {
      upstream: Math.round((total.upstream / minutes) * 10) / 10,
      bypass: Math.round((total.bypass / minutes) * 10) / 10,
    },
    rows,
  };
}

/** Име на операцията от тялото на заявката: „<endpoint> <OperationName>". */
function opLabel(endpoint: string, body: string): string {
  try {
    const named = /(?:query|mutation)\s+([A-Za-z0-9_]+)/.exec(body);
    if (named) return `${endpoint} ${named[1]}`;
    const root = /[{(]\s*([A-Za-z0-9_]+)\s*[({]/.exec(body);
    return `${endpoint} ${root ? root[1] : 'anon'}`;
  } catch {
    return `${endpoint} ?`;
  }
}

/** Еднакви заявки в един изолат чакат един общ отговор нагоре.
 *
 * 🚨 ТОВА Е ТАБЛИЦА МЕЖДУ ЗАЯВКИ, а обещанието в нея е започнато от ЕДНА от тях.
 *
 * В Cloudflare Workers едно `fetch` принадлежи на заявката, която го е пуснала.
 * Приключи ли тя, средата отменя недовършеното и обещанието не се разрешава
 * НИКОГА - нито успех, нито отказ. А записът се маха само когато обещанието се
 * уреди. Значи ключът остава отровен до края на изолата и всяко следващо
 * зареждане, поискало същата заявка, чака мъртво обещание.
 *
 * Спусъкът беше самата защита: `soft()` се отказва на 6 s, връща резервна
 * стойност и пуска заявката да приключи - а изоставеният fetch остава в
 * таблицата. Оттам двете лица на едно и също повреждане (мерено 02.09.2026):
 *   - четене с краен срок → страница за 6 s с празни парчета. Началната чете
 *     три такива последователно: 18,08 s и нула банера;
 *   - четене без краен срок → увисва и Cloudflare убива заявката. Това беше
 *     500-ката на `/category/probiotik-za-jeni` с подразбираща се подредба.
 * Обяснява и защо „минава от само себе си" (нов изолат = чиста таблица), и защо
 * чупи в тихите часове, а не в пиковете, и защо локално не се възпроизвежда -
 * Node не отменя недовършен fetch, когато отговорът е върнат.
 *
 * Затова три ключалки, всяка достатъчна сама по себе си:
 *   1. `UPSTREAM_DEADLINE_MS` - обещанието ВИНАГИ се урежда;
 *   2. `drop()` по таймер - записът пада дори ако то по някакъв път не се уреди;
 *   3. `keepAlive` - `waitUntil` пази fetch-а жив след края на заявката, която
 *      го е започнала, тоест премахва самата причина.
 */
const inFlight = new Map<string, Promise<{ok: boolean; status: number; text: string}>>();

/** Краен срок на едно излизане нагоре. Под 6-те секунди на `soft()`, за да
 * стигне резервната стойност до посетителя, вместо той да чака. Оставя място и
 * на стълбицата при 429 (300+800+1600 ms плюс четири обиколки). */
const UPSTREAM_DEADLINE_MS = 5000;

/** Просрочване, а не отказ на магазина - двете се лекуват различно. */
class UpstreamTimeout extends Error {}

function withDeadline<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new UpstreamTimeout(`нагоре не отговори за ${ms} ms`)),
      ms,
    );
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/** `ctx.waitUntil` на ТЕКУЩАТА заявка. Подава се от root loader-а на всяко
 * зареждане, защото контекстът е различен за всяка заявка - запомнен веднъж при
 * слагането на обвивката, той щеше да е точно застоялият контекст, който
 * създава проблема. */
let currentWaitUntil: ((p: Promise<unknown>) => void) | null = null;

/** Пази споделения fetch жив след края на заявката, която го е започнала.
 * Хвърли ли (контекстът вече е приключил), просто не се удължава - крайният
 * срок и таймерът пак не позволяват отровен ключ. */
function keepAlive(p: Promise<unknown>): void {
  const w = currentWaitUntil;
  if (!w) return;
  try {
    w(p.then(() => undefined).catch(() => undefined));
  } catch {
    /* контекстът е приключил - нищо за удължаване */
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __bbSharedCacheInstalled: boolean | undefined;
}

function endpointOf(url: string): string | null {
  for (const path of Object.keys(FRESH_MS)) {
    if (url.includes(path)) return path;
  }
  return null;
}

/**
 * Ключът е отпечатък на адреса и тялото. Нарочно SHA-256, а не кратка сметка:
 * при сблъсък два различни въпроса биха получили един отговор, а това е
 * по-лошо от всяка забава.
 */
async function keyFor(url: string, body: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${url}\n${body}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `https://bb-cache.internal/v1/${hex}`;
}

/** Може ли тази заявка да мине през кеша - и с какъв ключ. */
/** Какво изобщо е тази заявка - без решенията за кеша. Ползва се и от брояча,
 * за да се видят и заявките, които заобикалят кеша (мутации, лични данни). */
function readRequest(
  input: any,
  init: any,
): {url: string; method: string; body: string | null} | null {
  if (typeof input === 'string' || input instanceof URL) {
    return {
      url: String(input),
      method: String(init?.method ?? 'GET').toUpperCase(),
      body: typeof init?.body === 'string' ? init.body : null,
    };
  }
  if (input && typeof input === 'object' && typeof input.url === 'string') {
    return {
      url: input.url,
      method: String(init?.method ?? input.method ?? 'GET').toUpperCase(),
      body: typeof init?.body === 'string' ? init.body : null,
    };
  }
  return null;
}

/** Етикет за брояча, или null когато заявката не е към нашите две API-та. */
function labelFor(input: any, init: any): string | null {
  const req = readRequest(input, init);
  if (!req || req.method !== 'POST' || !req.body) return null;
  const endpoint = endpointOf(req.url);
  if (!endpoint) return null;
  return opLabel(endpoint, req.body);
}

async function planFor(input: any, init: any): Promise<Plan | null> {
  let url: string;
  let method: string;
  let body: string | null = null;

  if (typeof input === 'string' || input instanceof URL) {
    url = String(input);
    method = String(init?.method ?? 'GET').toUpperCase();
    body = typeof init?.body === 'string' ? init.body : null;
  } else if (input && typeof input === 'object' && typeof input.url === 'string') {
    url = input.url;
    method = String(init?.method ?? input.method ?? 'GET').toUpperCase();
    if (typeof init?.body === 'string') {
      body = init.body;
    } else if (input.body) {
      /* Тялото живее в самия Request, а Request се чете ВЕДНЪЖ. Кешът обаче
       * вече може да пита магазина повторно (`coldRetry`), тоест `upstream()`
       * трябва да е повторим - иначе вторият опит пада с „тялото вече е
       * прочетено" и превръща един отказ в сигурен провал. Такава заявка не
       * минава оттук: върви направо нагоре, без кеш и без повторение.
       * Днес никой не вика така - всички подават адрес + `body` низ. */
      return null;
    }
  } else {
    return null;
  }

  if (method !== 'POST' || !body) return null;
  const endpoint = endpointOf(url);
  if (!endpoint) return null;
  /* Записът никога не се кешира - без изключения и без проверка на име. */
  if (WRITE.test(body)) return null;
  /* Личното също, освен изрично проверените наши заявки за настройки. */
  if (PERSONAL.test(body) && !CONFIG_OPS.has(opName(body))) return null;
  /* Прегледите от панела четат наживо - виж `LIVE_OPS`. */
  if (LIVE_OPS.has(opName(body))) return null;

  const freshMs = isPageQuery(body) ? PAGE_FRESH_MS : FRESH_MS[endpoint];
  return {key: await keyFor(url, body), freshMs, label: opLabel(endpoint, body)};
}

function json(text: string, status = 200): Response {
  return new Response(text, {status, headers: {'Content-Type': 'application/json'}});
}

/** Чист отговор: минал е и е без грешки в тялото. */
function healthy(out: {ok: boolean; text: string}): boolean {
  return out.ok && !/"errors"\s*:\s*\[/.test(out.text);
}

/**
 * Още два опита, когато НЯМА стар отговор за резерва.
 *
 * Целият този кеш пази посетителя от миговете, в които магазинът откаже: има
 * ли стар отговор, той тръгва вместо грешката. Има обаче един прозорец, в
 * който резерва НЯМА - първото отваряне на адрес след тихо време, когато
 * записът вече е изпаднал от кеша (`STALE_TTL_S` = 10 минути). Точно там
 * един-единствен отказ на магазина стига до посетителя като „500 · Нещо се
 * обърка". Затова сутрин, в най-слабия трафик, а не в пиковете.
 *
 * Мерено: 01.09.2026, 07:57 - `/category/probiotik-za-jeni` върна нашата
 * страница с 500; минути по-късно същият адрес и шестте му подредби минаха
 * 26 от 26 за 0,15-0,75 s. Тоест магазинът е бил наред, а е паднала една
 * заявка на студен кеш.
 *
 * Повтаря се САМО при отказ на пътя - хвърлена заявка (връзката умря) или
 * 5xx от магазина. НЕ се повтаря при:
 *   - 429 - той си има собствена стълбица в `installFetchRetry`, а още
 *     опити само доливат масло в огъня;
 *   - `"errors"` в тялото при код 200 - това е отговор на магазина, не
 *     отказ, и вторият опит ще даде същото (например непознат филтър).
 */
const COLD_RETRY_MS = [300, 900];

type Out = {ok: boolean; status: number; text: string};

/** Отказ на пътя, не отговор по същество - само това си струва повторение. */
function worthRetrying(out: Out | null): boolean {
  return out == null || (!out.ok && out.status >= 500);
}

async function upstreamOnce(
  plan: Plan,
  upstream: () => Promise<Response>,
  cache: Cache | null,
): Promise<Out> {
  bump(plan.label, 'upstream');
  const res = await upstream();
  const out: Out = {ok: res.ok, status: res.status, text: await res.text()};
  // Записът е ТУК, вътре в слятата заявка: иначе десет чакащи биха записали
  // десет пъти един и същи отговор.
  if (cache && healthy(out)) {
    await cache
      .put(
        plan.key,
        new Response(out.text, {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': `max-age=${STALE_TTL_S}`,
            [FRESH_HEADER]: String(Date.now() + plan.freshMs),
            [STORED_HEADER]: String(Date.now()),
          },
        }),
      )
      .catch(() => {});
  }
  return out;
}

/** Връща чист отговор, ако някой от опитите го даде; иначе `null`. */
async function coldRetry(
  plan: Plan,
  upstream: () => Promise<Response>,
  cache: Cache | null,
): Promise<Out | null> {
  for (const wait of COLD_RETRY_MS) {
    await new Promise((done) => setTimeout(done, wait));
    try {
      const out = await upstreamOnce(plan, upstream, cache);
      if (healthy(out)) return out;
      if (!worthRetrying(out)) return null;
    } catch {
      // Пак отказ на пътя - следващият опит е след по-дългото изчакване.
    }
  }
  return null;
}

async function through(
  plan: Plan,
  upstream: () => Promise<Response>,
): Promise<Response> {
  const cache = await storeCache();
  const now = Date.now();
  let stale: string | null = null;

  if (cache) {
    const [hit, epochHit] = await Promise.all([
      cache.match(plan.key).catch(() => null),
      cache.match(EPOCH_KEY).catch(() => null),
    ]);
    const epoch = Number(epochHit?.headers.get(EPOCH_HEADER) ?? 0);
    if (hit) {
      const text = await hit.text().catch(() => null);
      if (text != null) {
        // Пресен = в срока си И записан след последната промяна в панела.
        const fresh =
          Number(hit.headers.get(FRESH_HEADER) ?? 0) > now &&
          Number(hit.headers.get(STORED_HEADER) ?? 0) >= epoch;
        if (fresh) {
          bump(plan.label, 'hit');
          return json(text);
        }
        stale = text;
      }
    }
  }

  let flight = inFlight.get(plan.key);
  if (flight) bump(plan.label, 'joined');
  if (!flight) {
    const started = withDeadline(
      upstreamOnce(plan, upstream, cache),
      UPSTREAM_DEADLINE_MS,
    );
    flight = started;
    inFlight.set(plan.key, flight);
    // Заявката преживява собствения си създател, иначе Workers я отменя и
    // обещанието не се урежда никога - виж бележката при `inFlight`.
    keepAlive(started);
    /* Маха се и при провал - иначе една грешка би заключила ключа завинаги.
     * Сравнението пази нов запис под същия ключ да не бъде изтрит от таймера на
     * стария. */
    const drop = () => {
      if (inFlight.get(plan.key) === started) inFlight.delete(plan.key);
    };
    started.then(drop, drop);
    setTimeout(drop, UPSTREAM_DEADLINE_MS + 500);
  }

  let out: Out | null = null;
  try {
    out = await flight;
  } catch (err) {
    // Мрежата отказа. Старият отговор е по-добър от счупена страница.
    if (stale != null) {
      bump(plan.label, "stale");
      return json(stale);
    }
    /* Просрочилото се НЕ се повтаря тук: `coldRetry` чака 300 и 900 ms и пуска
     * още две обиколки, а извикващият вече е на прага на своите 6 s. Повторният
     * опит би му отнел точно секундите, в които може да покаже страницата. */
    if (err instanceof UpstreamTimeout) throw err;
    const again = await coldRetry(plan, upstream, cache);
    if (again) return json(again.text, again.status);
    throw err;
  }

  if (healthy(out)) return json(out.text, out.status);

  // Магазинът отказа (429 или 5xx). Ако имаме стар отговор - той върши работа.
  if (stale != null) {
    bump(plan.label, "stale");
    return json(stale);
  }

  // Няма и стар. Преди посетителят да види грешка, магазинът се пита пак -
  // но само ако е отказал по пътя, не ако е отговорил по същество.
  if (worthRetrying(out)) {
    const again = await coldRetry(plan, upstream, cache);
    if (again) return json(again.text, again.status);
  }
  return json(out.text, out.status);
}

/**
 * Слага се ВЪРХУ повторенията при 429, не под тях: попадне ли се в кеша, нагоре
 * не тръгва нищо - нито първи опит, нито повторение.
 */
export function installSharedCache(waitUntil?: unknown): void {
  /* Извън проверката „вече сложена": обвивката се слага веднъж на изолат, но
   * контекстът на заявката е нов при всяко зареждане и трябва да се обнови. */
  currentWaitUntil = typeof waitUntil === 'function' ? (waitUntil as any) : null;

  if (typeof globalThis.fetch !== 'function') return;
  if (globalThis.__bbSharedCacheInstalled) return;
  globalThis.__bbSharedCacheInstalled = true;

  const next = globalThis.fetch.bind(globalThis);

  globalThis.fetch = async function bbFetchShared(input: any, init?: any) {
    let plan: Plan | null = null;
    try {
      plan = await planFor(input, init);
    } catch {
      plan = null;
    }
    if (!plan) {
      /* Заобикаля кеша: мутация или лични данни. Точно тези не се виждаха
       * никъде досега, а може да са голяма част от разхода. */
      try {
        const label = labelFor(input, init);
        if (label) bump(label, 'bypass');
      } catch {
        /* броячът никога не спира заявка */
      }
      return next(input, init);
    }
    try {
      return await through(plan, () => next(input, init));
    } catch {
      // Кешът никога не бива да е причината за провал.
      return next(input, init);
    }
  } as typeof fetch;
}
