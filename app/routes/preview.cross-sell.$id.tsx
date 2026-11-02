import {useLoaderData, data} from 'react-router';
import {useState} from 'react';
import type {Route} from './+types/preview.cross-sell.$id';
import {getContext} from '~/lib/context';
import {getSeoMeta} from '@cloudcart/nitro';
import {PageShell} from '~/components/PageShell';
import {CrossSellModal} from '~/components/CrossSellPopup';
import {loadOfferPreview} from '~/lib/cross-sell.server';
import {COOKIE_MAX_AGE_S, SANDBOX_COOKIE} from '~/lib/cross-sell';

/**
 * „Преглед" на кръстосана оферта от панела (Маркетинг → Cross-Sell & UpSell).
 *
 * Панелът отваря `/preview/cross-sell/{id}`. Класическата тема има свой шаблон
 * за този адрес; в Nitrogen маршрут нямаше и бутонът водеше на 404 (07.10.2026).
 *
 * Прозорецът е СЪЩИЯТ компонент, който излиза на клиента след добавяне в
 * количката, тоест прегледът не е макет. Над него стоят причините, поради които
 * клиентите евентуално няма да видят офертата - неактивна, пясъчник, събитие,
 * което Nitrogen не рисува.
 *
 * Отвори ли се прегледът на оферта в пясъчник, браузърът получава бисквитка и
 * за 7 дни вижда офертите в пясъчник на живия магазин - така търговецът може да
 * я пробва, преди да я пусне на всички.
 *
 * Никога не се индексира.
 */
export const meta: Route.MetaFunction = ({data: d}) => [
  ...getSeoMeta({title: `Преглед: ${(d as any)?.preview?.offer?.title ?? 'оферта'} | Bactology`}),
  {name: 'robots', content: 'noindex, nofollow'},
];

export async function loader({params, context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const preview = await loadOfferPreview(ctx.env as Record<string, string | undefined>, params.id ?? '').catch(
    (error) => {
      console.error('cross-sell preview: could not load the offer —', (error as Error).message);
      return null;
    },
  );
  if (!preview) {
    throw data('Офертата не може да бъде заредена. Провери номера ѝ в панела.', {status: 404});
  }

  const headers = new Headers({'Cache-Control': 'private, no-store'});
  if (preview.sandbox) {
    headers.append(
      'Set-Cookie',
      `${SANDBOX_COOKIE}=1; Max-Age=${COOKIE_MAX_AGE_S}; Path=/; SameSite=Lax; Secure`,
    );
  }
  return data({preview}, {headers});
}

export default function CrossSellPreview() {
  const {preview} = useLoaderData<typeof loader>();
  const [open, setOpen] = useState(true);
  // Нов ключ при всяко отваряне - конфетите и анимацията тръгват отначало.
  const [round, setRound] = useState(0);

  return (
    <PageShell title={preview.offer.title} tag="Преглед" breadcrumbs={[]} variant="barebones">
      <div className="bb-preview-note">
        {preview.warnings.length ? (
          <>
            <strong>Клиентите не виждат тази оферта:</strong>
            <ul>
              {preview.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <strong>Офертата е активна.</strong> Излиза след добавяне в количката на продукт, който
            отговаря на условията ѝ.
          </>
        )}
      </div>

      <div className="bb-xs-stage">
        {open ? (
          <CrossSellModal key={round} offer={preview.offer} preview onClose={() => setOpen(false)} />
        ) : (
          <button
            type="button"
            className="bb-xs-add"
            onClick={() => {
              setRound((r) => r + 1);
              setOpen(true);
            }}
          >
            Покажи прозореца отново
          </button>
        )}
      </div>

      <style>{`
        .bb-preview-note {
          margin: 0 0 24px;
          padding: 12px 16px;
          border-radius: 12px;
          background: rgba(227, 22, 108, 0.08);
          border: 1px dashed rgba(227, 22, 108, 0.3);
          font-size: 13px;
          color: var(--color-ink);
        }
        .bb-preview-note ul { margin: 6px 0 0; padding-left: 18px; list-style: disc; }
        .bb-preview-note li + li { margin-top: 3px; }
      `}</style>
    </PageShell>
  );
}
