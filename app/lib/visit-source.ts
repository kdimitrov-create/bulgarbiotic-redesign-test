/**
 * Откъде е дошъл посетителят - за „Продажби по източник на трафик".
 *
 * ## Какво липсваше
 *
 * Класическата тема живееше в сесията на платформата, затова платформата сама
 * виждаше адреса, с който човекът е влязъл, и referrer-а. Nitrogen витрината е
 * отделен stack: „GraphQL заявка няма сесия и няма своя landing страница, тоест
 * нищо не може да се изведе - без това извикване поръчката се записва без
 * никакъв източник и справката я показва като директен трафик" (дословно от
 * описанието на `cartAttributionUpdate` в Storefront API-то).
 *
 * Затова целият отчет стоеше празен, откакто дизайнът е на живо.
 *
 * ## Как се пълни
 *
 * 1. Първата заявка за страница в едно посещение прибира тук адреса на
 *    кацането и външния referrer (това cookie).
 * 2. При създаване на количка и при тръгване към касата се вика
 *    `cartAttributionUpdate` с тях. Платформата вади utm-ите, `gclid`, `fbclid`
 *    и групирането на трафика „със същия класификатор, който ползва собствената
 *    витрина на търговеца" - тоест подава се адресът, не разчепкани полета.
 *
 * ⚠️ `landingUrl` е от тип `URL` в схемата: невалиден адрес НЕ е тиха грешка, а
 * отхвърлена заявка. Затова се пази само това, което `new URL()` е приело.
 *
 * ## Защо cookie-то се обновява
 *
 * Прозорецът е едно посещение. Сесията на платформата беше ПЛЪЗГАЩА се - всяка
 * заявка я удължаваше. Фиксирани 2 часа биха губили дългите разглеждания,
 * затова cookie-то се презаписва, когато е по-старо от 30 минути. Не на всяка
 * заявка: `Set-Cookie` на всеки отговор би направил всяка страница нечуплива за
 * кеш.
 */

/** Cookie-то, което носи кацането през посещението. */
export const VISIT_COOKIE = 'bb_src';

/** Прозорецът на посещението, колкото е и сесията на платформата. */
export const VISIT_TTL_SECONDS = 2 * 60 * 60;

/** По-често от това cookie-то не се пипа. */
const REFRESH_AFTER_MS = 30 * 60 * 1000;

/** Дълъг адрес не бива да надува всяка заявка. */
const MAX_URL_LENGTH = 900;

export type VisitSource = {
  /** Пълният адрес, с който посетителят е влязъл. */
  landingUrl: string;
  /** Външният referrer, ако браузърът го е дал. */
  referrer: string | null;
  /** Кога е записано, в милисекунди. */
  at: number;
};

/** Прочита cookie-то. Повредено се брои за липсващо. */
export function readVisitCookie(cookieHeader: string | null | undefined): VisitSource | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() !== VISIT_COOKIE) continue;
    const [rawUrl, rawRef, rawAt] = part.slice(eq + 1).trim().split('|');
    try {
      const landingUrl = decodeURIComponent(rawUrl ?? '');
      if (!landingUrl) return null;
      // Пази се само адрес, който API-то ще приеме.
      new URL(landingUrl);
      const referrer = rawRef ? decodeURIComponent(rawRef) : '';
      return {landingUrl, referrer: referrer || null, at: Number(rawAt) || 0};
    } catch {
      return null;
    }
  }
  return null;
}

function serialize(source: VisitSource): string {
  const value = [
    encodeURIComponent(source.landingUrl),
    encodeURIComponent(source.referrer ?? ''),
    String(source.at),
  ].join('|');
  return `${VISIT_COOKIE}=${value}; Path=/; Max-Age=${VISIT_TTL_SECONDS}; Secure; HttpOnly; SameSite=Lax`;
}

/**
 * Изпраща ли се `Set-Cookie` за тази заявка, и с какво.
 *
 * Връща `null`, когато няма какво да се прави - тоест по-голямата част от
 * заявките минават без нито един допълнителен байт в отговора.
 */
export function nextVisitCookie(
  existing: VisitSource | null,
  url: URL,
  referrerHeader: string | null | undefined,
  now: number,
): string | null {
  if (existing) {
    // Същото посещение: само удължаваме, и то рядко.
    if (now - existing.at < REFRESH_AFTER_MS) return null;
    return serialize({...existing, at: now});
  }

  const landingUrl = url.href.length <= MAX_URL_LENGTH ? url.href : url.origin + url.pathname;
  return serialize({landingUrl, referrer: externalReferrer(referrerHeader, url), at: now});
}

/**
 * Referrer-ът, само когато наистина е отвън.
 *
 * Вътрешната навигация не е източник на трафик. Тя и без това рядко стига
 * дотук (cookie-то вече съществува), но първата заявка след изтекъл прозорец
 * може да носи собствения ни адрес - него не го записваме.
 */
function externalReferrer(referrerHeader: string | null | undefined, url: URL): string | null {
  if (!referrerHeader || referrerHeader.length > MAX_URL_LENGTH) return null;
  try {
    const ref = new URL(referrerHeader);
    if (ref.hostname === url.hostname) return null;
    return ref.href;
  } catch {
    return null;
  }
}

/**
 * Заявка за страница ли е това.
 *
 * Кацането се записва само при истинска навигация. `Sec-Fetch-Dest` го казва
 * точно и се праща от всички съвременни браузъри; липсва ли, падаме на
 * `Accept`. Така данните на React Router (`.data`), снимките и шрифтовете не
 * се броят за кацане.
 */
export function isDocumentRequest(request: Request, url: URL): boolean {
  const dest = request.headers.get('Sec-Fetch-Dest');
  if (dest) return dest === 'document';
  if (url.pathname.endsWith('.data')) return false;
  return (request.headers.get('Accept') || '').includes('text/html');
}
