import {useLoaderData} from 'react-router';
import type {Route} from './+types/blog._index';
import {getContext} from '~/lib/context';
import {getSeoMeta} from '@cloudcart/nitro';
import {primaryBlogHandle} from '~/lib/blog.server';
import {loadBlogListing} from '~/lib/blog-listing.server';
import {BlogListing} from '~/components/BlogListing';

/**
 * `/blog` - същият адрес, който класическата тема отдава с код 200.
 *
 * Тук имаше 302 към `/blog/{handle}`. Живият bulgarbiotic.bg обаче връща 200
 * на `/blog` (проверено 2026-08-12) и си сочи canonical към самия себе си, а в
 * Search Console `/blog` и `/blog?page=…` са 32 индексирани адреса. Редирект
 * означаваше 32 излишни прескачания и загубен сигнал, затова страницата се
 * рендира направо.
 *
 * Handle-ът пак идва от админ панела - преименува ли се блогът, страницата го
 * следва сама.
 */
export const meta: Route.MetaFunction = ({data: d}) => getSeoMeta({
  title: d?.blog ? `${d.blog.title} | Bactology Блог` : 'Блог | Bactology',
  description:
    'Знание за микробиома - експертно съдържание за храносмилане, имунитет, женско здраве и красота. Без жаргон, базирано на наука.',
});

export async function loader({context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const handle = await primaryBlogHandle(ctx.storefront);
  return loadBlogListing(ctx, request, handle);
}

export default function BlogIndexRoute() {
  const {blog, articles} = useLoaderData<typeof loader>();
  return <BlogListing blog={blog} articles={articles} crumb="Блог" />;
}
