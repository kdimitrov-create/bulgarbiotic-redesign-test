import {data, redirect} from 'react-router';
import type {Route} from './+types/api.subscribe';
import {getContext} from '~/lib/context';
import {isValidEmail, subscribeEmail} from '~/lib/subscribers.server';

/**
 * Записване за бюлетина - обслужва попъпа, футъра и страницата „Абонирай се".
 *
 * Отговорът е винаги `{status}` с една от петте стойности отдолу, за да могат
 * трите форми да ползват един и същ текст за един и същ изход.
 */
export type SubscribeStatus =
  | 'created' // нов абонат, записан
  | 'updated' // имаше го, но не приемаше маркетинг - съгласието е вдигнато
  | 'exists' // вече има абонат с този имейл и той приема маркетинг
  | 'invalid' // имейлът не е имейл
  | 'consent' // няма съгласие за обработване на лични данни
  | 'error'; // администраторското API не отговори

/** Заявката е само POST. GET го връщаме на началната, вместо да гърми. */
export async function loader() {
  return redirect('/');
}

/**
 * Груб предпазител срещу наливане на боклук в списъка на клиента.
 *
 * Пази се в паметта на работника, тоест не е споделен между изолати и не е
 * сигурност - само вдига цената на най-евтината атака. Истинската защита е,
 * че тук не се създава нищо без валиден имейл и без съгласие.
 */
const HITS = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

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
    return data({status: 'error' as SubscribeStatus}, {status: 405});
  }

  const ctx = await getContext(context, request);
  const env = ctx.env as Record<string, string | undefined>;

  let email = '';
  let consent = false;
  const type = request.headers.get('content-type') ?? '';
  if (type.includes('application/json')) {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    email = typeof body.email === 'string' ? body.email : '';
    consent = body.consent === true || body.consent === 'true';
  } else {
    const form = await request.formData();
    email = form.get('email')?.toString() ?? '';
    consent = ['true', 'on', '1'].includes((form.get('consent')?.toString() ?? '').toLowerCase());
  }

  const noStore = {headers: {'Cache-Control': 'no-store'}};

  if (!isValidEmail(email)) {
    return data({status: 'invalid' as SubscribeStatus}, {status: 400, ...noStore});
  }
  // Съгласието се проверява ПРЕДИ записването, не след него: без него в
  // списъка на клиента не влиза нищо.
  if (!consent) {
    return data({status: 'consent' as SubscribeStatus}, {status: 400, ...noStore});
  }
  if (tooManyFrom(request)) {
    return data({status: 'error' as SubscribeStatus}, {status: 429, ...noStore});
  }

  const status = await subscribeEmail(env, email);
  return data({status}, {status: status === 'error' ? 502 : 200, ...noStore});
}
