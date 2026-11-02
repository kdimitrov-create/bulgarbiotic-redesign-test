import {envValue} from './env.server';

/**
 * Записване на абонати за бюлетина.
 *
 * Защо през Admin GraphQL, а не през REST-а от документацията
 * (developers.cloudcart.com/2.0/subscribers-create):
 *
 *  1. REST-ът е зад плана на магазина. Измерено на 2026-08-10 срещу тестовия:
 *     всяка заявка към `/api/v2/subscribers` връща 429 с „You do not have API
 *     access on your current plan". Тоест попъпът щеше да мълчи на живо.
 *  2. Дори да беше отворен, `POST /subscribers` НЯМА поле за имейл. Имейлът
 *     живее в отделен ресурс (`subscribers-channels`), тоест едно записване е
 *     два записа и ако вторият падне, в админа остава абонат без имейл.
 *  3. PAT-ът, с който вече четем менюта, страници и промо кодове, работи и на
 *     двата магазина - без нов ключ и без нова настройка при пускането.
 *
 * Двете стъпки тук са точно тези, които клиентът поиска: първо проверка дали
 * такъв абонат вече съществува, чак после създаване.
 *
 * SERVER ONLY: `.server.ts` пази PAT-а извън клиентския бъндъл.
 */

const REQUEST_TIMEOUT_MS = 8000;

export type SubscribeOutcome = 'created' | 'exists' | 'updated' | 'error';

/**
 * Токенът на администратора.
 *
 * ⚠️ Двете имена не са прищявка: Nova е записвала променливата и като
 * `CLOUDCARTADMINPAT`, без долни черти. Измерено 2026-08-10 - работникът на
 * тестовия магазин връщаше `no-pat` при първото име и заработи с второто.
 * Всички останали помощници тук четат по същия начин.
 */
function adminToken(env: Record<string, string | undefined>): string | undefined {
  return envValue(env, 'CLOUDCART_ADMIN_PAT') || envValue(env, 'CLOUDCARTADMINPAT');
}

function adminOrigin(env: Record<string, string | undefined>): string | null {
  const raw = envValue(env, 'PUBLIC_API_ORIGIN') || envValue(env, 'PUBLIC_STORE_DOMAIN');
  if (!raw) return null;
  return raw.startsWith('http') ? raw.replace(/\/$/, '') : `https://${raw}`;
}

