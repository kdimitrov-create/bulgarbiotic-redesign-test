import {redirect} from 'react-router';
import type {Route} from './+types/products';

/**
 * Legacy URL alias — old "/products" plural now permanently redirects to
 * "/category/all-products" which matches the live bulgarbiotic.bg URL
 * structure. This keeps external bookmarks, Google search results, and old
 * email links working without requiring 301 redirects at the CDN layer.
 *
 * Internal links throughout the codebase point directly at
 * "/category/all-products" — this route is just a safety net.
 */
export function loader({request}: Route.LoaderArgs) {
  const url = new URL(request.url);
  const target = `/category/all-products${url.search}`;
  // 301 permanent — search engines will update their index
  return redirect(target, 301);
}
