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

export type SubscribeOutcome = 'created' | 'exists' | 'error';

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

const FIND = `query FindSubscriber($filters: SubscriberFilters) {
  subscribers(first: 20, filters: $filters) {
    edges { node { id channels { channel channelIdentifier } } }
  }
}`;

const IMPORT = `mutation AddSubscriber($subscribers: [BatchSubscriberInput!]) {
  subscribersBulkImport(subscribers: $subscribers) { queuedCount failedCount }
}`;

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
 * Има ли вече абонат с този имейл.
 *
 * `filters.search` е свободно търсене, не точно съвпадение - за „ivan@abv.bg"
 * може да върне и „ivan@abv.bg.com". Затова резултатът се проверява канал по
 * канал. Връща `null`, когато проверката изобщо не е могла да се направи, за
 * да не мине създаване върху непроверена основа.
 */
export async function subscriberExists(
  env: Record<string, string | undefined>,
  email: string,
): Promise<boolean | null> {
  const pat = adminToken(env);
  const origin = adminOrigin(env);
  if (!pat || !origin) return null;

  const needle = email.trim().toLowerCase();
  try {
    const found = await gql<{
      subscribers: {edges: Array<{node: {channels: Array<{channel: string; channelIdentifier: string}>}}>};
    }>(origin, pat, FIND, {filters: {search: needle}});

    for (const edge of found?.subscribers?.edges ?? []) {
      for (const ch of edge.node?.channels ?? []) {
        if (String(ch.channelIdentifier ?? '').trim().toLowerCase() === needle) return true;
      }
    }
    return false;
  } catch (error) {
    console.error('абонати: проверката не мина -', (error as Error).message);
    return null;
  }
}

/**
 * Проверява и, ако няма такъв, създава абонат със съгласие за маркетинг.
 *
 * `marketing: true` се подава само защото извикващият вече е взел изричното
 * съгласие - маршрутът отказва заявка без него.
 */
export async function subscribeEmail(
  env: Record<string, string | undefined>,
  email: string,
): Promise<SubscribeOutcome> {
  const pat = adminToken(env);
  const origin = adminOrigin(env);
  if (!pat || !origin) return 'error';

  const clean = email.trim();
  const exists = await subscriberExists(env, clean);
  if (exists === null) return 'error';
  if (exists) return 'exists';

  try {
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
    return 'created';
  } catch (error) {
    console.error('абонати: записването не мина -', (error as Error).message);
    return 'error';
  }
}