async function gql<T>(
  origin: string,
  pat: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${origin}/api/gql`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Authorization: `Bearer ${pat}`},
      body: JSON.stringify({query, variables}),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`admin api ${res.status}`);
    const json = (await res.json()) as {data?: T; errors?: Array<{message: string}>};
    if (json.errors?.length) throw new Error(json.errors[0].message);
    return json.data ?? null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Стъпка 1 - кандидатите. Само идентификатори.
 *
 * ⚠️ Каналите НЕ се искат тук нарочно. Списъчната заявка ги връща празни за
 * абонат, който не приема маркетинг - същият капан като при етикетите и
 * офертите. Проверено 2026-08-10: за такъв абонат `subscribers` дава
 * `channels: []`, а `subscriber(id:)` връща имейла с `marketing: false`.
 * Тоест проверка само по списъка обявява „няма такъв" точно за хората, които
 * този код трябва да разпознае.
 */
const FIND = `query FindSubscriber($filters: SubscriberFilters) {
  subscribers(first: 20, filters: $filters) { edges { node { id } } }
}`;

const IMPORT = `mutation AddSubscriber($subscribers: [BatchSubscriberInput!]) {
  subscribersBulkImport(subscribers: $subscribers) { queuedCount failedCount }
}`;

/**
 * Само етикетира вече съществуващ абонат. Нищо не създава.
 *
 * Ползва се за втория ход от страницата: ако абонатът още не се е появил в
 * търсачката, връща `false` и толкова - по-добре без етикет, отколкото втори
 * запис със същия имейл.
 */
export async function tagExistingSubscriber(
  env: Record<string, string | undefined>,
  email: string,
  tags: string[],
): Promise<boolean> {
  const pat = adminToken(env);
  const origin = adminOrigin(env);
  if (!pat || !origin || !tags.length) return false;
  try {
    const match = await findByEmail(origin, pat, email.trim());
    if (!match) return false;
    await gql(origin, pat, TAG, {ids: [match.id], tags});
    return true;
  } catch (error) {
    console.error('абонати: етикетът не се сложи -', (error as Error).message);
    return false;
  }
}

/**
 * Изчаква опашката да създаде абоната и чак тогава го етикетира.
 *
 * Записването е опашка, не директен ред - новият абонат се появява до няколко
 * секунди (веднъж мерено над минута). Затова не се чака в самата заявка:
 * подава се на работника чрез `waitUntil` и посетителят получава отговор
 * веднага. Няма ли такъв (местна среда), чака се кратко и толкова.
 */
function tagWhenReady(
  env: Record<string, string | undefined>,
  origin: string,
  pat: string,
  email: string,
  tags: string[],
): void {
  const work = (async () => {
    for (let attempt = 0; attempt < 8; attempt++) {
      const match = await findByEmail(origin, pat, email).catch(() => null);
      if (match) {
        await gql(origin, pat, TAG, {ids: [match.id], tags});
        return;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    console.error('абонати: етикетът не се сложи - абонатът не се появи навреме:', email);
  })().catch((error) => console.error('абонати: етикетът не се сложи -', (error as Error).message));

  const waitUntil = (env as any).__waitUntil;
  if (typeof waitUntil === 'function') waitUntil(work);
}

/** Слага етикети на вече съществуващ абонат. */
const TAG = `mutation TagSubscriber($ids: [ID!]!, $tags: [String!]!) {
  tagSubscribers(ids: $ids, tags: $tags)
}`;

/** Вдига съгласието за маркетинг на вече съществуващ абонат. */
const ALLOW = `mutation AllowMarketing($ids: [ID!]!) {
  setSubscribersMarketing(ids: $ids, allow: true)
}`;

type Match = {
  id: string;
  /** Приема ли вече маркетинг по този имейл. */
  marketing: boolean;
};

/**
 * Позволяваме само това, което наистина е имейл, и режем дългите низове -
 * полето е публично и всичко, което влезе тук, отива в списъка на клиента.
 */
export function isValidEmail(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  return v.length >= 6 && v.length <= 190 && /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v);
}

/**
 * Абонатът с точно този имейл, ако го има.
 *
 * Две заявки, защото едната не стига:
 *  1. `subscribers(filters: {search})` дава кандидатите. Търсенето е свободно,
 *     не точно съвпадение - за „ivan@abv.bg" връща и „ivan@abv.bg.com".
 *  2. `subscriber(id:)` за всеки кандидат, всички в една заявка с aliases,
 *     защото само оттам идват истинските канали.
 *
 * Хвърля при проблем с администраторското API, за да не се обърка „не можах да
 * проверя" с „няма такъв" - второто води до създаване на дубликат.
 */
async function findByEmail(origin: string, pat: string, email: string): Promise<Match | null> {
  const needle = email.trim().toLowerCase();

  // Търсенето е с изоставане: абонат, създаден преди секунди, понякога още не
  // се намира (измерено 2026-08-10 - веднъж за 3 секунди, друг път над минута).
  // За реален посетител това няма значение, защото стар абонат отдавна е в
  // индекса; заслужава си само да се знае при проби едно след друго.
  const found = await gql<{subscribers: {edges: Array<{node: {id: string}}>}}>(
    origin,
    pat,
    FIND,
    {filters: {search: needle}},
  );
  const ids = (found?.subscribers?.edges ?? []).map((e) => String(e.node?.id)).filter(Boolean);
  if (!ids.length) return null;

  const fields = ids
    .map((id) => `s${id}: subscriber(id: "${id}") { id channels { channelIdentifier marketing unsubscribed } }`)
    .join(' ');
  const detailed = await gql<Record<string, {
    id: string;
    channels: Array<{channelIdentifier: string; marketing: boolean; unsubscribed: boolean}>;
  } | null>>(origin, pat, `query { ${fields} }`, {});

  for (const row of Object.values(detailed ?? {})) {
    for (const ch of row?.channels ?? []) {
      if (String(ch.channelIdentifier ?? '').trim().toLowerCase() !== needle) continue;
      // Отписаният брои за „не приема" - човекът пред формата тъкмо даде
      // ново съгласие, значи трябва да се вдигне, а не да му се каже „вече си".
      return {id: String(row!.id), marketing: ch.marketing === true && ch.unsubscribed !== true};
    }
  }
  return null;
}

/**
 * Записва абоната и връща какво точно се е случило.
 *
 * Три изхода по същество:
 *  - няма такъв → създава се
 *  - има такъв и приема маркетинг → нищо не се пипа
 *  - има такъв, но НЕ приема маркетинг → съгласието се вдига
 *
 * Последното не става с повторен import: проверено 2026-08-10, вторият import
 * със същия имейл и `marketing: true` остави `acceptMarketing: false`.
 * Единственото, което го мени, е `setSubscribersMarketing`.
 *
 * `marketing: true` се подава само защото извикващият вече е взел изричното
 * съгласие - маршрутът отказва заявка без него.
 */
/**
 * Записва имейл за бюлетина и по желание го етикетира.
 *
 * Етикетът казва ОТКЪДЕ е дошъл абонатът - попъпът пише „popup-nl". Слага се и
 * на нов, и на вече съществуващ абонат: човек, който се записва втори път от
 * попъпа, също е дошъл оттам и клиентът иска да го вижда в същия списък.
 */
export async function subscribeEmail(
  env: Record<string, string | undefined>,
  email: string,
  tags: string[] = [],
): Promise<SubscribeOutcome> {
  const pat = adminToken(env);
  const origin = adminOrigin(env);
  if (!pat || !origin) return 'error';

  const clean = email.trim();
  try {
    const match = await findByEmail(origin, pat, clean);

    if (match) {
      // Етикетът е самостоятелен: слага се и когато абонатът вече приема
      // маркетинг, иначе вторият запис от попъпа не оставя следа.
      if (tags.length) {
        await gql(origin, pat, TAG, {ids: [match.id], tags}).catch((error) =>
          console.error('абонати: етикетът не се сложи -', (error as Error).message),
        );
      }
      if (match.marketing) return 'exists';
      const allowed = await gql<{setSubscribersMarketing: boolean}>(origin, pat, ALLOW, {
        ids: [match.id],
      });
      return allowed?.setSubscribersMarketing ? 'updated' : 'error';
    }

    const res = await gql<{subscribersBulkImport: {queuedCount: number; failedCount: number}}>(
      origin,
      pat,
      IMPORT,
      {subscribers: [{email: clean, marketing: true, country: 'BG'}]},
    );
    const out = res?.subscribersBulkImport;
    // Записването е опашка, не директен ред: връща се брой поставени задачи,
    // не самият абонат. Измерено 2026-08-10 - абонатът се появява до 2 секунди.
    if (!out || out.queuedCount < 1 || out.failedCount > 0) return 'error';
    /* Етикетът се слага СЛЕД създаването.
     * `subscribersBulkImport` приема поле `tags` и го подминава мълчаливо -
     * проверено на живо 17.08.2026: заявката минава (`queuedCount: 1`), а
     * абонатът излиза с `tags: []`. Затова етикетът минава през
     * `tagSubscribers`, а той иска номера на вече съществуващ абонат. */
    if (tags.length) tagWhenReady(env, origin, pat, clean, tags);
    return 'created';
  } catch (error) {
    console.error('абонати: записването не мина -', (error as Error).message);
    return 'error';
  }
}

/**
 * Отписване по имейл, за страницата на `/subscribers/subscriptions/<хеш>`.
 *
 * ⚠️ Защо по имейл, а не по хеша от писмото. Линкът в писмото носи шифрован
 * с ключа на платформата блок (`{"iv":…,"value":…,"mac":…}`), който само тя
 * може да разчете. След насочването на домейна този адрес е наш и връщаше
 * 404, тоест отписването изобщо не работеше - виж маршрута за целия разказ.
 * Оттук нататък човекът потвърждава адреса си и толкова.
 *
 * `setSubscribersMarketing(allow: false)` е същото действие, което търговецът
 * прави от панела: абонатът остава в списъка, но спира да получава кампании.
 *
 * Връща `done` и когато такъв абонат няма. Страницата отговаря с едно и също
 * изречение в двата случая, за да не се превърне адресът в проверка кой имейл
 * е в списъка на клиента - същото съображение като при входа с код.
 */
const UNSUBSCRIBE = `mutation Unsubscribe($ids: [ID!]!) {
  setSubscribersMarketing(ids: $ids, allow: false)
}`;

export async function unsubscribeEmail(
  env: Record<string, string | undefined>,
  email: string,
): Promise<'done' | 'error'> {
  const pat = adminToken(env);
  const origin = adminOrigin(env);
  if (!pat || !origin) return 'error';

  try {
    const match = await findByEmail(origin, pat, email.trim());
    if (!match) return 'done';
    const res = await gql<{setSubscribersMarketing: boolean}>(origin, pat, UNSUBSCRIBE, {
      ids: [match.id],
    });
    return res?.setSubscribersMarketing === true ? 'done' : 'error';
  } catch (error) {
    console.error('отписване: %s', (error as Error).message);
    return 'error';
  }
}
