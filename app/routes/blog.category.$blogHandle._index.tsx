import {useLoaderData} from 'react-router';
import type {Route} from './+types/blog.category.$blogHandle._index';
import {getContext} from '~/lib/context';
import {getSeoMeta} from '@cloudcart/nitro';
import {loadBlogListing} from '~/lib/blog-listing.server';
import {BlogListing} from '~/components/BlogListing';

/**
 * `/blog/category/{handle}` - адресът, по който блог категориите са индексирани.
 *
 * Класическата тема слага „category" като трети сегмент; редизайнът беше на
 * `/blog/{handle}` и старият адрес се спасяваше с 301 в `redirects.ts`.
 * Сега маршрутът е с истинската форма и 301-та отпада.
 */
export const meta: Route.MetaFunction = ({data: d}) => getSeoMeta({
  title: d?.blog ? `${d.blog.title} | Bactology Блог` : 'Блог | Bactology',
  description:
    'Знание за микробиома - експертно съдържание за храносмилане, имунитет, женско здраве и красота. Без жаргон, базирано на наука.',
});

export async function loader({params, context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  return loadBlogListing(ctx, request, params.blogHandle);
}

export default function BlogCategoryRoute() {
  const {blog, articles} = useLoaderData<typeof loader>();
  return <BlogListing blog={blog} articles={articles} />;
}
