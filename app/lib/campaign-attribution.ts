/**
 * Приписването на поръчка към кампания от Marketing Suite.
 *
 * ## Какво се счупи и защо
 *
 * Линкът в имейл кампания води до магазина с два параметъра: `cc_campaign`
 * (кодиран блок с кампания, стъпка, канал и абонат) и `cc_subscriber`.
 * Класическата тема ги прочиташе при кацането, записваше кампанията в
 * СЕСИЯТА НА ПЛАТФОРМАТА (cookie `_ccs`) и правеше 302 към чистия адрес.
 * Малко след създаването на поръчката опашка на платформата я подпечатва с
 * `cc_campaign_id`, `cc_campaign_action_id`, канал и абонат. Прозорецът е
 * дължината на сесията, около 2 часа, и последният клик печели.
 *
 * След прехвърлянето на дизайна домейнът се обслужва от този worker. Той не
 * познава `cc_campaign`, не звъни на платформата и сесия не се пише - значи
 * поръчката остава непечатана.
 *
 * Мерено на живо 26.08.2026:
 *
 *   GET https://gumi-dk.bg/?cc_campaign=X&cc_subscriber=Y   (класическа тема)
 *     → 302 към /?cc_campaign=X  + Set-Cookie: _ccs, uuid, XSRF-TOKEN
 *   GET https://bulgarbiotic.bg/?cc_campaign=X&cc_subscriber=Y  (този worker)
 *     → 200. Без redirect, без cookie, платформата не разбира за клика.
 *
 * Числата: изпратени, отворени и кликове са напълно здрави (18.08: 84 594
 * изпратени, 3 559 отворени, 302 кликнати), а приписаните поръчки паднаха от
 * ~8,8 на ден (09-16.08) на ~1,5 на ден (17-26.08). Остатъкът се обяснява с
 * abandoned cart имейлите, чийто бутон сочи буквално `/checkout` - един от
 * малкото пътища, които платформата още обслужва сама.
 *
 * ## Как се връща
 *
 * Поръчката още се ражда в касата на платформата: `/checkout-start` праща
 * браузъра на `/checkout/adopt/<jwt>` на същия домейн. Значи сесията, в която
 * се създава поръчката, е достижима - трябва само да ѝ подадем кампанията.
 *
 *  1. `server.ts` вижда параметрите при кацането и ги прибира в това cookie.
 *     БЕЗ redirect: на този сайт има отворен проблем с мъртви заявки и всеки
 *     допълнителен hop е още един шанс посетителят да увисне точно при
 *     най-скъпия трафик. Адресът се чисти козметично от браузъра, след
 *     хидратация (`useCampaignUrlCleanup`).
 *  2. `/checkout-start` прави adopt на заден план и чак след него отваря
 *     `/checkout?cc_campaign=…`, тоест платформата чете кампанията в сесията,
 *     в която количката вече е. Виж `campaignHandoff` в
 *     `app/routes/checkout-start.tsx`.
 *
 * 🛑 Първата версия (26.08) беше счупена на ДВЕ места и не приписа нищо:
 *
 *   • таванът на стойността беше 512 знака, а истинският `cc_campaign` е
 *     шифрован блок на платформата - 742 знака в мерен линк от 23.09.2026.
 *     Тоест cookie изобщо не се записваше. Тестът тогава е минал с къс
 *     измислен блок.
 *   • параметрите се закачаха на САМИЯ adopt адрес, а adopt пренасочва към
 *     гол `/checkout` и ги изпуска.
 *
 * Мерено в поръчките (15.09.2026): от 17.08 до 15.09 са приписани 26 от 4 499
 * поръчки (0,6%) срещу 707 от 10 612 (6,7%) между 01.07 и 16.08. Всички
 * обикновени кампании след 18.08 са с нула поръчки при нормални кликове.
 *
 * Поуката: касата, която се отваря, не доказва нищо, както и блок, който сме
 * измислили сами. Доказателство е поръчка с `cc_campaign_id` в метаданните,
 * тръгнала от истински линк.
 *
 * Подаден боклук (`TESTBLOB` вместо валиден блок) просто се изхвърля и касата
 * се отваря нормално - тоест повреден или изтекъл параметър не може да счупи
 * плащането.
 *
 * ⚠️ Живот 2 часа НАРОЧНО. По-дълго cookie би приписало поръчки, които
 * класическата тема никога не би приписала, и сравнението „преди/след" щеше
 * да лъже в наша полза.
 */

/** Параметрите, с които Marketing Suite бележи кликнатия линк. */
export const CAMPAIGN_PARAM = 'cc_campaign';
export const SUBSCRIBER_PARAM = 'cc_subscriber';
export const CAMPAIGN_PARAMS = [CAMPAIGN_PARAM, SUBSCRIBER_PARAM] as const;

/** Нашето cookie между кацането и касата. */
export const CAMPAIGN_COOKIE = 'bb_camp';

/** Колкото е и прозорецът на платформата. Виж коментара горе. */
export const CAMPAIGN_TTL_SECONDS = 2 * 60 * 60;

