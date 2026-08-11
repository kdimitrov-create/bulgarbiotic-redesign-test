import {cartGetDefault, cartLinesRemoveDefault, cartLinesUpdateDefault} from '@cloudcart/nitro';
import type {CartData, CartLine} from '@cloudcart/nitro';
import type {Route} from './+types/cart_.panel-update.$cartId';
import {getContext} from '~/lib/context';

/**
 * Панелът „Редактирай" в касата на CloudCart.
 *
 * Защо изобщо съществува този маршрут:
 *
 * Касата е страница на платформата и се обслужва от нея, защото адресът ѝ
 * започва с `/checkout`. Бутоните вътре в нея обаче сочат към `/cart/…`, а на
 * Nitrogen домейн този път е НАШ. Затова „Редактирай" питаше нас, ние връщахме
 * страница за грешка, а панелът оставаше завинаги на въртящото се кръгче
 * `sf.global.please_wait`. Същото важи и за количествата: в касата няма
 * отделни „+" и „−", единственият път до тях е през този панел.
 *
 * Защо можем да отговорим смислено:
 *
 * Токенът в адреса е буквално идентификаторът на нашата количка - проверено
 * 2026-08-11, низът съвпада знак по знак с `cart.id` от Storefront API-то. А
 * касата „осиновява" същата тази количка при предаването, тоест промяна оттук
 * се вижда веднага и в нея (проверено: махнат ред през `cartLinesRemove`
 * изчезва от касата при следващото зареждане).
 *
 * Договорът с тяхното `data-ajax-panel="true"` е прочетен от `build.js`:
 *   { status: 'success', title?: string, html?: string, footer?: string }
 * а `data-ajax="toast"` (бутоните вътре) минава през общия им обработчик,
 * който при `redirect` в отговора отвежда браузъра там.
 *
 * ⚠️ Всички стилове са inline. Панелът се вгражда в ТЯХНАТА страница, където
 * нашият `app.css` изобщо не е зареден - клас от нашия дизайн тук не значи нищо.
 */

const BRAND = '#e3166c';
const INK = '#0a2540';

/** Един ред в панела е широк колкото панела; 160 px стигат за 80 px квадратче. */
const THUMB = 160;

/**
 * Касата подава ГОЛИЯ токен, без представката.
 *
 * `cart.id` от Storefront API-то е `gid://cloudcart/Cart/9sPmkpB9…`, а в
 * адреса на бутона стои само `9sPmkpB9…`. Слашовете в представката иначе
 * чупят съвпадението на маршрута, затова двете форми се разделят изрично.
 */
const GID_PREFIX = 'gid://cloudcart/Cart/';

function toGid(value: string): string {
  return value.startsWith(GID_PREFIX) ? value : GID_PREFIX + value;
}

function toToken(value: string): string {
  return value.startsWith(GID_PREFIX) ? value.slice(GID_PREFIX.length) : value;
}

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function money(amount: unknown, currency: unknown): string {
  const value = Number(amount ?? 0);
  const code = String(currency ?? 'EUR');
  try {
    return new Intl.NumberFormat('bg-BG', {style: 'currency', currency: code}).format(value);
  } catch {
    return `${value.toFixed(2)} ${code}`;
  }
}

/**
 * Снимката винаги минава през преоразмеряване - суровите файлове са 1920 px и
 * в панел от 80 px това е чиста загуба. Произволни размери понякога дават 404,
 * затова `onerror` връща голия адрес.
 */
function thumb(line: CartLine): string {
  const raw = line.merchandise?.image?.url ?? line.merchandise?.product?.featuredImage?.url ?? '';
  if (!raw) return '';
  const base = String(raw).split('?')[0];
  const sized = `${base}?width=${THUMB}&height=${THUMB}`;
  return (
    `<img src="${esc(sized)}" alt="" width="56" height="56" loading="lazy"` +
    ` onerror="this.onerror=null;this.src='${esc(base)}'"` +
    ` style="width:56px;height:56px;object-fit:cover;border-radius:10px;flex:0 0 auto;background:#f4efe3">`
  );
}

function op(cartId: string, lineId: string, action: string): string {
  return `/cart/panel-update/${toToken(cartId)}?op=${action}&line=${encodeURIComponent(lineId)}`;
}

function stepButton(href: string, label: string, disabled: boolean): string {
  const common =
    'display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;' +
    'border-radius:8px;border:1px solid rgba(10,37,64,.18);font-size:16px;font-weight:700;' +
    'line-height:1;text-decoration:none;background:#fff;';
  if (disabled) {
    return `<span style="${common}color:rgba(10,37,64,.25);cursor:default">${label}</span>`;
  }
  return (
    `<a href="${esc(href)}" data-ajax="toast" rel="noindex nofollow"` +
    ` style="${common}color:${INK}">${label}</a>`
  );
}

