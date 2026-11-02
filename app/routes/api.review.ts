import {data, redirect} from 'react-router';
import type {Route} from './+types/api.review';
import {getContext} from '~/lib/context';
import {
  cleanReview,
  fetchReviewPolicy,
  submitReview,
  type ReviewOutcome,
} from '~/lib/reviews.server';

/**
 * Купил ли е влезлият клиент точно този продукт.
 *
 * Пита се САМО когато панелът е на „само купувачи" - иначе е излишна заявка
 * към магазина на всеки отзив.
 *
 * Сравнява се по `productHandle`, защото редовете на поръчката носят него, а
 * не номер на продукт. Списъкът с поръчки може да върне редовете кухи (познат
 * капан на платформата), затова при липса се пита поръчката поотделно, но за
 * ограничен брой - човек, купил продукта преди петдесет поръчки, е рядкост,
 * а обхождането на цялата история би забило страницата.
 */
async function hasBought(ctx: any, handle: string): Promise<boolean> {
  if (!handle) return false;
  try {
    if (!(await ctx.customerAccount.isLoggedIn())) return false;
    const orders = (await ctx.customerAccount.getOrders(25)) ?? [];
    const list = Array.isArray(orders) ? orders : (orders.nodes ?? []);

    for (const order of list) {
      const lines = order?.lineItems?.nodes ?? [];
      if (lines.some((l: any) => l?.productHandle === handle)) return true;
    }
    // Кухи редове в списъка: доизчитат се най-новите поръчки поотделно.
    for (const order of list.slice(0, 10)) {
      if ((order?.lineItems?.nodes ?? []).length) continue;
      const full = await ctx.customerAccount.getOrder(order.id).catch(() => null);
      const lines = full?.lineItems?.nodes ?? [];
      if (lines.some((l: any) => l?.productHandle === handle)) return true;
    }
    return false;
  } catch {
    // Отказ на магазина не бива да се брои за „купил е".
    return false;
  }
}

/**
 * Приема отзив от продуктовата страница.
 *
 * ⚠️ Отворен адрес, който пише в каталога на търговеца. Затова тук стоят
 * същите предпазители като при записването за бюлетин: проверка на входа
 * преди всичко друго и таван на заявките от един адрес.
 *
 * Какво влиза веднага и какво чака одобрение решава `reviews.server.ts` по
 * настройките на приложението „Отзиви", не този файл.
 */

const NO_STORE = {'Cache-Control': 'no-store'};

/** Заявката е само POST. GET го връщаме на началната, вместо да гърми. */
export async function loader() {
  return redirect('/');
}

/**
 * Таван срещу наливане на боклук.
 *
 * Пази се в паметта на работника, тоест не е споделен между изолати и не е
 * сигурност - само вдига цената на най-евтината атака. По-строг е от този при
 * бюлетина: отзивът е видимо съдържание в чужд магазин, а един човек няма
 * причина да остави три отзива за минута.
 */
const HITS = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 3;

function tooManyFrom(request: Request): boolean {
  const ip =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown';
  const now = Date.now();
  const recent = (HITS.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  HITS.set(ip, recent);
  if (HITS.size > 5000) HITS.clear();
  return recent.length > MAX_PER_WINDOW;
}

export async function action({request, context}: Route.ActionArgs) {
  if (request.method !== 'POST') {
    return data({status: 'error' as ReviewOutcome}, {status: 405, headers: NO_STORE});
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const input = cleanReview({
    productId: String(body?.productId ?? ''),
    name: String(body?.name ?? ''),
    rating: Number(body?.rating),
    title: String(body?.title ?? ''),
    comment: String(body?.comment ?? ''),
  });

  if (!input) {
    return data({status: 'invalid' as ReviewOutcome}, {status: 400, headers: NO_STORE});
  }
  if (tooManyFrom(request)) {
    return data({status: 'error' as ReviewOutcome}, {status: 429, headers: NO_STORE});
  }

  const ctx = await getContext(context, request);
  const env = ctx.env as Record<string, string | undefined>;

  // Само при „само купувачи" се плаща цената на проверката.
  const policy = await fetchReviewPolicy(env);
  const isBuyer =
    policy.condition === 'buyer'
      ? await hasBought(ctx, String(body?.productHandle ?? ''))
      : false;

  const status = await submitReview(env, input, isBuyer);

  return data(
    {status},
    {status: status === 'error' ? 502 : 200, headers: NO_STORE},
  );
}
