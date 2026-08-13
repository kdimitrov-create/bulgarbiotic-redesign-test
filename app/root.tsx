import {Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteLoaderData, useLocation, useFetchers, useRouteError, isRouteErrorResponse, type MetaFunction} from 'react-router';
import type {Route} from './+types/root';
import {getContext} from '~/lib/context';
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

export const meta: MetaFunction = () => getSeoMeta({title: 'Bulgar Biotic - Български пробиотици Bactology'});

export const shouldRevalidate: Route.ShouldRevalidateFunction = ({formMethod, currentUrl, nextUrl}) => {
  if (formMethod && formMethod !== 'GET') return true;
  if (currentUrl.toString() === nextUrl.toString()) return true;
  return false;
};

export async function loader({context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const [shop, headerMenu, footerMenu, wishlistIds] = await Promise.all([
    ctx.storefront.getShop(),
    ctx.storefront.getMenu('main-menu'),
    ctx.storefront.getMenu('footer'),
    ctx.customerAccount.isLoggedIn()
      ? ctx.customerAccount.getWishlistIds().catch(() => [])
      : Promise.resolve([]),
  ]);

  const env = ctx.env as Record<string, string | undefined>;
  // Apply live discounts here, not only during render: route loaders and the
  // components that price cart lines can run before root's component body does,
  // and they read this module synchronously.
  // Labels and banners ride along for the same reason: the listing queries do
  // not return them, so without this the badges only ever appear on the PDP.
  const [live, marks, packages, offers, adminMenu, adminFooter, themeModules, customCss, ] = await Promise.all([
    fetchAutoDiscounts(env),
    fetchProductMarks(env),
    fetchQuantityPackages(env),
    fetchCartOffers(env),
    // The header menu comes from Дизайн → Навигация. The Storefront API returns
    // no menus for this store, so this is the only way the two can match.
    fetchMainMenu(env),
    // The footer columns come from the same place, group "footer": one group
    // per column, so the merchant owns the footer links too.
    fetchFooterMenu(env),
    // The merchant's own theme modules: promo bar, homepage texts and banners,
    // product showcases. Same reason as the marks — surfaces read them directly.
    fetchThemeModules(env),
    // The merchant's own CSS for the classes they put on builder rows.
    fetchCustomCss(env),
    // Стойността на промо кодовете: Storefront API-то приема кода, но не
    // мени сметката, затова количката я смята сама по данните от админа.
  ]);
  setAutoDiscounts(live?.discounts, live?.handles);
  setFreeShippingOver(live?.freeShippingOver);
  setProductMarks(marks);
  setQuantityPackages(packages);
  setCartOffers(offers);
  setThemeModules(themeModules);

  return {shop, headerMenu: adminMenu ?? headerMenu, footerMenu, adminFooter, cart: ctx.cart.get(), cartSummary: ctx.cart.get().then((c: any) => fetchCartSummary(env, c?.id)), wishlistIds, origin: new URL(request.url).origin, tracking: resolveTracking(env), storeDomain: envValue(env, 'PUBLIC_STORE_DOMAIN') || null, classicOrigin: env.PUBLIC_CLASSIC_ORIGIN || null, live, marks, packages, offers, themeModules: forClient(themeModules), customCss};
}

export function Layout({children}: {children: React.ReactNode}) {
  const data = useRouteLoaderData<typeof loader>('root');
  const {pathname, search} = useLocation();
  const page = new URLSearchParams(search).get('page');
  const canonical = data?.origin ? data.origin + pathname + (page ? `?page=${page}` : '') : null;
  return (
    <html lang="bg">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0a2540" />
        {/* Снимките идват от друг домейн, а браузърът разбира това чак когато
          * стигне до тях в HTML-а: чак тогава тръгват DNS, TLS и връзката, и
          * чак после самата картинка. Тези два реда правят ръкостискането
          * предварително, докато страницата още се чете. Първата видима снимка
          * е точно оттам, тоест печалбата е върху най-бавното нещо на екрана. */}
        <link rel="preconnect" href="https://cdncloudcart.com" crossOrigin="anonymous" />
        {data?.storeDomain ? <link rel="preconnect" href={`https://${data.storeDomain}`} /> : null}
        {canonical ? <link rel="canonical" href={canonical} /> : null}
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
      <Aside type="cart" heading="КОШНИЦА">
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
  let msg = 'Unknown error', status = 500;
  if (isRouteErrorResponse(error)) { msg = error.data?.message ?? error.statusText; status = error.status; }
  else if (error instanceof Error) { msg = error.message; }
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 md:px-8 md:py-10">
        <div className="text-center py-16">
          <h1 className="text-8xl font-extrabold text-gray-200 leading-none">{status}</h1>
          <p className="text-gray-500 mt-2">{msg}</p>
          <a href="/" className="text-brand font-semibold mt-4 inline-block">Go Home</a>
        </div>
      </main>
    </div>
  );
}
