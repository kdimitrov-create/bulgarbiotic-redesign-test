import {redirect} from 'react-router';
import type {Route} from './+types/blog._index';
import {getContext} from '~/lib/context';
import {primaryBlogHandle} from '~/lib/blog.server';

/**
 * Магазинът има една блог категория, затова отделна страница със списък от
 * блогове би била празна повърхност. `/blog` праща направо към нея.
 *
 * Handle-ът вече идва от админ панела, не от кода: преименува ли се блогът,
 * редиректът го следва сам. Ако API-то не отговори, се пада на стария handle.
 */
export async function loader({context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const handle = await primaryBlogHandle(ctx.storefront);
  return redirect(`/blog/${handle}`, 302);
}
