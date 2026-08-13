import {envValue} from './env.server';

/**
 * Общото за всяко четене от Admin API-то: адрес, токен, една заявка и обхождане
 * на цял списък до последната страница.
 *
 * Съществува заради един конкретен капан. Четирите модула, които четат
 * отстъпки, питаха `discounts(first: 100)` и спираха дотам. На bulgarbiotic.bg
 * активните отстъпки са 94. Още шест и правила започват да изчезват от сайта
 * без никакво съобщение: цената на продукта си остава редовната, промо кодът
 * не се разпознава, месечен пакет липсва. Никой няма да свърже това с таван в
 * заявка, затова таванът си отива.
 *
 * `adminListAll` не е удобство - то е разликата между „показваме отстъпките" и
 * „показваме първите сто отстъпки".
 *
 * SERVER ONLY: `.server.ts` пази PAT-а извън клиентския бъндъл.
 */

/** 8s, не 4: студен worker плюс бавен админ отговор изтичаше и падаше тихо. */
const REQUEST_TIMEOUT_MS = 8000;
/** Колкото връща едно извикване. Сто е таванът, който API-то дава без спор. */
const PAGE_SIZE = 100;
/**
 * Спирачка срещу безкраен цикъл, ако `hasNextPage` някога залепне на true.
 * 20 страници = 2000 реда, тоест двайсет пъти над днешния каталог от правила.
 */
const MAX_PAGES = 20;

/**
 * Адресът на платформата. Никога публичният домейн, след като той сочи към
 * този storefront - иначе worker-ът звъни на себе си и всяка страница пада.
 */
export function adminOrigin(env: Record<string, string | undefined> | undefined): string | null {
  const raw = envValue(env, 'PUBLIC_API_ORIGIN') || envValue(env, 'PUBLIC_STORE_DOMAIN');
  if (!raw) return null;
  return raw.startsWith('http') ? raw.replace(/\/$/, '') : `https://${raw}`;
}

/**
 * Токенът за админа.
 *
 * Търси се и без долни черти: панелът пази Custom Variables и като
 * `CLOUDCARTADMINPAT`, а непрочетен токен изглежда точно като „функцията е
 * изключена". Минава през `envValue`, защото локално `cloudcart nitrogen dev`
 * подава на контекста само четири ключа, а останалите стигат до `process.env`.
 */
export function adminPat(env: Record<string, string | undefined> | undefined): string | null {
  return envValue(env, 'CLOUDCART_ADMIN_PAT') || envValue(env, 'CLOUDCARTADMINPAT') || null;
}

/** Една заявка с таймаут. Хвърля при транспортна или GraphQL грешка. */
export async function adminGql<T>(
  origin: string,
  pat: string,
  query: string,
  variables: Record<string, unknown> = {},
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
 * Всички редове от един списък, а не първата страница.
 *
 * `root` е името на връзката (`discounts`, `crossSells`, `cartRules`), `args` са
 * нейните допълнителни аргументи като низ (`active: yes`), `nodeFields` са
 * полетата, които извикващият иска.
 *
 * ⚠️ Списъчните заявки на CloudCart връщат КУХИ вложени списъци: `targets`,
 * `quantityDiscounts`, `volumeDiscounts`, `actions` и `rows` идват празни и се
 * пълнят само от заявката за единичен запис. Тук се вземат идентификаторите и
 * плоските полета; подробностите се дърпат след това с aliases.
 */
export async function adminListAll<T>(
  origin: string,
  pat: string,
  opts: {root: string; nodeFields: string; args?: string; label?: string},
): Promise<T[]> {
  const extra = opts.args ? `, ${opts.args}` : '';
  const query = `query ListAll($first: Int!, $after: String) {
    ${opts.root}(first: $first, after: $after${extra}) {
      pageInfo { hasNextPage endCursor }
      edges { node { ${opts.nodeFields} } }
    }
  }`;

  const out: T[] = [];
  let after: string | null = null;
  let pages = 0;

  do {
    const page: {
      pageInfo?: {hasNextPage: boolean; endCursor: string | null};
      edges?: Array<{node: T}>;
    } | null =
      (await adminGql<Record<string, any>>(origin, pat, query, {first: PAGE_SIZE, after}))?.[
        opts.root
      ] ?? null;

    for (const edge of page?.edges ?? []) out.push(edge.node);

    pages += 1;
    after = page?.pageInfo?.hasNextPage ? page.pageInfo.endCursor : null;
    if (after && pages >= MAX_PAGES) {
      console.warn(
        `admin-api: ${opts.label ?? opts.root} спря на ${MAX_PAGES * PAGE_SIZE} реда - останалите не се четат. Вдигни MAX_PAGES.`,
      );
      after = null;
    }
  } while (after);

  return out;
}
