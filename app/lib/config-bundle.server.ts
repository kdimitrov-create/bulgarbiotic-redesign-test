import {adminGql, adminOrigin, adminPat} from './admin-api.server';

/**
 * Всички настройки на търговеца с ЕДНА заявка вместо със седем.
 *
 * ЗАЩО. Обвивката на всяка страница четеше седем неща от админ панела поотделно,
 * а няколко от тях не са по една заявка: списъците се четат на страници. Мерено
 * 03.09.2026 - тринайсет обиколки на едно студено зареждане, и се плащат отново
 * при ВСЯКО количково действие, защото `shouldRevalidate` връща true при POST.
 * Admin API-то е с таван 300 заявки в минута (`x-ratelimit-limit` в заглавките),
 * а магазинът върви на 59-104 в минута, тоест около 27% от бюджета в обикновен
 * следобед. Пик или кампания изяждат остатъка.
 *
 * КАК. Admin API-то приема псевдоними, тоест няколко въпроса в една заявка.
 * Седемте „глави" се питат наведнъж, а после се дочитат само списъците, които
 * наистина имат втора страница. Мерено на живо: обединената заявка връща и
 * седемте за 0,73 s и минава под лимита за сложност.
 *
 * 🔑 И ЕДНО ДУБЛИРАНЕ, което се вижда чак когато нещата са на едно място:
 * `live-discounts` и `quantity-packages` четат ЕДИН И СЪЩ списък
 * `discounts(active: yes)`, само с различни полета - и то с пълно обхождане на
 * страниците всеки. Полетата на пакетите са подмножество на тези на отстъпките,
 * тоест едно четене върши работа и на двете. Само това спестява две заявки.
 *
 * ⚠️ Този модул НЕ пипа обработката. Всеки модул продължава да си тълкува
 * редовете както досега; сменя се единствено ОТКЪДЕ идват суровите редове.
 * Върне ли пакетът null (отказ на админа), всеки се връща към собствения си
 * път и страницата излиза както преди - по-бавно, но цяла.
 *
 * SERVER ONLY: `.server.ts` пази PAT-а извън клиентския бъндъл.
 */

/** Колкото връща едно извикване; сто е таванът, който API-то дава без спор. */
const PAGE_SIZE = 100;
/** Спирачка срещу безкраен цикъл, ако `hasNextPage` залепне на true. */
const MAX_PAGES = 20;
/* Минута в паметта на изолата. Общият кеш (`shared-cache.server.ts`) поема
 * тежестта между изолатите, затова тук не е нужен дълъг срок. */
const CACHE_TTL_MS = 60 * 1000;

const NAV_FIELDS = 'id name type linkType linkId url blank class widgetText order';

/** Полетата на отстъпките са НАДМНОЖЕСТВО на тези, които пакетите ползват. */
const DISCOUNT_FIELDS =
  'id name type typeValue code orderOver dateStart dateEnd active color textColor';
/* `displayType sandbox` са за изскачащия прозорец (`cross-sell.server.ts`) -
 * той решава по тях, без своя заявка за списъка.
 * ⚠️ `maxUserViews` НЕ бива да влиза тук: в списъка то гърми с „Unexpected
 * error" заради някоя от старите оферти и сваля целия пакет (мерено
 * 07.10.2026). В заявката за единичен запис работи. */
const CROSS_SELL_FIELDS =
  'id name status event offerTitle activeFrom activeTo discountType freeProducts displayType sandbox';
const CART_RULE_FIELDS = 'id name title status statusKey activeFrom activeTo';

const navTree = (alias: string, group: string) =>
  `${alias}: navigation(group: "${group}") {
    items {
      ${NAV_FIELDS}
      children {
        ${NAV_FIELDS}
        children { ${NAV_FIELDS} }
      }
    }
  }`;

const listHead = (root: string, args: string, fields: string) =>
  `${root}(first: $first, after: $after${args}) {
    pageInfo { hasNextPage endCursor }
    edges { node { ${fields} } }
  }`;

