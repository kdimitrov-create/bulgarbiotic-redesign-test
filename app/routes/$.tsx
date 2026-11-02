import {data, redirect} from 'react-router';
import {lookupRedirect} from '~/lib/redirects';

export async function loader({request}: {request: Request}) {
  const url = new URL(request.url);
  // Търсенето се подава, защото при таговете ценовият филтър сменя целта.
  const target = lookupRedirect(url.pathname, url.search);
  if (target) throw redirect(target, 301);
  throw data('Not Found', {status: 404});
}

export default function CatchAll() { return null; }
