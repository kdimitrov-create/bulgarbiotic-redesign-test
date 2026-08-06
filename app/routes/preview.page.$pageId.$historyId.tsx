import {useLoaderData, data} from 'react-router';
import type {Route} from './+types/preview.page.$pageId.$historyId';
import {getContext} from '~/lib/context';
import {getSeoMeta} from '@cloudcart/nitro';
import {PageShell} from '~/components/PageShell';
import {BuilderDesignRenderer} from '~/components/BuilderDesignRenderer';
import {fetchPageDraft} from '~/lib/page-preview.server';

/**
 * „Преглед" from the page builder.
 *
 * The panel links here with the page id and the id of the history row being
 * edited, so the merchant can see a draft in the real design before publishing.
 * Until 2026-08-06 the route did not exist and the button landed on a 404.
 *
 * Never indexed — it shows unpublished content.
 */
export const meta: Route.MetaFunction = ({data: d}) => [
  ...getSeoMeta({title: `Преглед: ${(d as any)?.draft?.title ?? 'страница'} | Bactology`}),
  {name: 'robots', content: 'noindex, nofollow'},
];

export async function loader({params, context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const draft = await fetchPageDraft(
    ctx.env as Record<string, string | undefined>,
    params.pageId,
    params.historyId,
  );
  if (!draft) {
    throw data(
      'Черновата не може да бъде заредена. Провери дали storefront-ът има Admin токен.',
      {status: 404},
    );
  }
  return {draft};
}

export default function PagePreview() {
  const {draft} = useLoaderData<typeof loader>();

  return (
    <PageShell title={draft.title} tag="Преглед" breadcrumbs={[]} variant="narrow">
      <div className="bb-preview-note">
        {draft.published
          ? 'Това е публикуваната версия на страницата.'
          : 'Това е чернова — още не е публикувана и не се вижда от клиентите.'}
        {draft.handle && (
          <>
            {' '}Адрес след публикуване: <code>/page/{draft.handle}</code>
          </>
        )}
      </div>

      <BuilderDesignRenderer design={draft.design as any} />

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
        .bb-preview-note code {
          background: rgba(10, 37, 64, 0.06);
          padding: 1px 6px;
          border-radius: 5px;
        }
      `}</style>
    </PageShell>
  );
}
