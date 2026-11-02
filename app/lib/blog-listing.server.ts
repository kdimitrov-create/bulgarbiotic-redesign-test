import {data} from 'react-router';
import {makeSoft} from '~/lib/soft.server';
import {allArticles} from '~/lib/blog.server';
import {fetchArticleImages} from '~/lib/blog-images.server';
import {enhanceArticleImages, setArticleImages} from '~/lib/article-images';

/**
 * Списъкът със статии, споделен между двата адреса, на които живее.
 *
 * Класическата тема отдава един и същ блог на `/blog` И на
 * `/blog/category/{handle}`, и двата с код 200 и собствен canonical. Nitrogen
 * трябва да прави същото, иначе единият от тях става 301 - затова логиката е
 * тук, а не в един от route файловете.
 */
export async function loadBlogListing(ctx: any, request: Request, blogHandle: string) {
  /* ⏱ Краен срок на всяко четене тук.
   *
   * До 27.08.2026 този loader беше без никаква защита, а тегли най-тежката
   * заявка на сайта: сто статии наведнъж. Заявка, която не отговори НИКОГА,
   * не е отказ - `Promise.all` не се разрешава, SSR-ът не връща нито байт и
   * връзката просто виси. Отвън това изглежда точно като „мъртва заявка":
   * TCP и TLS минават, после нищо.
   *
   * Наблюдение от 27.08: след като началната и категориите получиха срок,
   * ВСИЧКИ мъртви заявки на наблюдението се събраха на `/blog` - единственият
   * останал без срок измежду четирите наблюдавани адреса. Съвпадение или не,
   * loader без краен срок е дефект сам по себе си. */
  const soft = makeSoft('блог');

  /* Самият блог се повтаря веднъж вместо да падне на резервна стойност:
   * празният отговор тук значи 404, а грешен 404 на списъка е по-лош от 500. */
  let blog = await soft('блогът', ctx.storefront.getBlog(blogHandle), null);
  if (!blog) {
    await new Promise((r) => setTimeout(r, 400));
    blog = await soft('блогът, втори опит', ctx.storefront.getBlog(blogHandle), null);
  }
  if (!blog) throw data('Блогът не е намерен', {status: 404});

  /* Подредба по дата, най-новите отгоре.
   *
   * Storefront API-то не подрежда по дата и не приема параметър за подредба -
   * проверено: първата статия, която връща, не е най-скоро публикуваната.
   * Затова се тегли целият блог (`allArticles`, по сто на заявка - над сто
   * статии една заявка изпускаше най-новите), подрежда се и се реже на
   * страници тук. Подреждане само на текущата страница щеше да
   * нареди 12-те помежду им, но глобалният ред пак щеше да е грешен. */
  const PAGE_BY = 12;
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1);

  const [all, liveImages] = await Promise.all([
    soft('всички статии', allArticles(ctx.storefront, blogHandle), [] as any[]),
    soft('снимките на статиите', fetchArticleImages(ctx.env as Record<string, string | undefined>), null),
  ]);

  const sorted = [...(all ?? [])].sort((a: any, b: any) => {
    // Статия без дата отива най-отдолу, вместо да изскочи най-горе.
    const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return tb - ta;
  });

  // Номерата на страниците се натрупват (бутонът е „Зареди още"), затова се
  // реже от началото до края на текущата страница.
  const upTo = page * PAGE_BY;
  const articles = {
    nodes: sorted.slice(0, upTo),
    pageInfo: {
      hasNextPage: sorted.length > upTo,
      hasPreviousPage: page > 1,
      startCursor: null,
      endCursor: null,
    },
  };

  // CloudCart Storefront API returns an empty image.url for every article, so
  // the covers come from the admin panel (client 2026-08-04: "ползвай реалните
  // снимки"). The static map in article-images.ts is the fallback.
  setArticleImages(liveImages);
  const decorated = {
    ...articles,
    nodes: enhanceArticleImages((articles as any).nodes ?? [], {width: 800, height: 600}),
  };

  return {blog, articles: decorated};
}
