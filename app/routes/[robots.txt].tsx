import type {Route} from './+types/[robots.txt]';
import {generateRobots} from '@cloudcart/nitro';

export function loader({request}: Route.LoaderArgs) {
  const origin = new URL(request.url).origin;
  return new Response(generateRobots({
    rules: [{userAgent: '*', allow: ['/'], disallow: ['/admin', '/cart', '/account']}],
    sitemap: origin + '/sitemap.xml',
  }), {headers: {'Content-Type': 'text/plain', 'Cache-Control': 'public, max-age=86400'}});
}
