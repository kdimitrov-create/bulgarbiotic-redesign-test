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

const QUERY = `query CartSummary($cartId: ID!) {
  cart(id: $cartId) {
    id
    totals { group key name description amount { amount currencyCode } useForTotal afterTotal }
    messages { messageHtml }
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

export interface CartSummary {
  totals: CartTotalLine[];
  messages: string[];
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
  const token = env.PUBLIC_STOREFRONT_API_TOKEN;
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
      data?: {cart?: {totals?: CartTotalLine[]; messages?: Array<{messageHtml: string}>} | null};
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
  const origin = env.PUBLIC_API_ORIGIN || env.PUBLIC_STORE_DOMAIN;
  if (!origin) return null;
  return origin.startsWith('http') ? origin.replace(/\/$/, '') : `https://${origin}`;
}
