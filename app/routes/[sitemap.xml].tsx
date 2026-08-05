import type {Route} from './+types/[sitemap.xml]';
import type {Article} from '@cloudcart/nitro';
import {getContext} from '~/lib/context';
import {generateSitemap} from '@cloudcart/nitro';

// Bactology's single blog. No getPages() list API exists, so static content
// pages are listed from their real handles (see page.$handle.tsx HANDLE_TITLES).
const BLOG_HANDLE = 'beauty-and-health';
const STATIC_PAGES = [
  'naukata-zad-bulgar-biotic',
  'chesto-zadavani-vaprosi',
  'probiotik-za-bremenni',
  'kosa-koja-i-nokti',
  'probiotik-ot-bactology',
  'mediite-za-nas',
  'pateshestvie',
  'events',
];

export async function loader({context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const origin = new URL(request.url).origin;
  const [products, collections, articles] = await Promise.all([
    ctx.storefront.getProducts(100),
    ctx.storefront.getCollections(100),
    ctx.storefront.getArticles(BLOG_HANDLE, 100).catch((): Article[] => []),
  ]);
  const entries = [
    {url: origin, changefreq: 'daily' as const, priority: 1.0},
    {url: origin + '/blog/' + BLOG_HANDLE, changefreq: 'weekly' as const, priority: 0.6},
    ...collections.map((c) => ({url: origin + '/category/' + c.handle, changefreq: 'weekly' as const, priority: 0.7})),
    ...products.map((p) => ({url: origin + '/product/' + p.handle, changefreq: 'weekly' as const, priority: 0.6})),
    ...articles.map((a) => ({url: origin + '/article/' + a.handle, changefreq: 'monthly' as const, priority: 0.5})),
    ...STATIC_PAGES.map((h) => ({url: origin + '/page/' + h, changefreq: 'monthly' as const, priority: 0.4})),
  ];
  return new Response(generateSitemap(entries), {headers: {'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=86400'}});
}
