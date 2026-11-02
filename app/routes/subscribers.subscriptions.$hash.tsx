import {Form, useActionData, useNavigation} from 'react-router';
import type {Route} from './+types/subscribers.subscriptions.$hash';
import {getSeoMeta} from '@cloudcart/nitro';
import {getContext} from '~/lib/context';
import {isValidEmail, unsubscribeEmail} from '~/lib/subscribers.server';

/**
 * `/subscribers/subscriptions/<хеш>` - линкът „Unsubscribe" от всяко писмо.
 *
 * ## Какво се счупи
 *
 * Платформата слага адреса през променливата `{$unsubscribe_url}` и сама го
 * обслужваше: хешът носи шифрован идентификатор на абоната плюс времето на
 * изпращане. След насочването на домейна `/subscribers/*` е на този worker и
 * линкът връщаше 404 - тоест задължителното по закон отписване не работеше.
 * Проверено на живо 23.09.2026 с истинско писмо.
 *
 * ## Какво правим
 *
 * Хешът е шифрован с ключа на платформата и за нас е низ без смисъл, значи кой
 * е абонатът не се разбира. Затова питаме за адреса и изключваме маркетинга
 * през Admin API - същото действие, което търговецът прави от панела.
 *
 * Цената е едно кликване повече от преди. Истинската поправка е
 * `/subscribers/*` да влезе в пътищата, които платформата обслужва, и тя е у
 * CloudCart; дотогава тази страница е разликата между „отписах се" и 404.
 *
 * ⚠️ Отговорът е един и същ, независимо дали такъв абонат е намерен. Иначе
 * адресът става проверка кой имейл е в списъка на клиента.
 */

export const meta: Route.MetaFunction = () => getSeoMeta({title: 'Отписване | Bactology'});

type ActionData = {status: 'done' | 'invalid' | 'error'};

/**
 * Груб предпазител: отписването е чуждо действие, а адресът е отворен.
 * В паметта на изолата, тоест не е сигурност - само вдига цената на най-
 * евтината злоупотреба. Същият подход като при записването за бюлетин.
 */
const ATTEMPTS = new Map<string, {count: number; until: number}>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 10;

function tooManyAttempts(request: Request): boolean {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const now = Date.now();
  const row = ATTEMPTS.get(ip);
  if (!row || row.until < now) {
    ATTEMPTS.set(ip, {count: 1, until: now + WINDOW_MS});
    return false;
  }
  row.count += 1;
  return row.count > MAX_PER_WINDOW;
}

export async function action({request, context}: Route.ActionArgs) {
  const form = await request.formData();
  const email = String(form.get('email') ?? '').trim();
  if (!isValidEmail(email)) return {status: 'invalid'} as ActionData;
  if (tooManyAttempts(request)) return {status: 'error'} as ActionData;

  const ctx = await getContext(context, request);
  const outcome = await unsubscribeEmail(ctx.env as Record<string, string | undefined>, email);
  return {status: outcome === 'done' ? 'done' : 'error'} as ActionData;
}

export default function Unsubscribe() {
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  if (actionData?.status === 'done') {
    return (
      <div className="mx-auto max-w-md py-12">
        <h1 className="text-2xl font-bold tracking-tight mb-2">Готово</h1>
        <p className="text-sm text-gray-600">
          Ако този адрес е в списъка ни, вече е отписан и няма да получава
          рекламни имейли. Писмата за поръчките ти продължават, защото те не са
          реклама.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md py-12">
      <h1 className="text-2xl font-bold tracking-tight mb-2">Отписване от имейлите</h1>
      <p className="text-sm text-gray-500 mb-6">
        Въведи адреса, на който получаваш писмата, и спираме рекламните имейли.
      </p>

      <Form method="POST" className="space-y-4">
        <label className="block">
          <span className="block text-sm font-medium mb-1">Имейл</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            autoFocus
            className="form-input w-full py-2.5 px-3 border-[1.5px] border-gray-200 rounded-lg focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </label>
        {actionData?.status === 'invalid' ? (
          <p className="text-sm text-red-600">Това не изглежда като имейл адрес.</p>
        ) : null}
        {actionData?.status === 'error' ? (
          <p className="text-sm text-red-600">
            Нещо се обърка. Опитай пак след малко или ни пиши.
          </p>
        ) : null}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 bg-brand text-white font-medium rounded-lg hover:opacity-90 disabled:opacity-60"
        >
          {isSubmitting ? 'Отписвам…' : 'Отпиши ме'}
        </button>
      </Form>
    </div>
  );
}
