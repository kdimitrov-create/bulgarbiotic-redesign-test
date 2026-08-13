import {data, useActionData, useOutletContext} from 'react-router';
import type {Route} from './+types/account.addresses.billing';
import {getContext} from '~/lib/context';
import {getSeoMeta} from '@cloudcart/nitro';
import type {Customer} from '@cloudcart/nitro';
import {AddressListSection, readAddressFromForm} from '~/components/AddressForm';

export const meta: Route.MetaFunction = () => getSeoMeta({title: 'Адреси за фактура | Bactology'});

type ActionResponse = {error: string | null; message?: string};

export async function loader({context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  ctx.customerAccount.handleAuthStatus();
  return null;
}

export async function action({request, context}: Route.ActionArgs) {
  const ctx = await getContext(context, request);
  const form = await request.formData();
  const id = form.get('id')?.toString() ?? '';

  try {
    switch (request.method) {
      case 'POST': {
        const {errors} = await ctx.customerAccount.createBillingAddress(readAddressFromForm(form));
        if (errors.length) return data({error: errors[0].message}, {status: 400});
        return {error: null, message: 'Адресът е добавен.'} as ActionResponse;
      }
      case 'PUT': {
        if (!id) return data({error: 'Липсва номер на адрес.'}, {status: 400});
        const {errors} = await ctx.customerAccount.updateBillingAddress(id, readAddressFromForm(form));
        if (errors.length) return data({error: errors[0].message}, {status: 400});
        if (form.get('defaultAddress') === 'on') await ctx.customerAccount.setDefaultBillingAddress(id);
        return {error: null, message: 'Адресът е обновен.'} as ActionResponse;
      }
      case 'DELETE': {
        if (!id) return data({error: 'Липсва номер на адрес.'}, {status: 400});
        const {errors} = await ctx.customerAccount.deleteBillingAddress(id);
        if (errors.length) return data({error: errors[0].message}, {status: 400});
        return {error: null, message: 'Адресът е изтрит.'} as ActionResponse;
      }
      default:
        return data({error: 'Методът не е разрешен.'}, {status: 405});
    }
  } catch (err: unknown) {
    return data({error: err instanceof Error ? err.message : 'Възникна грешка'}, {status: 400});
  }
}

export default function BillingAddresses() {
  const {customer} = useOutletContext<{customer: Customer}>();
  const actionData = useActionData<ActionResponse>();

  return (
    <AddressListSection
      title="Адреси за фактура"
      addresses={customer.billingAddresses?.nodes ?? []}
      defaultAddressId={customer.defaultBillingAddress?.id}
      actionData={actionData}
    />
  );
}
