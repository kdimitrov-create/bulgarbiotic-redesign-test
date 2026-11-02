import {createRequestHandler} from 'react-router';
import {createNitroContext} from '@cloudcart/nitro';
import {
  readCampaignFromUrl,
  campaignSetCookie,
  campaignAttributionEnabled,
} from './app/lib/campaign-attribution';
import {readVisitCookie, nextVisitCookie, isDocumentRequest} from './app/lib/visit-source';

const handler = createRequestHandler(
  // @ts-expect-error — virtual module provided by React Router at build time
  () => import('virtual:react-router/server-build'),
  'production',
);

export default {
  async fetch(request: Request, env: Record<string, any>, ctx?: {waitUntil?: (p: Promise<any>) => void}) {
    const url = new URL(request.url);

    // Наклонена черта накрая → 301 към адреса без нея.
    //
    // Класическата тема прави точно това (`/product/x/` → 301 → `/product/x`),
    // а React Router отдава и двете форми с код 200. Оставено така, всеки
    // продукт, категория и статия щеше да съществува на два адреса с еднакво
    // съдържание. Проверката е тук, на ръба, за да не стига до рендиране.
    if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
      const stripped = url.pathname.replace(/\/+$/, '') || '/';
      return new Response(null, {
        status: 301,
        headers: {Location: stripped + url.search},
      });
    }

    // Serve static assets from KV — try every request, fall through to SSR if not found
    if (env.ASSETS) {
      const key = `${env.WORKER_NAME}${url.pathname}`;
      const {value, metadata} = await env.ASSETS.getWithMetadata(key, {type: 'arrayBuffer'});
      if (value) {
        return new Response(value, {
          headers: {
            'Content-Type': (metadata as any)?.contentType || 'application/octet-stream',
            'Cache-Control': url.pathname.startsWith('/assets/')
              ? 'public, max-age=31536000, immutable'
              : 'public, max-age=3600',
          },
        });
      }
    }

    const context = await createNitroContext({
      request,
      env: {
        // Pass the whole worker env through. The previous explicit allow-list of
        // four keys meant `ctx.env` never saw anything else — so PUBLIC_GA_ID,
        // PUBLIC_META_PIXEL_ID, PUBLIC_CLASSIC_ORIGIN and CLOUDCART_ADMIN_PAT all
        // read back undefined and their features stayed silently switched off.
        // Server-side only; loaders still return named fields, never this object.
        ...env,
        /* Работа, която няма защо да бави отговора.
         * Етикетът на нов абонат се слага чак когато опашката на платформата го
         * създаде - това понякога е секунди. Държи се тук, за да може действието
         * да го подаде на работника и да отговори веднага. Сървърно е: loader-ите
         * връщат само именувани полета, този обект не пътува към браузъра. */
        __waitUntil: ctx?.waitUntil ? ctx.waitUntil.bind(ctx) : undefined,
        SESSION_SECRET: env.SESSION_SECRET ?? 'nitro-dev-secret',
        // Storefront API calls MUST go to the platform's service origin, never to
        // PUBLIC_STORE_DOMAIN. Once a custom domain is routed to this storefront,
        // PUBLIC_STORE_DOMAIN becomes the domain THIS worker serves — calling it
        // makes the worker request itself, which returns HTML instead of JSON and
        // 500s every data route. Nova supplies PUBLIC_API_ORIGIN for exactly this;
        // the fallback keeps local dev (plain .env) working.
        // `||` not `??` on purpose: a binding that exists but is EMPTY (secret not
        // set yet) must still fall back, otherwise the API origin becomes "".
        //
        // Сервизният домейн е ЗАКОВАН като резерва, защото Nova env-ът на този
        // storefront е празен и workflow-ът не подава PUBLIC_API_ORIGIN - тоест
        // дотук ВСЯКА API заявка на worker-а обикаляше през собствения му
        // публичен домейн (edge + диспечер наново). Одит 19.08: 16 от 120 SSR
        // заявки умираха без нито един байт, а слоевете без тази обиколка бяха
        // чисти на 140 от 140. `/api/sf` и `/api/gql` на сервизния домейн
        // отговарят направо, без redirect (проверено същия ден).
        PUBLIC_SITE_DOMAIN: env.PUBLIC_STORE_DOMAIN,
        PUBLIC_API_ORIGIN: env.PUBLIC_API_ORIGIN || 'https://bulgarbiotic-bg.cloudcart.net',
        PUBLIC_STORE_DOMAIN: env.PUBLIC_API_ORIGIN || 'https://bulgarbiotic-bg.cloudcart.net',
        PUBLIC_STOREFRONT_API_TOKEN: env.PUBLIC_STOREFRONT_API_TOKEN,
        PRIVATE_STOREFRONT_API_TOKEN: env.PRIVATE_STOREFRONT_API_TOKEN,
      },
    });

    const response = await handler(request, context);

    if (context.session.isPending) {
      response.headers.set('Set-Cookie', await context.session.commit());
    }

    /* Кликнат линк от кампания: кампанията се прибира в cookie, за да я подаде
     * `/checkout-start` на платформата в мига преди поръчката. Пълното обяснение
     * и мерките са в `app/lib/campaign-attribution.ts`.
     *
     * ⚠️ `append`, не `set`: редът по-горе презаписва цялата заглавка, тоест
     * `set` тук би изхвърлил сесийното cookie на витрината.
     *
     * Само GET/HEAD - параметрите идват от навигация по линк, а изпратена форма
     * не бива да получава cookie заради адреса си.
     *
     * Няма redirect за чистене на адреса, нарочно: на този сайт част от
     * заявките умират без нито един байт и всеки допълнителен hop е още един
     * шанс кацането от имейл да увисне. Адресът се чисти от браузъра след
     * хидратация (`useCampaignUrlCleanup` в `root.tsx`). */
    if (request.method === 'GET' || request.method === 'HEAD') {
      const attribution = campaignAttributionEnabled(env.CAMPAIGN_ATTRIBUTION)
        ? readCampaignFromUrl(url)
        : null;
      if (attribution) {
        response.headers.append('Set-Cookie', campaignSetCookie(attribution));
        // Отговор с лично cookie няма работа в общ кеш.
        response.headers.set('Cache-Control', 'private, no-store');
      }

      /* Кацането на посещението: адресът и външният referrer се прибират, за да
       * може количката да ги подаде на платформата и поръчката да излезе в
       * „Продажби по източник на трафик" вместо като директен трафик. Виж
       * `app/lib/visit-source.ts`.
       *
       * Само при истинска навигация, и само когато има какво да се запише -
       * иначе всеки отговор щеше да носи `Set-Cookie` и да стане некешируем. */
      if (isDocumentRequest(request, url)) {
        const visit = nextVisitCookie(
          readVisitCookie(request.headers.get('Cookie')),
          url,
          request.headers.get('Referer'),
          Date.now(),
        );
        if (visit) {
          response.headers.append('Set-Cookie', visit);
          response.headers.set('Cache-Control', 'private, no-store');
        }
      }
    }

    return response;
  },
};
