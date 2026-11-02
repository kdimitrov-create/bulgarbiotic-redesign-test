import {liveModule} from '~/lib/theme-modules';

/**
 * Банерът „Купи повече, спести повече" в количката.
 *
 * Идва от уиджета „Checkout text" (`checkoutText`) в панела - същото поле,
 * което досега се виждаше чак в касата. По молба на клиента (14.10.2026) се
 * показва една стъпка по-рано, в количката, за да реши клиентът колко продукта
 * да вземе, преди да е тръгнал да плаща. Търговецът продължава да сменя
 * картинката и текста от панела; изключен уиджет или празен текст - няма банер.
 */
export function CheckoutTextBanner({cls}: {cls: 'bb-cd' | 'bb-cart'}) {
  const mod = liveModule('checkoutText');
  const html = String(mod?.settings?.text ?? '').trim();
  if (!html) return null;
  const title = String(mod?.settings?.title ?? '').trim();

  return (
    <div className={`bb-ct-banner ${cls}-ct-banner`}>
      {title && <div className="bb-ct-banner-title">{title}</div>}
      <div className="bb-ct-banner-body" dangerouslySetInnerHTML={{__html: html}} />
    </div>
  );
}
