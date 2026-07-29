import {redirect} from 'react-router';
import type {Route} from './+types/blog._index';

/**
 * Bactology only has ONE blog ("Beauty and Health") so the multi-blog
 * landing was a dead surface. Redirect /blog → /blog/beauty-and-health
 * which renders the proper branded article grid.
 */
export async function loader(_: Route.LoaderArgs) {
  return redirect('/blog/beauty-and-health', 302);
}
