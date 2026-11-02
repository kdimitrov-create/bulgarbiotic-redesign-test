import {Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteLoaderData, useLocation, useFetchers, useRouteError, isRouteErrorResponse, type MetaFunction} from 'react-router';
import type {Route} from './+types/root';
import {getContext} from '~/lib/context';
import {isWheelLive} from '~/lib/wheel-schedule';
import {isNewsletterPopupLive} from '~/lib/newsletter-popup-schedule';
import {isWheelPreview} from '~/lib/wheel-preview.server';
import {fetchCartSummary} from '~/lib/cart-totals.server';
import {fetchAutoDiscounts} from '~/lib/live-discounts.server';
import {setAutoDiscounts, setFreeShippingOver} from '~/lib/active-discounts';
import {fetchProductMarks} from '~/lib/product-marks.server';
import {fetchMainMenu, fetchFooterMenu} from '~/lib/navigation.server';
import {fetchThemeModules} from '~/lib/theme-modules.server';
import {fetchCustomCss} from '~/lib/custom-css.server';
import {resolveTracking} from '~/lib/tracking.server';
import {envValue} from '~/lib/env.server';
import {setThemeModules, forClient} from '~/lib/theme-modules';
import {setProductMarks} from '~/lib/product-marks';
import {fetchQuantityPackages} from '~/lib/quantity-packages.server';
import {setQuantityPackages} from '~/lib/quantity-packages';
import {fetchCartOffers} from '~/lib/cart-offers.server';
import {setCartOffers} from '~/lib/cart-offers';
import {getSeoMeta} from '@cloudcart/nitro';
import {AsideProvider, Aside} from '~/components/Aside';
import {CartDrawer} from '~/components/CartDrawer';
import {PageLayout} from '~/components/PageLayout';
import '~/app.css';
import {CART_ACTION} from '~/lib/cart-action';
import {makeSoft} from '~/lib/soft.server';
import {installFetchRetry} from '~/lib/fetch-retry.server';
import {installSharedCache} from '~/lib/shared-cache.server';
import {useCampaignUrlCleanup} from '~/lib/use-campaign-url-cleanup';

/**
 * Иконката в раздела на браузъра.
 *
 * ⚠️ Сложена като обикновен `<link rel="icon">` вътре в `<head>`, тя НЕ стига до
 * страницата: React 19 се разпорежда сам с тези елементи и я изхвърля при
 * рисуването на сървъра - в готовия код я има, в отговора я няма (проверено на
 * живо 17.08.2026). През `links` я изписва `<Links />`, което е и мястото ѝ.
 */
export const links: Route.LinksFunction = () => [
  {rel: 'icon', type: 'image/x-icon', href: '/favicon.ico'},
];

export const meta: MetaFunction = () => getSeoMeta({title: 'Bulgar Biotic - Български пробиотици Bactology'});

export const shouldRevalidate: Route.ShouldRevalidateFunction = ({formMethod, currentUrl, nextUrl}) => {
  if (formMethod && formMethod !== 'GET') return true;
  if (currentUrl.toString() === nextUrl.toString()) return true;
  return false;
};

/* Шапката и двете менюта са ГЛОБАЛНИ и почти неизменни, а се теглеха от
 * Storefront API-то на всяка заявка и на всяко превъртане след „Купи" - три
 * пълни API обиколки за данни, които се менят веднъж на месеци (менютата на
 * този магазин дори са празни там - истинските идват от админа, с кеш).
 * Същият 60-секунден кеш като админ заявките. Кешира се само успешен резултат:
 * съхранен null от паднала заявка би крил шапката цяла минута. */
const BASICS_TTL_MS = 60_000;
let basicsCache: {at: number; shop: any; headerMenu: any; footerMenu: any} | null = null;

