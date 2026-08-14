/**
 * Едно повторение, когато магазинът каже „твърде много заявки".
 *
 * ЗАЩО. Всяка страница дърпа по десетина неща от магазина - витрина, меню,
 * етикети, оферти, продукти. Отворят ли се няколко различни страници наведнъж,
 * снопът заявки надхвърля допустимото и Storefront API-то отговаря 429. Дотук
 * това хвърляше в loader-а и посетителят виждаше 500.
 *
 * Измерено на живо (14.08): двайсет различни адреса едновременно дадоха 33 от
 * 60 отговора с код 500, а истинската грешка е
 * „StorefrontApiError: Storefront API request failed: 429 Too Many Requests".
 * Провалите бяха най-бързите отговори - 0,19 сек. срещу 0,32 при успелите -
 * защото 429 се връща веднага, без да се върши работа. Поединично същите
 * адреси минаваха 12 от 12.
 *
 * КАК. `fetch` на работника се обвива веднъж на изолат. Само при 429 се чака
 * малко и се опитва повторно - веднъж. Изчакването е с разбъркване, за да не
 * тръгнат всички заявки наново в един и същи миг и да не се получи същият сноп.
 *
 * Нарочно НЕ се повтаря при други кодове: 4xx означава, че заявката е сгрешена,
 * а 5xx на магазина си е негов проблем - повторението само би удвоило товара.
 * Нарочно е само ЕДНО повторение: целта е да се преживее миг на претоварване,
 * не да се настоява.
 *
 * Това е кръпка, не лек. Истинското решение е страницата да иска по-малко неща
 * наведнъж - виж бележката за root loader-а.
 */

const RETRY_AFTER_MS = 260;
const JITTER_MS = 240;

declare global {
  // eslint-disable-next-line no-var
  var __bbFetchRetryInstalled: boolean | undefined;
}

export function installFetchRetry(): void {
  if (typeof globalThis.fetch !== 'function') return;
  if (globalThis.__bbFetchRetryInstalled) return;
  globalThis.__bbFetchRetryInstalled = true;

  const original = globalThis.fetch.bind(globalThis);

  globalThis.fetch = async function bbFetchWithRetry(input: any, init?: any) {
    const res = await original(input, init);
    if (res.status !== 429) return res;

    // Тялото на първия отговор не се чете - просто се изхвърля.
    const wait = RETRY_AFTER_MS + Math.floor(Math.random() * JITTER_MS);
    await new Promise((done) => setTimeout(done, wait));

    try {
      return await original(input, init);
    } catch {
      // Провали ли се и повторният опит, връща се първият отговор, за да
      // остане поведението такова, каквото извикващият очаква.
      return res;
    }
  } as typeof fetch;
}
