import {Outlet, useLoaderData} from 'react-router';
import type {Route} from './+types/account';
import {getContext} from '~/lib/context';
import {getSeoMeta} from '@cloudcart/nitro';
import {AccountSidebar} from '~/components/AccountSidebar';

export const meta: Route.MetaFunction = () => getSeoMeta({title: 'Профил | Bactology'});

export async function loader({context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  ctx.customerAccount.handleAuthStatus(); // throws redirect to /account/login
  const customer = await ctx.customerAccount.getCustomer();
  if (!customer) {
    // Token expired between isLoggedIn() and getCustomer(): bounce to login.
    ctx.customerAccount.handleAuthStatus();
  }
  return {customer};
}

export default function AccountLayout() {
  const {customer} = useLoaderData<typeof loader>();
  const greeting = customer?.firstName
    ? `Здравей, ${customer.firstName}`
    : 'Твоят профил';

  /* Съдържанието на профила стои в същата рамка като логото и иконката на
     количката в хедъра: `bb-container` е точно тя - 1380px, центрирана, с 36px
     отстрани. Измерено при екран 1440px: логото започва на 59px и контейнерът
     също. Дотук тук стоеше гол `max-w-7xl`, тоест без центриране и без
     отстояние, затова страничното меню опираше в ръба. */
  return (
    <div className="bb-container py-10">
      <h1 className="text-2xl font-bold tracking-tight mb-8">{greeting}</h1>
      <div className="grid gap-10 md:grid-cols-[200px_1fr]">
        <aside>
          <AccountSidebar />
        </aside>
        <div>
          <Outlet context={{customer}} />
        </div>
      </div>
    </div>
  );
}
