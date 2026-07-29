import {data, redirect} from 'react-router';
import {lookupRedirect} from '~/lib/redirects';

export async function loader({request}: {request: Request}) {
  const target = lookupRedirect(new URL(request.url).pathname);
  if (target) throw redirect(target, 301);
  throw data('Not Found', {status: 404});
}

export default function CatchAll() { return null; }
