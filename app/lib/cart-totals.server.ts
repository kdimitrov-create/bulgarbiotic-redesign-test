import {envValue} from './env.server';

/**
 * Обобщението на количката, прочетено от Storefront API-то.
 *
 * ЗАЩО СЪЩЕСТВУВА. `Cart.totals` е „обобщението на поръчката точно както го е
 * настроил търговецът - всеки ред, в реда, в който трябва да се покаже, с
 * неговите етикети", а API-то изрично добавя: „`cost` е изведено от същите
 * данни и е за логика, не за показване". Fragment-ът на `@cloudcart/nitro`
 * обаче не иска нито `totals`, нито `messages`, затова се пита отделно.
 *
 * Без него сметката пропуска ПРАВИЛАТА ЗА КОЛИЧКАТА. Измерено на живо
 * 2026-08-13 на bulgarbiotic.bg, където е активно правило „Pets 2=1":
 *
 *   2 бр. Pets              редове 42,94   →  total  21,47  (ред „−21,47")
 *   2 бр. Pets + Family     редове 147,34  →  total  73,67  (ред „−73,67")
 *
 * Сборът на редовете е 147,34, а касата събира 73,67. Който смята сам, показва
 * едното и таксува другото.
 *
 * SERVER ONLY - `.server.ts` държи заявката извън клиентския бъндъл.
 */

const REQUEST_TIMEOUT_MS = 8000;

/*
 * Редовете идват и тук, а не само сборът.
 *
 * Фрагментът на nitro иска от реда само `cost { totalAmount }`. Storefront
 * API-то обаче дава на реда и `amountPerQuantity`, `compareAtAmountPerQuantity`
 * и `discountAllocations` - тоест КОЕ правило колко е свалило от този ред.
 * Мерено на живо 17.08.2026 с двете правила за Pets:
 *
 *   2 бр. (правило 12): редът стои на 42,94, а отстъпката е ред в СБОРА
 *                       („★Поръчай 2, плати 1 Pets" −21,47)
 *   4 бр. (правило 14): редът вече е 42,94 (10,74/бр.), а отстъпката е
 *                       НА РЕДА (alloc CART_RULE −42,94), в сбора я няма
 *
 * Едно и също по вид правило, отчетено на две различни места. Оттам идваха и
 * двете оплаквания: при 2 бр. картата показваше пълна цена, при 4 бр. долу
 * липсваше името на правилото. С тези полета и двете са налични.
 */
const QUERY = `query CartSummary($cartId: ID!) {
  cart(id: $cartId) {
    id
    totals { group key name description amount { amount currencyCode } useForTotal afterTotal }
    messages { messageHtml }
    lines(first: 100) {
      nodes {
        id
        quantity
        merchandise { ... on ProductVariant { product { id } } }
        cost {
          totalAmount { amount currencyCode }
          amountPerQuantity { amount currencyCode }
          compareAtAmountPerQuantity { amount currencyCode }
        }
        discountAllocations { source title code discountedAmount { amount currencyCode } }
      }
    }
  }
}`;

export interface CartTotalLine {
  group: string | null;
  key: string | null;
  name: string | null;
  description: string | null;
  amount: {amount: string; currencyCode: string} | null;
  useForTotal: boolean | null;
  afterTotal: boolean | null;
}

export interface CartLineAllocation {
  /** `PRODUCT` (отстъпка на продукта) или `CART_RULE` (правило за количката). */
  source: string | null;
  title: string | null;
  code: string | null;
  discountedAmount: {amount: string; currencyCode: string} | null;
}

export interface CartSummaryLine {
  id: string;
  quantity: number;
  /** Номерът на продукта („75"). Нужен е за изключенията на правилата по брой
   *  (`tierStatus`) - редът на nitro носи само handle. */
  productId: string | null;
  total: {amount: string; currencyCode: string} | null;
  perQuantity: {amount: string; currencyCode: string} | null;
  compareAtPerQuantity: {amount: string; currencyCode: string} | null;
  allocations: CartLineAllocation[];
}

export interface CartSummary {
  totals: CartTotalLine[];
  messages: string[];
  lines: CartSummaryLine[];
}

/**
 * Връща обобщението за дадена количка, или `null` при липсваща количка или
 * проблем със заявката. Никога не хвърля: количката трябва да се нарисува дори
 * когато обобщението не е дошло - тогава повърхностите падат на сбора от
 * редовете, който е верен, докато няма правило за количката.
 */
export async function fetchCartSummary(
  env: Record<string, string | undefined>,
  cartId: string | null | undefined,
): Promise<CartSummary | null> {
  const origin = apiOrigin(env);
  const token = envValue(env, 'PUBLIC_STOREFRONT_API_TOKEN');
  if (!origin || !token || !cartId) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${origin}/api/sf`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'X-Storefront-Access-Token': token},
      body: JSON.stringify({query: QUERY, variables: {cartId}}),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: {
        cart?: {
          totals?: CartTotalLine[];
          messages?: Array<{messageHtml: string}>;
          lines?: {nodes?: any[]};
        } | null;
      };
      errors?: Array<{message: string}>;
    };
    if (json.errors?.length) {
      console.error('cart-totals: %s', json.errors[0].message);
      return null;
    }
    const cart = json.data?.cart;
    if (!cart) return null;
    return {
      totals: cart.totals ?? [],
      lines: (cart.lines?.nodes ?? []).map((n: any) => ({
        id: String(n?.id ?? ''),
        quantity: Number(n?.quantity) || 0,
        productId: String(n?.merchandise?.product?.id ?? '').match(/(\d+)$/)?.[1] ?? null,
        total: n?.cost?.totalAmount ?? null,
        perQuantity: n?.cost?.amountPerQuantity ?? null,
        compareAtPerQuantity: n?.cost?.compareAtAmountPerQuantity ?? null,
        allocations: (n?.discountAllocations ?? []).map((a: any) => ({
          source: a?.source ?? null,
          title: a?.title ?? null,
          code: a?.code ?? null,
          discountedAmount: a?.discountedAmount ?? null,
        })),
      })),
      messages: (cart.messages ?? []).map((m) => m.messageHtml).filter(Boolean),
    };
  } catch (error) {
    console.error('cart-totals: %s', (error as Error).message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Платформеният адрес, никога публичният домейн, след като той сочи към този
 * storefront - иначе worker-ът звъни на себе си.
 */
function apiOrigin(env: Record<string, string | undefined>): string | null {
  // ⚠️ През `envValue`, не направо от `env`. На Nova двете са едно и също, но
  // локално `ctx.env` носи само шепа ключове, а останалото от `.env` стои в
  // `process.env`. Четенето направо хващаше ПУБЛИЧНИЯ домейн, който сочи към
  // самата витрина - обобщението мълчаливо оставаше null, тоест правилата за
  // количката не се виждаха на localhost и всяка проверка искаше деплой.
  const origin = envValue(env, 'PUBLIC_API_ORIGIN') || envValue(env, 'PUBLIC_STORE_DOMAIN');
  if (!origin) return null;
  return origin.startsWith('http') ? origin.replace(/\/$/, '') : `https://${origin}`;
}
