import {useRouteLoaderData} from 'react-router';
import type {CartData} from '@cloudcart/nitro';
import {pushEcommerce, idForHandle, money2} from '~/lib/analytics';

/**
 * "Към плащане" — hands the Nitrogen cart over to CloudCart's hosted checkout.
 *
 * Why this is not just `<a href={cart.checkoutUrl}>`:
 * the Storefront API returns a bare `<store>/cart` for `checkoutUrl` — no cart
 * id, no signed JWT — and `cartCreate` sets no cookie. That URL only works if
 * the browser already holds the classic theme's session cart, which it never
 * does when the storefront runs on its own host. Verified 2026-07-29: following
 * it just lands back on this same cart page.
 *
 * So we hand off explicitly, using the classic theme's own documented endpoint
 * (`POST /cart/add` with product_id / variant_id / quantity — read off the live
 * theme's add-to-cart form). A top-level form POST is deliberate: it navigates
 * the browser to the store host, so the session cookie is set first-party.
 * `fetch()` would not work — the cookie would be cross-site and dropped.
 *
 * Gated on PUBLIC_CLASSIC_ORIGIN. Unset → the old link, so nothing changes
 * until the origin is configured. Set it to the host that actually serves the
 * classic theme (the `*.cloudcart.net` service domain); it must NOT be the
 * domain routed to this storefront, or the POST lands back on this worker.
 */
export function CheckoutButton({
  cart,
  className,
  trackValue,
}: {
  cart: CartData | null;
  className: string;
  /** Сумата, която количката РЕАЛНО показва. Виж защо в `trackBeginCheckout`. */
  trackValue?: number | null;
}) {
  const root = useRouteLoaderData('root') as {classicOrigin?: string | null} | undefined;
  const classicOrigin = root?.classicOrigin ?? null;
  const lines = (cart?.lines?.nodes ?? []) as any[];

  // Последното събитие, което storefront-ът може да отчете: оттук нататък
  // клиентът е в checkout-а на платформата и GTM там си пали purchase сам.
  function trackBeginCheckout() {
    /* 🛑 Сумата НЕ идва от `cost.totalAmount`.
     *
     * Това поле лъже на този магазин. Мерено на живо 18.08.2026 с количка от
     * 2 бр. Pets и действащо правило „Поръчай 2, плати 1":
     *
     *   количката показва      21,47 лв  ← вярното
     *   Meta на касата праща   21,47     ← вярното
     *   `cost.totalAmount`     21,73     ← оттук се пълнеше събитието
     *
     * (По-рано, 13.08, същото поле връщаше ТОЧНО половината от сбора на
     * редовете - 73,67 срещу 147,34. Виж и коментара в `CartDrawer`.)
     *
     * Затова сумата се подава отвън: количката вече я е сметнала веднъж, от
     * обобщението на търговеца, и точно нея вижда клиентът. Резервният вариант
     * остава сборът на редовете - пак по-близо до истината от `cost`. */
    const fallback = lines.reduce(
      (sum: number, line: any) => sum + parseFloat(line.cost?.totalAmount?.amount ?? '0'),
      0,
    );
    pushEcommerce('begin_checkout', {
      currency: (cart as any)?.cost?.totalAmount?.currencyCode ?? 'EUR',
      value: money2(typeof trackValue === 'number' && trackValue > 0 ? trackValue : fallback),
      items: lines.map((line: any) => {
        // Същата сметка като в `AddToCartButton` - виж коментара там.
        const qty = line.quantity ?? 1;
        const lineTotal = parseFloat(line.cost?.totalAmount?.amount ?? '0');
        const perQty = parseFloat(
          line.cost?.amountPerQuantity?.amount ?? line.merchandise?.price?.amount ?? '0',
        );
        const paidPerUnit = lineTotal > 0 && qty > 0 ? lineTotal / qty : perQty;
        const basePerUnit =
          parseFloat(
            line.cost?.compareAtAmountPerQuantity?.amount ??
              line.merchandise?.compareAtPrice?.amount ??
              '0',
          ) || Math.max(perQty, paidPerUnit);
        return {
          item_id: idForHandle(line.merchandise?.product?.handle),
          item_name: line.merchandise?.product?.title ?? '',
          price: money2(basePerUnit),
          discount: money2(Math.max(0, basePerUnit - paidPerUnit)),
          quantity: qty,
        };
      }),
    });
  }

  const label = (
    <>
      Към плащане
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    </>
  );

  if (!cart || cart.totalQuantity === 0) {
    return <button type="button" className={className} disabled>{label}</button>;
  }

  // Редът е нарочен: първо собственият механизъм на платформата
  // (`/checkout/adopt/<jwt>`). Проверено 2026-08-09, че той стига до касата
  // дори когато домейнът вече сочи към storefront-а, защото CloudCart обслужва
  // `/checkout*` сам.
  //
  // ⚠️ Адресът НЕ се вгражда тук, а се иска наново при натискането, през
  // `/checkout-start`. Талонът в него живее 10 минути (`exp = iat + 600`,
  // измерено 14.08.2026), а вграден в HTML-а часовникът му тръгва при
  // зареждането на страницата. `cart.checkoutUrl` остава като признак, че
  // платформата приема тази количка - няма ли го, падаме на ръчното подаване.
  //
  // Ръчното подаване към класическия хост остава само за случая, в който
  // количката няма такъв адрес. То е и по-крехкото: служебният домейн 301-ва
  // всичко към основния, а основният след прехвърлянето е този worker, където
  // `/cart/add` е 404.
  if (cart.checkoutUrl) {
    return (
      <a href="/checkout-start" className={className} onClick={trackBeginCheckout}>{label}</a>
    );
  }

  if (classicOrigin && lines.length > 0) {
    return (
      <form method="POST" action={`${classicOrigin.replace(/\/$/, '')}/cart/add`} onSubmit={trackBeginCheckout}>
        {lines.map((line, i) => (
          <CheckoutLineFields key={line.id ?? i} line={line} />
        ))}
        <button type="submit" className={className}>{label}</button>
      </form>
    );
  }

  return <button type="button" className={className} disabled>{label}</button>;
}

/**
 * One cart line as hidden fields. The classic form wants bare numbers.
 *
 * ⚠️ Продуктовото id НЕ идва от реда: `CartLine.merchandise.product` носи само
 * `title`, `handle` и снимка. Дотук се четеше `product.id`, което е винаги
 * `undefined`, тоест `if (!productId) return null` изхвърляше ВСЕКИ ред и
 * формата тръгваше празна. Затова id-то се вади от handle-а.
 */
function CheckoutLineFields({line}: {line: any}) {
  const productId = idForHandle(line.merchandise?.product?.handle);
  const variantId = numericId(line.merchandise?.id);
  if (!productId) return null;
  return (
    <>
      <input type="hidden" name="product_id" value={productId} />
      <input type="hidden" name="variant_id" value={variantId ?? ''} />
      <input type="hidden" name="quantity" value={String(line.quantity ?? 1)} />
    </>
  );
}

function numericId(gid: unknown): string | null {
  if (typeof gid !== 'string') return null;
  const m = gid.match(/(\d+)\s*$/);
  return m ? m[1] : null;
}
