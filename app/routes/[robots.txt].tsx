import type {Route} from './+types/[robots.txt]';
import {generateRobots} from '@cloudcart/nitro';
import {isHiddenHost} from '~/lib/hidden-hosts';

export function loader({request}: Route.LoaderArgs) {
  const url = new URL(request.url);
  const origin = url.origin;
  if (isHiddenHost(url.hostname)) {
    return new Response('User-agent: *\nDisallow: /\n', {
      headers: {'Content-Type': 'text/plain', 'Cache-Control': 'public, max-age=3600'},
    });
  }
  return new Response(generateRobots({
    rules: [{userAgent: '*', allow: ['/'], disallow: ['/admin', '/cart', '/account']}],
    sitemap: origin + '/sitemap.xml',
  }), {headers: {'Content-Type': 'text/plain', 'Cache-Control': 'public, max-age=86400'}});
}