function lineRow(cartId: string, line: CartLine): string {
  const title = line.merchandise?.product?.title ?? line.merchandise?.title ?? '';
  const variant = line.merchandise?.title;
  const showVariant = variant && variant !== title && variant.toLowerCase() !== 'default';
  const total = money(line.cost?.totalAmount?.amount, line.cost?.totalAmount?.currencyCode);

  return `
    <div style="display:flex;gap:12px;align-items:flex-start;padding:14px 0;border-bottom:1px solid rgba(10,37,64,.08)">
      ${thumb(line)}
      <div style="flex:1 1 auto;min-width:0">
        <div style="font-size:13px;font-weight:700;color:${INK};line-height:1.35">${esc(title)}</div>
        ${showVariant ? `<div style="font-size:11px;color:rgba(10,37,64,.55);margin-top:2px">${esc(variant)}</div>` : ''}
        <div style="display:flex;align-items:center;gap:8px;margin-top:10px">
          ${stepButton(op(cartId, line.id, 'dec'), '&minus;', false)}
          <span style="min-width:24px;text-align:center;font-size:13px;font-weight:700;color:${INK}">${line.quantity}</span>
          ${stepButton(op(cartId, line.id, 'inc'), '+', false)}
          <a href="${esc(op(cartId, line.id, 'remove'))}" data-ajax="toast" rel="noindex nofollow"
             style="margin-left:auto;font-size:12px;color:rgba(10,37,64,.55);text-decoration:underline">Премахни</a>
        </div>
      </div>
      <div style="font-size:13px;font-weight:700;color:${INK};white-space:nowrap">${esc(total)}</div>
    </div>`;
}

function panelHtml(cart: CartData): string {
  const lines = cart.lines?.nodes ?? [];
  if (!lines.length) {
    return `<div style="padding:24px;font-size:14px;color:${INK}">Количката е празна.</div>`;
  }
  const total = money(cart.cost?.totalAmount?.amount, cart.cost?.totalAmount?.currencyCode);
  return `
    <div style="padding:4px 20px 20px;font-family:inherit">
      ${lines.map((line) => lineRow(cart.id, line)).join('')}
      <div style="display:flex;justify-content:space-between;align-items:center;padding-top:16px;font-size:14px;font-weight:800;color:${INK}">
        <span>Общо</span><span>${esc(total)}</span>
      </div>
      <p style="margin:14px 0 0;font-size:11px;line-height:1.5;color:rgba(10,37,64,.5)">
        След промяна сметката в касата се преизчислява.
      </p>
      <a href="/cart" style="display:inline-block;margin-top:12px;font-size:12px;color:${BRAND};text-decoration:underline">
        Отвори цялата количка
      </a>
    </div>`;
}

/** Отговорът, който тяхното `data-ajax-panel` разбира. */
function panel(cart: CartData) {
  return Response.json(
    {
      status: 'success',
      title: 'Твоята количка',
      html: panelHtml(cart),
    },
    {headers: {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'}},
  );
}

export async function loader({params, request, context}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const cartId = toGid(params.cartId ?? '');
  const url = new URL(request.url);
  const action = url.searchParams.get('op');
  const lineId = url.searchParams.get('line');

  const get = cartGetDefault(ctx.storefront);
  let cart = await get(cartId).catch(() => null);

  if (!cart) {
    // Панелът показва само `status: 'success'`; при всичко друго остава да се
    // върти. Затова и грешката се връща като успешен панел с обяснение.
    return Response.json(
      {
        status: 'success',
        title: 'Количката',
        html:
          `<div style="padding:24px;font-size:14px;line-height:1.6;color:${INK}">` +
          'Количката не може да бъде заредена. Отвори я на ' +
          '<a href="/cart" style="color:' + BRAND + '">страницата на количката</a>.' +
          '</div>',
      },
      {headers: {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'}},
    );
  }

  if (!action || !lineId) return panel(cart);

  const line = (cart.lines?.nodes ?? []).find((n) => n.id === lineId);
  if (!line) return panel(cart);

  try {
    if (action === 'remove' || (action === 'dec' && line.quantity <= 1)) {
      cart = await cartLinesRemoveDefault(ctx.storefront)(cartId, [lineId]);
    } else if (action === 'inc' || action === 'dec') {
      const quantity = action === 'inc' ? line.quantity + 1 : line.quantity - 1;
      cart = await cartLinesUpdateDefault(ctx.storefront)(cartId, [{id: lineId, quantity}]);
    }
  } catch (error) {
    console.error('панел в касата: промяната не мина -', (error as Error).message);
    return Response.json(
      {status: 'error', msg: 'Промяната не мина. Опитай пак.'},
      {headers: {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'}},
    );
  }

  // Презареждаме касата, вместо да подменяме само панела. Сметката, доставката
  // и отстъпките се смятат от платформата при зареждане на страницата - ако
  // сменим само съдържанието на панела, отляво ще стои стара сума.
  return Response.json(
    {redirect: '/checkout', msg: 'Количката е обновена.'},
    {headers: {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'}},
  );
}
