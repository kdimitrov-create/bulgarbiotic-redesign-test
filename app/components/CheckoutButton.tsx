import {useRouteLoaderData} from 'react-router';
import type {CartData} from '@cloudcart/nitro';

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
export function CheckoutButton({cart, className}: {cart: CartData | null; className: string}) {
  const root = useRouteLoaderData('root') as {classicOrigin?: string | null} | undefined;
  const classicOrigin = root?.classicOrigin ?? null;
  const lines = (cart?.lines?.nodes ?? []) as any[];

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

  if (classicOrigin && lines.length > 0) {
    return (
      <form method="POST" action={`${classicOrigin.replace(/\/$/, '')}/cart/add`}>
        {lines.map((line, i) => (
          <CheckoutLineFields key={line.id ?? i} line={line} />
        ))}
        <button type="submit" className={className}>{label}</button>
      </form>
    );
  }

  return cart.checkoutUrl ? (
    <a href={cart.checkoutUrl} className={className}>{label}</a>
  ) : (
    <button type="button" className={className} disabled>{label}</button>
  );
}

/**
 * One cart line as hidden fields. CloudCart ids arrive from the Storefront API
 * as `gid://cloudcart/Product/67`; the classic form wants the bare number.
 */
function CheckoutLineFields({line}: {line: any}) {
  const productId = numericId(line.merchandise?.product?.id);
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
