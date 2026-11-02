import {useLoaderData} from 'react-router';
import type {Route} from './+types/tracking.$bolId';
import {getSeoMeta} from '@cloudcart/nitro';
import {getContext} from '~/lib/context';
import {adminOrigin, adminPat, adminGql} from '~/lib/admin-api.server';
import {PageShell} from '~/components/PageShell';
import {TruckIcon, ExclamationTriangleIcon, ArrowTopRightOnSquareIcon} from '@heroicons/react/24/outline';

/**
 * `/tracking/<товарителница>` - проследяване на пратка.
 *
 * Защо съществува: този адрес е на платформата, но след насочването на домейна
 * към този storefront пътят е НАШ (платформата задържа само `/admin*`,
 * `/checkout*`, `/api/sf`, `/api/gql`, `/api/v2/*` и `/cdn/*`). Тоест всяка
 * връзка към проследяване връщаше 404 - бутонът в админ панела, връзката в
 * писмата към клиента и `fulfillment.shippingTrackingUrl`, който самата
 * платформа записва като `https://bulgarbiotic.bg/tracking/<номер>`.
 *
 * Данните идват от Admin API-то (`orderShipmentTracking(bolId:)`), защото
 * Storefront API-то дава поръчка само срещу `customerAccessToken`, а тази
 * страница се отваря и без вход.
 *
 * ⚠️ Умишлено НЕ показваме нищо за поръчката или купувача - нито номер, нито
 * име, нито адрес. Товарителниците на Еконт и Спиди вървят последователно,
 * тоест адресът е познаваем; статусът на пратката е единственото, което може
 * да се покаже без вход.
 */

export const meta: Route.MetaFunction = () => [
  ...getSeoMeta({
    title: 'Проследяване на пратка | Bactology',
    description: 'Текущ статус на пратката по номер на товарителница.',
  }),
  // Личен адрес, който няма работа в индекса.
  {name: 'robots', content: 'noindex, nofollow'},
];

/** Отговорът е за конкретна пратка - нито общ кеш, нито кеш в браузъра. */
export const headers: Route.HeadersFunction = () => ({
  'Cache-Control': 'private, no-store',
});

type TrackingEvent = {name: string | null; description: string | null; date: string | null};

type TrackingData = {
  orderShipmentTracking: {
    bolId: string;
    shippingKey: string | null;
    supported: boolean;
    actualStatus: TrackingEvent | null;
    events: TrackingEvent[];
  } | null;
};

/**
 * Връзка към собственото проследяване на куриера, за когато платформата няма
 * данни. `dpdbulgaria` сочи към Спиди нарочно: DPD България е Спиди и адресът
 * на DPD 301-ва натам (проверено).
 */
function courierLink(key: string | null, bolId: string): {name: string; url: string} | null {
  switch (key) {
    case 'econt':
      return {name: 'Еконт', url: `https://www.econt.com/services/track-shipment/${bolId}`};
    case 'speedy':
    case 'speedy_v2':
    case 'dpdbulgaria':
      return {name: 'Спиди', url: `https://www.speedy.bg/bg/track-shipment?shipmentNumber=${bolId}`};
    default:
      return null;
  }
}

export async function loader({params, context, request}: Route.LoaderArgs) {
  const bolId = String(params.bolId ?? '');
  // Товарителницата е цифри и латиница (Sameday слага букви). Всичко друго е
  // чужд адрес, не празна страница със заявка към админа зад нея.
  if (!/^[A-Za-z0-9-]{6,32}$/.test(bolId)) {
    throw new Response('Not Found', {status: 404});
  }

  const ctx = await getContext(context, request);
  const env = ctx.env as Record<string, string | undefined>;
  const origin = adminOrigin(env);
  const pat = adminPat(env);

  if (!origin || !pat) {
    // Без токен страницата пак се отваря: номерът и връзката към куриера са
    // повече от 404.
    return {
      bolId,
      shippingKey: null,
      supported: false,
      actual: null as TrackingEvent | null,
      events: [] as TrackingEvent[],
      found: false,
      failed: true,
    };
  }

  const query = `query Tracking($bolId: String!) {
    orderShipmentTracking(bolId: $bolId) {
      bolId
      shippingKey
      supported
      actualStatus { name description date }
      events { name description date }
    }
  }`;

  const result = await adminGql<TrackingData>(origin, pat, query, {bolId}).catch(() => null);
  const tracking = result?.orderShipmentTracking ?? null;

  return {
    bolId,
    shippingKey: tracking?.shippingKey ?? null,
    supported: Boolean(tracking?.supported),
    // `null` от API-то значи „няма такава товарителница", а не „куриерът не се
    // поддържа" - две различни съобщения долу.
    found: Boolean(tracking),
    actual: tracking?.actualStatus ?? null,
    events: (tracking?.events ?? []).filter((e) => e && (e.name || e.description)),
    failed: !result,
  };
}