const BUNDLE_QUERY = `query BbConfigBundle($first: Int!, $after: String) {
  ${navTree('mainMenu', 'main')}
  ${navTree('footerMenu', 'footer')}
  storefrontWidgets { mapping map name settings }
  customCssJs
  ${listHead('discounts', ', active: yes', DISCOUNT_FIELDS)}
  ${listHead('crossSells', '', CROSS_SELL_FIELDS)}
  ${listHead('cartRules', '', CART_RULE_FIELDS)}
}`;

/** Дочитане на ЕДИН списък, когато главата е казала, че има още. */
const tailQuery = (root: string, args: string, fields: string) =>
  `query BbConfigTail($first: Int!, $after: String) {
    ${listHead(root, args, fields)}
  }`;

interface Page<T> {
  pageInfo?: {hasNextPage?: boolean; endCursor?: string | null};
  edges?: Array<{node: T}>;
}

export interface ConfigBundle {
  /** Дървото на горното меню, както го дава `navigation(group: "main")`. */
  mainMenu: unknown;
  /** Дървото на подвала. */
  footerMenu: unknown;
  /** Модулите на темата от панела. */
  widgets: unknown[];
  /** Потребителският CSS/JS, суров. */
  customCssJs: string | null;
  /** ВСИЧКИ активни отстъпки, дочетени до последната страница. */
  discounts: any[];
  /** Всички кръстосани оферти. */
  crossSells: any[];
  /** Всички правила на количката. */
  cartRules: any[];
}

let cache: {at: number; data: ConfigBundle} | null = null;

/** Дочита останалите страници на един списък. Главата вече е прочетена. */
async function drain(
  origin: string,
  pat: string,
  root: string,
  args: string,
  fields: string,
  head: Page<any> | undefined,
): Promise<any[]> {
  const out: any[] = (head?.edges ?? []).map((e) => e.node);
  let after = head?.pageInfo?.hasNextPage ? head.pageInfo.endCursor ?? null : null;
  let pages = 1;

  const query = tailQuery(root, args, fields);
  while (after && pages < MAX_PAGES) {
    const data = await adminGql<Record<string, Page<any>>>(origin, pat, query, {
      first: PAGE_SIZE,
      after,
    });
    const page = data?.[root];
    for (const edge of page?.edges ?? []) out.push(edge.node);
    after = page?.pageInfo?.hasNextPage ? page.pageInfo.endCursor ?? null : null;
    pages += 1;
  }
  if (after) {
    console.warn(
      `config-bundle: ${root} спря на ${MAX_PAGES * PAGE_SIZE} реда - останалите не се четат.`,
    );
  }
  return out;
}

/**
 * Настройките на търговеца, или `null` когато админът откаже. Никога не хвърля -
 * извикващият се връща към собственото си четене и страницата излиза цяла.
 */
export async function fetchConfigBundle(
  env: Record<string, string | undefined> | undefined,
): Promise<ConfigBundle | null> {
  const pat = adminPat(env);
  const origin = adminOrigin(env);
  if (!pat || !origin) return null;

  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;

  try {
    const head = await adminGql<{
      mainMenu?: unknown;
      footerMenu?: unknown;
      storefrontWidgets?: unknown[];
      customCssJs?: string | null;
      discounts?: Page<any>;
      crossSells?: Page<any>;
      cartRules?: Page<any>;
    }>(origin, pat, BUNDLE_QUERY, {first: PAGE_SIZE, after: null});

    if (!head) return null;

    /* Дочитането на трите списъка върви успоредно: само те могат да имат втора
     * страница, а на този магазин обикновено я има само `discounts`. */
    const [discounts, crossSells, cartRules] = await Promise.all([
      drain(origin, pat, 'discounts', ', active: yes', DISCOUNT_FIELDS, head.discounts),
      drain(origin, pat, 'crossSells', '', CROSS_SELL_FIELDS, head.crossSells),
      drain(origin, pat, 'cartRules', '', CART_RULE_FIELDS, head.cartRules),
    ]);

    const data: ConfigBundle = {
      mainMenu: head.mainMenu ?? null,
      footerMenu: head.footerMenu ?? null,
      widgets: head.storefrontWidgets ?? [],
      customCssJs: head.customCssJs ?? null,
      discounts,
      crossSells,
      cartRules,
    };

    cache = {at: Date.now(), data};
    return data;
  } catch (error) {
    console.warn('config-bundle: пакетът се отказа, всеки чете сам:', error);
    return null;
  }
}