export async function loader({context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);

  // Едно заето API не бива да сваля целия сайт.
  //
  // Този loader върви на ВСЕКИ адрес и пита магазина за десетина неща наведнъж.
  // `Promise.all` пада целият, щом падне едно от тях, тоест един отказ от
  // магазина се превръщаше в 500 на страницата, която посетителят е отворил.
  // Мерено на теста: 20 адреса, отворени едновременно → 36 от 60 заявки
  // върнаха 500, а поединично същите адреси бяха наред. Причината е `429 Too
  // Many Requests` - отказите бяха и по-БЪРЗИ от успехите, което е признак за
  // ограничение, не за бавно API.
  //
  // Затова всяко от тези извиквания минава през `soft`: при отказ връща
  // резервна стойност и се записва в `degraded`, а страницата се рисува без
  // менюто/етикетите вместо да не се нарисува изобщо.
  //
  // ⏱ И КРАЕН СРОК, не само улавяне на отказ. Дотук `soft` пазеше само от
  // ОТКАЗ. Заявка, която не отговаря НИКОГА, не е отказ: `Promise.all` не се
  // разрешава, SSR-ът не връща нищо и страницата увисва до безкрай. Точно това
  // е оплакването „периодично сайтът не зарежда" (т.7): наблюдение на живо на
  // 19.08 хвана `/category/all-products` без никакъв отговор за над 25 s в
  // 12:39:10, а двадесет секунди по-късно същият адрес се върна за 87 ms.
  //
  // Срокът е 6 s, за да не отреже законните повторения при 429: те струват до
  // 300+800+1600 ms изчакване плюс четири обиколки, тоест около 4,4 s в
  // най-лошия случай. Просрочилата се заявка се брои за `degraded` точно като
  // отказ - страницата излиза без нейното парче вместо да не излезе.
  // Самата обвивка живее в `~/lib/soft.server` - ползва се и от loader-ите на
  // отделните адреси, които до 27.08 нямаха никаква защита.
  const degraded: string[] = [];
  const soft = makeSoft('root loader', degraded);

  // Повторение с изчакване при 429 - веднъж на isolate, преди първата заявка.
  installFetchRetry();
  // Върху повторенията: попадне ли се в кеша, нагоре не тръгва нищо.
  // `__waitUntil` е на ТАЗИ заявка и се подава на всяко зареждане: споделеното
  // излизане нагоре трябва да преживее заявката, която го е започнало, иначе
  // Workers го отменя и ключът в кеша остава отровен до края на изолата.
  installSharedCache((ctx.env as Record<string, unknown>)?.__waitUntil);

  const env = ctx.env as Record<string, string | undefined>;

  /* Осемте админ заявки ТРЪГВАТ СЕГА и се чакат чак долу - така вървят
     едновременно с основите, а не след тях. Дотук бяха втора последователна
     бариера и всяка страница плащаше една излишна обиколка. */
  const adminWork = Promise.all([
    soft('discounts', fetchAutoDiscounts(env), null as any),
    soft('marks', fetchProductMarks(env), null as any),
    soft('packages', fetchQuantityPackages(env), null as any),
    soft('offers', fetchCartOffers(env), null as any),
    // The header menu comes from Дизайн → Навигация. The Storefront API returns
    // no menus for this store, so this is the only way the two can match.
    soft('admin-menu', fetchMainMenu(env), null as any),
    // The footer columns come from the same place, group "footer": one group
    // per column, so the merchant owns the footer links too.
    soft('admin-footer', fetchFooterMenu(env), null as any),
    // The merchant's own theme modules: promo bar, homepage texts and banners,
    // product showcases. Same reason as the marks — surfaces read them directly.
    soft('theme-modules', fetchThemeModules(env), null as any),
    // The merchant's own CSS for the classes they put on builder rows.
    soft('custom-css', fetchCustomCss(env), null as any),
    // Стойността на промо кодовете: Storefront API-то приема кода, но не
    // мени сметката, затова количката я смята сама по данните от админа.
  ]);

  // Тръгва СЕГА, за да върви редом с останалите, а не след тях.
  const viewerWork = softViewer();

  const basicsFresh = basicsCache && Date.now() - basicsCache.at < BASICS_TTL_MS;
  const [shop, headerMenu, footerMenu, wishlistIds] = basicsFresh
    ? await Promise.all([
        basicsCache!.shop,
        basicsCache!.headerMenu,
        basicsCache!.footerMenu,
        softWishlist(),
      ])
    : await Promise.all([
        soft('shop', ctx.storefront.getShop() as Promise<any>, null),
        soft('main-menu', ctx.storefront.getMenu('main-menu') as Promise<any>, null),
        soft('footer-menu', ctx.storefront.getMenu('footer') as Promise<any>, null),
        softWishlist(),
      ]);
  if (!basicsFresh && shop) {
    basicsCache = {at: Date.now(), shop, headerMenu, footerMenu};
  }

  /* Списъкът с любими е per-клиент и НЕ се кешира. Минава през `soft`, защото
     `.catch` лови отказ, но не и ВИСЕНЕ - заспал списък държеше цялата
     страница. Условието се изчаква: `isLoggedIn()` връща обещание, а обещание
     е истина само по себе си - списъкът се искаше и за анонимните. */
  function softWishlist() {
    return soft(
      'wishlist',
      (async () => ((await ctx.customerAccount.isLoggedIn())
        ? ctx.customerAccount.getWishlistIds()
        : []))(),
      [] as any,
    );
  }
  /* Име и поща на влезлия клиент - за `cc_customer_data` и
     `cc_page_data.customer.*`. Контейнерът ги чете за Enhanced Conversions на
     Google Ads (тагове 30 и 71 - единствените, които изобщо се пускат). Дотук
     идваха от `GET /datalayer.js`, а този път при нас е 404, защото домейнът е
     насочен към витрината.

     ⛔ `isLoggedIn()` НЕ връща обещание, значи `.catch` върху него ХВЪРЛЯ и
     събаря целия loader - това свали продуктовите страници на 20.08 (73fb62f).
     ⭐ `await` е безопасен и върху стойност, която не е обещание, затова тук
     стои той, а не `.catch`.
     ⛔ И НЕ се кешира с основите: това е per-клиент. */
  function softViewer() {
    return soft(
      'viewer',
      (async () => ((await ctx.customerAccount.isLoggedIn())
        ? ctx.customerAccount.getCustomer()
        : null))(),
      null as any,
    );
  }
  // Apply live discounts here, not only during render: route loaders and the
  // components that price cart lines can run before root's component body does,
  // and they read this module synchronously.
  // Labels and banners ride along for the same reason: the listing queries do
  // not return them, so without this the badges only ever appear on the PDP.
  // Същото важи и тук: това са осем заявки към админа на всяка страница.
  // Всяка от тях е „добре е да я има", нито една не заслужава да свали
  // страницата - затова всички минават през `soft` с празна резервна стойност.

  const [live, marks, packages, offers, adminMenu, adminFooter, themeModules, customCss] = await adminWork;
  setAutoDiscounts(live?.discounts, live?.handles);
  setFreeShippingOver(live?.freeShippingOver);
  setProductMarks(marks);
  setQuantityPackages(packages);
  setCartOffers(offers);
  setThemeModules(themeModules);

  /* Само четирите полета, които контейнерът наистина чете. Нищо повече не
   * напуска сървъра: обектът от API-то носи адреси, телефони и история на
   * поръчките, а те нямат работа в dataLayer. */
  const viewer = await viewerWork;
  const customer = viewer
    ? {
        id: (viewer as any).id ?? null,
        first_name: (viewer as any).firstName ?? null,
        last_name: (viewer as any).lastName ?? null,
        email: (viewer as any).email ?? null,
      }
    : null;

  return {customer, wheelLive: isWheelLive() || (await isWheelPreview(request, env)), newsletterPopupLive: isNewsletterPopupLive(), degraded, shop, headerMenu: adminMenu ?? headerMenu, footerMenu, adminFooter, cart: ctx.cart.get(), cartSummary: ctx.cart.get().then((c: any) => fetchCartSummary(env, c?.id)).catch(() => null), wishlistIds, origin: new URL(request.url).origin, tracking: resolveTracking(env), storeDomain: envValue(env, 'PUBLIC_SITE_DOMAIN') || envValue(env, 'PUBLIC_STORE_DOMAIN') || null, classicOrigin: env.PUBLIC_CLASSIC_ORIGIN || null, live, marks, packages, offers, themeModules: forClient(themeModules), customCss};
}

