import {redirect} from 'react-router';
import type {Route} from './+types/policies._index';

/**
 * The CloudCart Shop type doesn't expose `privacyPolicy` / `termsOfService`
 * the way the Nitro template assumes — `ctx.storefront.getPolicies()` throws
 * a GraphQL 500 against bulgarbiotic.bg. All our policy content lives at
 * `/page/<handle>` (privacy-policy, terms-policy, cookie-policy etc.), so
 * route `/policies` to the closest equivalent index page instead.
 */
export async function loader(_: Route.LoaderArgs) {
  return redirect('/page/terms-policy', 302);
}