/** Дата на български; неразпознат формат се показва както е дошъл. */
function formatDate(raw: string | null): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString('bg-BG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TrackingPage() {
  const {bolId, shippingKey, supported, actual, events, found, failed} = useLoaderData<typeof loader>();
  const courier = courierLink(shippingKey, bolId);

  /* Подредбата на API-то не е обявена. Има ли дата на ВСЯКО събитие, се
   * подрежда най-новото отгоре; липсва ли поне една, редът остава както е
   * дошъл, вместо да се измисля хронология. */
  const ordered = [...events];
  if (ordered.length > 1 && ordered.every((e) => e.date)) {
    ordered.sort((a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime());
  }

  const nothing = !actual?.name && ordered.length === 0;

  /* Обвивката е „wide" нарочно. „narrow" облича съдържанието в `bb-prose`,
   * а тя номерира списъка и надува заглавията - колоната се стеснява тук,
   * вътре, за да останат класовете на този файл водещи. */

  return (
    <PageShell
      title="Проследяване на пратка"
      tag="Доставка"
      lead="Текущият статус на пратката, както го подава куриерът."
      variant="wide"
    >
      <div className="mx-auto max-w-[720px] space-y-6">
        {/* Номерът на товарителницата */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4">
          <TruckIcon className="size-6 text-[var(--color-brand-pink)]" />
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-[1.4px] text-gray-500">
              Товарителница
            </div>
            <div className="font-mono text-lg font-bold text-[var(--color-ink)]">{bolId}</div>
          </div>
          {courier && (
            <a
              href={courier.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[var(--color-ink)] px-4 py-2 text-xs font-bold text-white hover:opacity-90 hover:no-underline"
            >
              Виж при {courier.name}
              <ArrowTopRightOnSquareIcon className="size-3.5" />
            </a>
          )}
        </div>

        {/* Текущ статус */}
        {actual?.name && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="text-[10.5px] font-bold uppercase tracking-[1.4px] text-gray-500">
              Текущ статус
            </div>
            <div className="mt-1 text-xl font-extrabold text-[var(--color-ink)]">{actual.name}</div>
            {actual.description && <p className="mt-1 text-sm text-gray-600">{actual.description}</p>}
            {formatDate(actual.date) && (
              <p className="mt-1 text-xs text-gray-500">{formatDate(actual.date)}</p>
            )}
          </div>
        )}

        {/* История */}
        {ordered.length > 0 && (
          <div>
            <div className="mb-3 text-[10.5px] font-bold uppercase tracking-[1.4px] text-gray-500">
              История на пратката
            </div>
            <ul className="relative list-none space-y-4 border-l border-gray-200 pl-5">
              {ordered.map((e, i) => (
                <li key={i} className="relative">
                  <span
                    className={`absolute -left-[27px] top-1 size-3 rounded-full border-2 border-white ${
                      i === 0 ? 'bg-[var(--color-brand-pink)]' : 'bg-gray-300'
                    }`}
                  />
                  <div className="text-sm font-bold text-[var(--color-ink)]">{e.name}</div>
                  {e.description && <p className="text-sm text-gray-600">{e.description}</p>}
                  {formatDate(e.date) && <p className="text-xs text-gray-400">{formatDate(e.date)}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Нищо за показване: куриерът не се поддържа, номерът е чужд или
            админът не отговори. Съобщението е различно за всеки случай. */}
        {nothing && (
          <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <ExclamationTriangleIcon className="size-5 shrink-0 text-amber-500" />
            <div className="text-sm text-gray-700">
              {failed ? (
                <>Проследяването не отговори в момента. Опитай пак след минута.</>
              ) : !found ? (
                <>
                  Няма пратка с този номер. Провери товарителницата в писмото за поръчката или се
                  свържи с нас.
                </>
              ) : supported ? (
                <>Куриерът още няма данни за тази пратка. Статусът се появява, щом тя тръгне.</>
              ) : (
                <>
                  За този номер няма автоматично проследяване. Провери го директно на сайта на
                  куриера.
                </>
              )}
            </div>
          </div>
        )}

        <p className="text-xs text-gray-400">
          Въпроси по доставката: <a href="tel:+359882754163">0882 75 41 63</a>
        </p>
      </div>
    </PageShell>
  );
}