/* Блокът на платформата е шифрован JSON (`iv`/`value`/`mac`), не къс идентификатор:
 * мерен линк от 23.09.2026 носи 742 знака в `cc_campaign` и 292 в `cc_subscriber`.
 * Таванът е предпазител срещу надут адрес, не срещу нормален линк, затова е доста
 * над мереното. Двете стойности се побират в едно cookie с голям запас под 4 KB. */
const MAX_VALUE_LENGTH = 2048;

/* Какво допускаме в стойността, ДОСЛОВНО както е дошла по жицата: букви,
 * цифри и знаците, които се срещат в base64 / base64url / percent-escape.
 * Всичко друго се отхвърля, което покрива и пренасяне на ред в заглавка. */
const SAFE_RAW = /^[A-Za-z0-9._~%+/=-]+$/;

export type CampaignAttribution = {
  /** Дословната стойност от адреса, без нито едно декодиране. Виж `readRawParam`. */
  campaign: string;
  subscriber: string | null;
};

/**
 * Стойност на параметър, взета ДОСЛОВНО от низа на заявката.
 *
 * ⚠️ Нарочно НЕ през `URLSearchParams`. Блокът на платформата е base64-подобен
 * и може да съдържа `+`, а `searchParams.get` го превръща в интервал по
 * правилата на формите. Прочетем ли така и после запишем обратно, подаваме на
 * платформата друга стойност от тази, която тя е издала - и приписването
 * просто няма да сработи, при това мълчаливо.
 *
 * Затова се пренася байт по байт: каквото е дошло, това се връща.
 */
function readRawParam(search: string, name: string): string | null {
  const query = search.startsWith('?') ? search.slice(1) : search;
  if (!query) return null;
  for (const pair of query.split('&')) {
    const eq = pair.indexOf('=');
    if (eq < 0) continue;
    if (pair.slice(0, eq) !== name) continue;
    const raw = pair.slice(eq + 1);
    if (!raw || raw.length > MAX_VALUE_LENGTH || !SAFE_RAW.test(raw)) return null;
    return raw;
  }
  return null;
}

/** Има ли кликнат кампаниен линк в този адрес. */
export function readCampaignFromUrl(url: URL): CampaignAttribution | null {
  const campaign = readRawParam(url.search, CAMPAIGN_PARAM);
  if (!campaign) return null;
  return {campaign, subscriber: readRawParam(url.search, SUBSCRIBER_PARAM)};
}

/**
 * Готовата стойност за `Set-Cookie`.
 *
 * `HttpOnly`, защото никой в браузъра няма работа с нея. `SameSite=Lax` е
 * достатъчно: кацането от имейл е навигация от най-горно ниво, а касата е на
 * същия домейн.
 */
export function campaignSetCookie(attr: CampaignAttribution): string {
  const value = [encodeURIComponent(attr.campaign), encodeURIComponent(attr.subscriber ?? '')].join('|');
  return `${CAMPAIGN_COOKIE}=${value}; Path=/; Max-Age=${CAMPAIGN_TTL_SECONDS}; Secure; HttpOnly; SameSite=Lax`;
}

/** Обратното четене, от заглавката `Cookie` на заявката. */
export function readCampaignCookie(cookieHeader: string | null | undefined): CampaignAttribution | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() !== CAMPAIGN_COOKIE) continue;
    const [storedCampaign, storedSubscriber] = part.slice(eq + 1).trim().split('|');
    try {
      const campaign = decodeURIComponent(storedCampaign ?? '');
      if (!campaign || campaign.length > MAX_VALUE_LENGTH || !SAFE_RAW.test(campaign)) return null;
      const subscriber = decodeURIComponent(storedSubscriber ?? '');
      return {
        campaign,
        subscriber: subscriber && subscriber.length <= MAX_VALUE_LENGTH && SAFE_RAW.test(subscriber) ? subscriber : null,
      };
    } catch {
      // Повредено cookie не бива да чупи касата.
      return null;
    }
  }
  return null;
}

/**
 * Закача кампанията към адреса на касата.
 *
 * Слепва се като низ, а не през `URLSearchParams`: стойността вече е точно
 * това, което платформата е сложила в линка, и трябва да ѝ се върне дословно.
 *
 * Връща адреса непокътнат, ако няма какво да се закачи - тоест пътят към
 * плащане остава днешният за всеки, който не е дошъл от кампания.
 */
export function withCampaignParams(target: string, attr: CampaignAttribution | null): string {
  if (!attr || target.includes(`${CAMPAIGN_PARAM}=`)) return target;
  const [withoutHash, hash] = target.split('#', 2);
  const separator = withoutHash.includes('?') ? '&' : '?';
  const subscriber = attr.subscriber ? `&${SUBSCRIBER_PARAM}=${attr.subscriber}` : '';
  return `${withoutHash}${separator}${CAMPAIGN_PARAM}=${attr.campaign}${subscriber}${hash ? `#${hash}` : ''}`;
}

/**
 * Изключвателят. Липсва ли променливата, механизмът е ВКЛЮЧЕН - изключва се
 * само с изричното `CAMPAIGN_ATTRIBUTION=off` (или `0` / `false`) и един
 * deploy, без да се пипа код.
 */
export function campaignAttributionEnabled(value: string | undefined | null): boolean {
  if (value == null || value === '') return true;
  return !['off', '0', 'false', 'no'].includes(String(value).trim().toLowerCase());
}
