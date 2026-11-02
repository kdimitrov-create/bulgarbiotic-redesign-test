import {envValue} from './env.server';
import {readVisitCookie} from './visit-source';

/**
 * Подава на количката откъде е дошъл купувачът, за да го носи и поръчката.
 *
 * Пълни „Продажби по източник на трафик" в панела. Кацането и referrer-ът
 * идват от cookie-то на посещението - виж `visit-source.ts` за целия механизъм
 * и защо без това извикване всяка поръчка се води директен трафик.
 *
 * SERVER ONLY. Никога не хвърля и никога не бави отговора: работата отива в
 * `waitUntil`, а падне ли - количката просто остава както е била.
 */

const REQUEST_TIMEOUT_MS = 4000;

const MUTATION = `mutation CartAttribution($cartId: ID!, $attribution: CartAttributionInput!) {
  cartAttributionUpdate(cartId: $cartId, attribution: $attribution) {
    cart { id }
    userErrors { field message }
  }
}`;

function apiOrigin(env: Record<string, string | undefined>): string | null {
  // Същото правило като на другите сървърни заявки: през `envValue`, защото
  // локално `ctx.env` носи само шепа ключове. Виж `cart-totals.server.ts`.
  const origin = envValue(env, 'PUBLIC_API_ORIGIN') || envValue(env, 'PUBLIC_STORE_DOMAIN');
  if (!origin) return null;
  return origin.startsWith('http') ? origin.replace(/\/$/, '') : `https://${origin}`;
}

/**
 * Пуска записа във фонов режим.
 *
 * Вика се при създаване на количка и пак при тръгване към касата. Повторното
 * извикване „заменя записаното", тоест втория път е поправка, ако първият е
 * паднал, а не дублиране.
 */
export function attributeCart(
  env: Record<string, string | undefined>,
  request: Request,
  cartId: string | null | undefined,
): void {
  if (!cartId) return;
  const source = readVisitCookie(request.headers.get('Cookie'));
  if (!source) return;

  const origin = apiOrigin(env);
  const token = envValue(env, 'PUBLIC_STOREFRONT_API_TOKEN');
  if (!origin || !token) return;

  const attribution: Record<string, string> = {landingUrl: source.landingUrl};
  if (source.referrer) attribution.referrer = source.referrer;

  const work = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(`${origin}/api/sf`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'X-Storefront-Access-Token': token},
        body: JSON.stringify({query: MUTATION, variables: {cartId, attribution}}),
        signal: controller.signal,
      });
      if (!res.ok) {
        console.error('източник на трафик: %s', res.status);
        return;
      }
      const json = (await res.json()) as {
        data?: {cartAttributionUpdate?: {userErrors?: Array<{message: string}>}};
        errors?: Array<{message: string}>;
      };
      const problem = json.errors?.[0]?.message ?? json.data?.cartAttributionUpdate?.userErrors?.[0]?.message;
      if (problem) console.error('източник на трафик: %s', problem);
    } finally {
      clearTimeout(timer);
    }
  })().catch((error) => console.error('източник на трафик:', (error as Error).message));

  const waitUntil = (env as any).__waitUntil;
  if (typeof waitUntil === 'function') waitUntil(work);
}
