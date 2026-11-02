import {adminGql, adminOrigin, adminPat} from './admin-api.server';

/**
 * Умните колекции („селекции") на CloudCart, прочетени от Admin API-то.
 *
 * Платформата ги сервира на `/selection/{url_handle}` и търговецът ги прави от
 * „Умни колекции" в панела. Storefront API-то обаче НЕ ги познава: в схемата му
 * `collection` е категория, а заявка за селекция няма изобщо (проверено чрез
 * интроспекция 2026-09-28 - query root-ът е product / products / collection /
 * collections / page / blog / menu / search и нищо повече). Затова съставът на
 * една селекция може да дойде само оттук, а самите продукти се дърпат после от
 * Storefront API-то по url handle, за да са с истинските си цени и наличности.
 *
 * SERVER ONLY - наставката `.server.ts` пази PAT-а извън клиентския бъндъл.
 * Към браузъра тръгва само резултатът, който и без това е публичен.
 */

export interface SmartCollection {
  id: string;
  /** Името, което търговецът е дал - заглавието на страницата. */
  name: string;
  urlHandle: string;
  seoTitle: string | null;
  seoDescription: string | null;
  description: string | null;
  /** Съставът, в реда, в който панелът го връща. */
  productHandles: string[];
}

/**
 * 5 минути. Съставът на една селекция се мени рядко - при правило „умна"
 * колекция платформата го преизчислява по график, не при всяко зареждане.
 * Не може да е нула: заявката се чака в loader-а, тоест празен кеш добавя цяло
 * отиване до админа към рисуването на страницата.
 */
const CACHE_TTL_MS = 5 * 60 * 1000;

/** Колкото връща едно извикване на `products_list`. */
const PAGE_SIZE = 100;
/**
 * Спирачка срещу безкраен цикъл. 20 страници = 2000 продукта, тоест много над
 * целия каталог на магазина.
 */
const MAX_PAGES = 20;

const cache = new Map<string, {at: number; data: SmartCollection | null}>();

const FIELDS = 'id name urlHandle seoTitle seoDescription description';

const BY_HANDLE = `query SelectionByHandle($handle: String!, $first: Int!, $page: Int!) {
  smartCollectionByHandle(urlHandle: $handle) {
    ${FIELDS}
    products_list(first: $first, page: $page) { id urlHandle }
  }
}`;

const LIST = `query Selections { smartCollections { ${FIELDS} } }`;

interface RawSelection {
  id: string;
  name: string;
  urlHandle: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  description: string | null;
  products_list?: Array<{id: string; urlHandle: string | null}>;
}

/**
 * Една селекция по handle, или `null` ако такава няма (оттам и 404-ката).
 *
 * ⚠️ Обхожда `products_list` докрай вместо да вярва на първата страница. Това е
 * същият капан, описан в `admin-api.server.ts`: таван в заявката не се оплаква,
 * а просто мълчи - селекция със 120 продукта щеше да показва 100 и никой нямаше
 * да разбере защо липсват точно тези двайсет.
 */
export async function fetchSmartCollection(
  env: Record<string, string | undefined> | undefined,
  handle: string,
): Promise<SmartCollection | null> {
  const cached = cache.get(handle);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;

  const origin = adminOrigin(env);
  const pat = adminPat(env);
  if (!origin || !pat) return null;

  try {
    let head: RawSelection | null = null;
    const handles: string[] = [];

    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const data = await adminGql<{smartCollectionByHandle: RawSelection | null}>(
        origin,
        pat,
        BY_HANDLE,
        {handle, first: PAGE_SIZE, page},
      );
      const node = data?.smartCollectionByHandle ?? null;
      if (!node) break;
      if (!head) head = node;

      const rows = node.products_list ?? [];
      for (const row of rows) {
        if (row.urlHandle) handles.push(row.urlHandle);
      }
      if (rows.length < PAGE_SIZE) break;
      if (page === MAX_PAGES) {
        console.warn(
          `smart-collections: "${handle}" спря на ${MAX_PAGES * PAGE_SIZE} продукта - останалите не се четат. Вдигни MAX_PAGES.`,
        );
      }
    }

    const result: SmartCollection | null = head
      ? {
          id: head.id,
          name: head.name,
          urlHandle: head.urlHandle ?? handle,
          seoTitle: head.seoTitle,
          seoDescription: head.seoDescription,
          description: head.description,
          // Един и същ продукт може да се хване от две правила на колекцията.
          productHandles: [...new Set(handles)],
        }
      : null;

    cache.set(handle, {at: Date.now(), data: result});
    return result;
  } catch (error) {
    console.warn(
      'smart-collections: "%s" не се прочете - %s',
      handle,
      (error as Error)?.message ?? String(error),
    );
    // Изрично НЕ се кешира: следващото зареждане да опита пак, вместо страницата
    // да остане 404 за пет минути заради един изтекъл отговор.
    return null;
  }
}

/** Всички селекции - за sitemap-а и за вътрешните връзки. */
export async function fetchSmartCollections(
  env: Record<string, string | undefined> | undefined,
): Promise<Array<Omit<SmartCollection, 'productHandles'>>> {
  const origin = adminOrigin(env);
  const pat = adminPat(env);
  if (!origin || !pat) return [];
  try {
    const data = await adminGql<{smartCollections: RawSelection[]}>(origin, pat, LIST);
    return (data?.smartCollections ?? [])
      .filter((s) => Boolean(s.urlHandle))
      .map((s) => ({
        id: s.id,
        name: s.name,
        urlHandle: s.urlHandle as string,
        seoTitle: s.seoTitle,
        seoDescription: s.seoDescription,
        description: s.description,
      }));
  } catch (error) {
    console.warn(
      'smart-collections: списъкът не се прочете - %s',
      (error as Error)?.message ?? String(error),
    );
    return [];
  }
}