export function Layout({children}: {children: React.ReactNode}) {
  const data = useRouteLoaderData<typeof loader>('root');
  const {pathname, search} = useLocation();
  const page = new URLSearchParams(search).get('page');
  const canonical = data?.origin ? data.origin + pathname + (page ? `?page=${page}` : '') : null;

  /* Контейнерът тръгва ПРЕДИ React, но СЛЕД първото рисуване.
   *
   * Дотук GTM се вдигаше от ефект в `<Analytics/>`, тоест чакаше хидратацията:
   * на Fast 3G това е 9,6 s, а банерът за съгласие излизаше на 42 s.
   *
   * ⛔ Изкушението е да се пусне право в `<head>`. НЕ се прави: двата контейнера
   * са ~800 KB и биха се били за лентата със стила, който БЛОКИРА рисуването.
   * Тоест сайтът щеше да се появява по-късно, за да излезе банерът по-рано -
   * точно обратното на целта.
   *
   * Затова изчакваме `DOMContentLoaded` (≈ първото рисуване) и чак тогава
   * пускаме, при това само контейнера със съгласието.
   *
   * Платформеният чака `load`, ПОСЛЕ бездействие. Само бездействие не стига:
   * по бавна мрежа браузърът бездейства, докато чака сваляния, тоест щеше да
   * тръгне точно когато лентата трябва на веригата със съгласието. В него няма
   * Cookiebot и нищо не му е спешно.
   *
   * `__analyticsLoaded` казва на `<Analytics/>`, че работата е свършена; ако
   * този ред не се изпълни (стар браузър, счупен HTML), ефектът там пуска
   * контейнерите както преди - резервният път остава. */
  const consentGtm = data?.tracking?.gtmId ?? null;
  const platformGtm = data?.tracking?.platformGtmId ?? null;
  const gtmBootstrap = consentGtm
    ? `(function(w,d){function g(i){var s=d.createElement('script');s.async=!0;s.src='https://www.googletagmanager.com/gtm.js?id='+encodeURIComponent(i);d.head.appendChild(s)}
function go(){if(w.__analyticsLoaded)return;w.__analyticsLoaded=!0;w.dataLayer=w.dataLayer||[];w.cc_page_data=w.cc_page_data||{locale:'bg_BG'};w.dataLayer.push({cc_page_data:w.cc_page_data});w.dataLayer.push({'gtm.start':Date.now(),event:'gtm.js'});g(${JSON.stringify(consentGtm)});${
        platformGtm
          ? `var later=function(){g(${JSON.stringify(platformGtm)})},arm=function(){'requestIdleCallback'in w?w.requestIdleCallback(later,{timeout:5000}):setTimeout(later,2000)};'complete'===d.readyState?arm():w.addEventListener('load',arm,{once:!0});`
          : ''
      }}
'loading'===d.readyState?d.addEventListener('DOMContentLoaded',go,{once:!0}):go()})(window,document);`.replace(/</g, '\\u003c')
    : null;

  return (
    <html lang="bg">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        {/* Коя версия е жива. Сървърна промяна не мени имената на чънковете,
            затова дотук деплоят не се различаваше отвън:
            `curl -s https://bulgarbiotic.bg/ | grep bb-build`. */}
        <meta name="bb-build" content={import.meta.env.VITE_BUILD_SHA || 'dev'} />
        <meta name="theme-color" content="#0a2540" />
        {/* Снимките идват от друг домейн, а браузърът разбира това чак когато
          * стигне до тях в HTML-а: чак тогава тръгват DNS, TLS и връзката, и
          * чак после самата картинка. Тези два реда правят ръкостискането
          * предварително, докато страницата още се чете. Първата видима снимка
          * е точно оттам, тоест печалбата е върху най-бавното нещо на екрана. */}
        <link rel="preconnect" href="https://cdncloudcart.com" crossOrigin="anonymous" />
        {/* Средата пази домейна ту гол, ту с протокол - на тестовия магазин
          * излизаше `https://https://…`, тоест ред, който браузърът изхвърля и
          * ръкостискането не се случва. Затова протоколът се маха тук. */}
        {data?.storeDomain ? <link rel="preconnect" href={`https://${data.storeDomain.replace(/^https?:\/\//, '')}`} /> : null}
        {canonical ? <link rel="canonical" href={canonical} /> : null}
        {/* Ръкостискането с трите чужди домейна, по които минава СЪГЛАСИЕТО.
          *
          * Банерът на Cookiebot идва по верига: контейнерът GTM се сваля, той
          * дърпа `uc.js`, той дърпа `cc.js`, и чак тогава банерът се рисува.
          * Всяко звено е на нов домейн, тоест всяко плаща DNS + TLS отначало.
          * Мерено на телефон по Fast 3G: банерът се появи на **42-рата секунда**.
          * Тези три реда правят ръкостискането предварително. */}
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://consent.cookiebot.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://consentcdn.cookiebot.com" crossOrigin="anonymous" />
        {gtmBootstrap ? (
          <script data-source="gtm-bootstrap" dangerouslySetInnerHTML={{__html: gtmBootstrap}} />
        ) : null}
        <Meta />
        <Links />
        {/* The merchant's own CSS goes last so their rules win over ours. */}
        {data?.customCss ? (
          <style
            data-source="admin-custom-css"
            dangerouslySetInnerHTML={{__html: data.customCss}}
          />
        ) : null}
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const data = useRouteLoaderData<typeof loader>('root');
  /* Кампанийните параметри от кликнат имейл са свършили работата си на
   * сървъра и остават само в адресната лента. Виж защо чистенето е тук, а
   * не с redirect, в `use-campaign-url-cleanup.ts`. */
  useCampaignUrlCleanup();
  // Brand name stays ours — the incoming commit reset it to the scaffold
  // placeholder "Nitro", which the go-live prep had already fixed.
  // Live discounts from the admin panel replace the static mirror, on the server
  // for SSR and again on the client after hydration.
  setAutoDiscounts(data?.live?.discounts, data?.live?.handles);
  setFreeShippingOver(data?.live?.freeShippingOver);
  setProductMarks(data?.marks);
  setQuantityPackages(data?.packages);
  setCartOffers(data?.offers);
  setThemeModules(data?.themeModules);

  const shop = data?.shop ?? {name: 'Bulgar Biotic', description: null};

  // Optimistic cart: after any /cart mutation (add / update / remove) the
  // fetcher response carries the authoritative updated cart. Prefer it over the
  // loader cart, which can lag a beat behind (single-fetch cookie timing on the
  // Worker) — that lag is exactly what flashed the drawer EMPTY right after a
  // "Купи" click. Falls back to the loader cart on first load / reload.
  const cartFetchers = useFetchers();
  const latestCart = cartFetchers
    .filter((f) => f.formAction === CART_ACTION && (f.data as any)?.cart)
    .map((f) => (f.data as any).cart)
    .pop();
  const cart = latestCart ? Promise.resolve(latestCart) : (data?.cart ?? Promise.resolve(null));
  // Обобщението следва същия път: прясното от действието бие това от loader-а.
  const latestSummary = cartFetchers
    .filter((f) => f.formAction === CART_ACTION && (f.data as any)?.cart)
    .map((f) => (f.data as any).cartSummary)
    .pop();
  const cartSummary = latestSummary !== undefined
    ? Promise.resolve(latestSummary)
    : (data?.cartSummary ?? Promise.resolve(null));

  return (
    <AsideProvider>
      <Aside type="cart" heading="КОШНИЦА" bare>
        <CartDrawer cart={cart} summary={cartSummary} />
      </Aside>
      <PageLayout
        shop={shop}
        headerMenu={data?.headerMenu ?? null}
        footerMenu={data?.footerMenu ?? null}
        adminFooter={data?.adminFooter ?? null}
        cart={cart}
      >
        <Outlet />
      </PageLayout>
    </AsideProvider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  let status = 500;
  if (isRouteErrorResponse(error)) status = error.status;
  // Магазинът е само на български, а тук се показваше суровото съобщение от
  // платформата: несъществуващ адрес се четеше като „404 · Internal Server
  // Error", тоест грешен продуктов линк изглеждаше като счупен сайт. Текстът
  // вече е наш, на български, и различава „няма такава страница" от авария.
  const missing = status === 404;
  // Маршрутите хвърлят свой български текст („Продуктът не е намерен"). Ползва
  // се, щом е на кирилица; английското от платформата не се показва.
  const thrown = isRouteErrorResponse(error) && typeof error.data === 'string' ? error.data : '';
  const own = /[Ѐ-ӿ]/.test(thrown) ? thrown : '';
  const title = own || (missing ? 'Такава страница няма' : 'Нещо се обърка');
  const body = missing
    ? 'Адресът е сгрешен или страницата вече не съществува.'
    : 'Опитай да презаредиш след малко. Ако се повтори, пиши ни.';
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 md:px-8 md:py-10">
        <div className="text-center py-16">
          <h1 className="text-8xl font-extrabold text-gray-200 leading-none">{status}</h1>
          <p className="mt-3 text-xl font-extrabold text-[var(--color-ink)]">{title}</p>
          <p className="text-gray-500 mt-1.5">{body}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a
              href="/"
              className="inline-flex items-center rounded-full bg-[var(--color-brand-pink)] px-6 py-3 text-sm font-bold text-white hover:no-underline"
            >
              Към началната страница
            </a>
            <a
              href="/category/all-products"
              className="inline-flex items-center rounded-full border border-[rgba(10,37,64,0.15)] px-6 py-3 text-sm font-bold text-[var(--color-ink)] hover:no-underline"
            >
              Виж продуктите
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
