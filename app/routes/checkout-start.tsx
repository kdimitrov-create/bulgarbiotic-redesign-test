import {redirect} from 'react-router';
import type {Route} from './+types/checkout-start';
import {getContext} from '~/lib/context';
import {envValue} from '~/lib/env.server';
import {
  readCampaignCookie,
  withCampaignParams,
  campaignAttributionEnabled,
} from '~/lib/campaign-attribution';
import {attributeCart} from '~/lib/cart-attribution.server';

/**
 * Тръгването към касата: пресен адрес, издаден в мига на натискането.
 *
 * Никой не вижда тази страница. Тя няма компонент - само loader, който чете
 * количката, взима `cart.checkoutUrl` и препраща браузъра нататък.
 *
 * ⚠️ Защо не е обикновена връзка към `cart.checkoutUrl`, както беше досега:
 * този адрес е `/checkout/adopt/<jwt>`, а талонът в него живее **10 минути**
 * (измерено 14.08.2026: `exp = iat + 600`). Вгради ли се в HTML-а при
 * рендиране, часовникът тръгва, когато човекът отвори количката, не когато
 * натисне бутона. Прочете ли описанията, смени ли бройка, върне ли се след
 * кафе - талонът е изтекъл и платформата го връща на `/cart/<ключ>`, който
 * след насочването на домейна е наш и е 404.
 *
 * Оттук талонът е на секунди и количката е тази от момента на натискането, а
 * не от зареждането на страницата (важно при два отворени таба).
 *
 * Празна количка или API без адрес: обратно на `/cart`, вместо грешка.
 */
export async function loader({context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const env = ctx.env as Record<string, string | undefined>;
  const cart = (await ctx.cart.get().catch(() => null)) as any;

  if (!cart?.checkoutUrl || (cart?.totalQuantity ?? 0) === 0) {
    throw redirect('/cart', 302);
  }

  /* Адресът идва със СЛУЖЕБНИЯ домейн, който 301-ва към основния - тоест един
   * hop, платен от всеки купувач. Пренасочваме го към домейна, на който човекът
   * вече стои, и hop-ът отпада. Проверено на живо 26.08.2026 с истински талон:
   * `https://bulgarbiotic.bg/checkout/adopt/<jwt>` приема количката и отваря
   * същата каса (556 187 B, продуктът и сумата вътре), защото платформата
   * обслужва `/checkout*` сама и на насочения домейн.
   *
   * ⚠️ Само когато посетителят е на ИСТИНСКИЯ домейн на магазина. На Nova
   * адреса и локално `/checkout*` не съществува - там служебният домейн си
   * остава единственият верен път.
   *
   * Тази смяна плаща hop-а, който кампанийните параметри добавят по-долу:
   * пътят до касата остава колкото беше. */
  const siteDomain = (envValue(env, 'PUBLIC_SITE_DOMAIN') || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  const here = new URL(request.url);
  let target: string = cart.checkoutUrl;
  if (siteDomain && here.hostname === siteDomain) {
    try {
      const checkout = new URL(target);
      checkout.protocol = here.protocol;
      checkout.host = here.host;
      target = checkout.toString();
    } catch {
      // Неразбираем адрес: оставяме го както го е дала платформата.
    }
  }

  /* Източникът на трафика се записва пак, без да се чака.
   *
   * Веднъж вече е подаден при появата на количката. Тук е поправката за случая,
   * в който онази заявка е паднала: „повторното извикване заменя записаното",
   * тоест по-лошо от това да се повтори е поръчката да излезе като директен
   * трафик. Последен момент, в който количката е още наша. */
  attributeCart(env, request, (cart as any)?.id);

  /* Кампанията, кликната от имейл, пътува дотук в cookie. Подава се на
   * платформата СЛЕД adopt, не върху него: adopt пренасочва към гол `/checkout`
   * и параметрите на собствения му адрес се губят. Така беше от 26.08 до
   * 15.09 и приписаните поръчки паднаха до нула - виж
   * `app/lib/campaign-attribution.ts`.
   *
   * Затова браузърът прави adopt на заден план и чак после отваря
   * `/checkout?cc_campaign=…` в сесията, в която количката вече е. Точно по
   * този път минава и бутонът в писмата за изоставена количка, който и след
   * прехвърлянето продължи да се приписва.
   *
   * Само на истинския домейн: другаде `/checkout*` не е на същия произход.
   * Няма ли cookie (повечето хора), пътят остава днешният. */
  const campaign = campaignAttributionEnabled(envValue(env, 'CAMPAIGN_ATTRIBUTION'))
    ? readCampaignCookie(request.headers.get('Cookie'))
    : null;
  if (campaign && siteDomain && here.hostname === siteDomain) {
    try {
      const adopt = new URL(target);
      if (adopt.host === here.host) {
        return campaignHandoff(adopt.pathname + adopt.search, withCampaignParams('/checkout', campaign));
      }
    } catch {
      // Неразбираем адрес: обикновеното пренасочване по-долу.
    }
  }

  return redirect(target, 302);
}

/**
 * Страницата за миг между бутона и касата, само за дошлите от кампания.
 *
 * Мерено на живо 15.09.2026 с истинска количка, в една и съща бисквитена
 * сесия:
 *
 *   adopt/<jwt>                                  → 302 /checkout
 *   /checkout                                    → 200, продуктът вътре
 *   /checkout?cc_campaign=X&cc_subscriber=Y      → 302, после 200 с продукта
 *
 * Тоест касата не губи количката заради параметрите.
 *
 * `redirect: 'manual'`: на adopt му трябва само първият отговор, който слага
 * количката в сесията. Да го следваме значи да свалим половин мегабайт каса,
 * която веднага изхвърляме.
 *
 * Падне ли нещо (мрежа, 8 секунди без отговор, изключен JS), човекът отива на
 * adopt както досега - без приписване, но и без спряно плащане.
 */
function campaignHandoff(adoptPath: string, checkoutPath: string): Response {
  const json = (value: string) => JSON.stringify(value).replace(/</g, '\\u003c');
  const html = `<!doctype html>
<html lang="bg"><head><meta charset="utf-8"><meta name="robots" content="noindex">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Към плащане…</title>
<noscript><meta http-equiv="refresh" content="0;url=${adoptPath.replace(/"/g, '&quot;')}"></noscript>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font:16px system-ui,sans-serif;color:#333}</style>
</head><body><p>Към плащане…</p>
<script>
(function () {
  var adopt = ${json(adoptPath)}, next = ${json(checkoutPath)}, done = false;
  function go(url) { if (done) return; done = true; location.replace(url); }
  var timer = setTimeout(function () { go(adopt); }, 8000);
  fetch(adopt, {credentials: 'include', redirect: 'manual', cache: 'no-store'})
    .then(function () { clearTimeout(timer); go(next); })
    .catch(function () { clearTimeout(timer); go(adopt); });
})();
</script></body></html>`;
  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}
