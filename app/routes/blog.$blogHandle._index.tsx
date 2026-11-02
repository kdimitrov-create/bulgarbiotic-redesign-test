import {redirect} from 'react-router';
import type {Route} from './+types/blog.$blogHandle._index';

/**
 * `/blog/{handle}` - предпазна мрежа, не канонична форма.
 *
 * Този адрес не съществува на живия bulgarbiotic.bg (връща 404 там); беше
 * измислен от редизайна и известно време стоеше на preview деплоя. Истинската
 * форма е `/blog/category/{handle}`, затова тук стои 301 - за да не остане
 * втори адрес със същото съдържание.
 */
export function loader({params, request}: Route.LoaderArgs) {
  const url = new URL(request.url);
  return redirect(`/blog/category/${params.blogHandle}${url.search}`, 301);
}
