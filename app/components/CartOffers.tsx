import {Link, useFetcher} from 'react-router';

import {giftProgress, productGifts, cartOffers} from '~/lib/cart-offers';
import {CART_ACTION} from '~/lib/cart-action';
import {DYSON_CAMPAIGN} from '~/lib/dyson-campaign';
import {useTrackAddToCart} from '~/lib/use-track-add-to-cart';

import {SHOW_BGN, EUR_TO_BGN} from '~/lib/currency';

const fmtEur = (n: number) =>
  new Intl.NumberFormat('bg-BG', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(n) + ' €';

/**
 * Само текстът на съобщението, без етикети и разредки.
 *
 * Едно и също правило идва по два пътя - веднъж от панела (`rules[].message`)
 * и веднъж от обобщението на платформата (`messages`) - но с различно
 * форматиране. Сравняват се голите текстове, за да не се покаже два пъти.
 * Нарочно е без DOM: върви и на сървъра при първата рисунка.
 */
function plainText(html: string | null | undefined): string {
  return String(html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Спечеленият подарък като ред в количката.
 *
 * Редът с нулевата цена го слага ПЛАТФОРМАТА и то чак когато количката ѝ бъде
 * подадена на касата (`/checkout/adopt`) - нулата идва от `cross_sell_id`, а
 * него го пише само тя. Сложим ли го ние през Storefront API-то, влиза с
 * пълните си 40 €, тоест подарък, за който се плаща.
 *
 * Затова, докато не се стигне касата, подаръкът се показва оттук: същият ред,
 * същата снимка, изрична нула и бележка кога влиза. Иначе купувачът минаваше
 * прага, четеше „Печелиш хавлия" и не виждаше нищо в количката - а слезеше ли
 * веднъж под прага, истинският ред отпадаше и повече не се връщаше, защото
 * никой от наша страна не може да го сложи.
 *
 * Не се рисува, когато платформата вече е сложила своя ред.
 */
export function CartGiftLines({
  subtotalEur,
  lines,
  variant = 'drawer',
}: {
  subtotalEur: number;
  lines: Array<any>;
  /** Двата списъка ползват различни класове - чекмеджето `bb-cd-item`, а
   *  страницата `bb-cart-item`. Редът е един и същ, само облеклото се сменя. */
  variant?: 'drawer' | 'page';
}) {
  /* Кога подаръкът вече е в количката НАИСТИНА.
   *
   * Дотук се сравняваше само вариантът, а това не върши работа за оферта,
   * чиято НАГРАДА е същият продукт, който я и задейства (кампанийната №62:
   * „имаш продукт 58 → получаваш продукт 58"). Там платеният ред носи същия
   * вариант и подаръкът се скриваше още преди да е даден.
   *
   * Признакът е нулата: реда с `cross_sell_id` го пише платформата и той
   * влиза с 0,00 €. Наш ред със същия продукт никога не е нула.
   */
  const freeInCart = new Set(
    lines
      .filter((l) => Math.abs(parseFloat(String(l?.cost?.totalAmount?.amount ?? '1'))) < 0.005)
      .map((l) => l?.merchandise?.id)
      .filter(Boolean) as string[],
  );
  const handlesInCart = new Set(
    lines
      .map((l) => String(l?.merchandise?.product?.handle ?? ''))
      .filter(Boolean),
  );

  /* Двата вида оферти стигат до един и същ ред: по праг (хавлията) и по
     продукт в количката (втората опаковка). */
  const earned = [
    ...giftProgress(subtotalEur).filter((g) => g.earned),
    ...productGifts(handlesInCart),
  ].filter(
    (g) =>
      g.variantId &&
      !freeInCart.has(g.variantId) &&
      // Подарък, чийто продукт вече е в количката, НЕ се обявява изобщо:
      // при автоматично добавяне платформата заключва `hide_cart_products`,
      // тоест точно тогава офертата НЕ се задейства. Обещание тук би било
      // празно.
      !(g.handle && handlesInCart.has(g.handle)),
  );
  if (!earned.length) return null;

  const c =
    variant === 'page'
      ? {row: 'bb-cart-item', img: 'bb-cart-item-img', info: 'bb-cart-item-info', name: 'bb-cart-item-name', price: 'bb-cart-item-price'}
      : {row: 'bb-cd-item', img: 'bb-cd-item-imglink', info: 'bb-cd-item-info', name: 'bb-cd-item-name', price: 'bb-cd-item-price'};

  return (
    <>
      {earned.map((gift) => (
        <li key={`gift-${gift.id}`} className={`${c.row} bb-gift-row`}>
          <span className={c.img}>
            {gift.imageUrl ? (
              <img src={gift.imageUrl} alt={gift.productTitle ?? 'Подарък'} loading="lazy" />
            ) : null}
          </span>
          <div className={c.info}>
            <span className={c.name}>{gift.productTitle}</span>
            <div className="bb-gift-note">
              <span className="bb-gift-badge">Подарък</span>
              добавя се на касата
            </div>
          </div>
          <div className={c.price}>
            <div className="bb-gift-price">0,00 €</div>
          </div>
        </li>
      ))}
    </>
  );
}


/**
 * Полето на кампанията „1 + 1 подарък + томбола за Dyson" в количката.
 *
 * Едно поле, два пътя - кой се рисува, решава `DYSON_CAMPAIGN.mechanic`,
 * защото двата броят по различен начин:
 *
 *   • `cart-rule` - отстъпката иска ДВА броя на реда. Затова бутонът слага
 *     два, а при нечетен брой полето подканя за още един: условието в панела
 *     е „точно 2" и при 3 отстъпката изчезва мълчаливо.
 *   • `cross-sell` - платформата добавя втория брой сама, на касата. Затова
 *     бутонът слага един и полето само обявява подаръка.
 *
 * Нарочно е в `CartOffers`, а не в чекмеджето: страницата `/cart` и
 * чекмеджето рисуват един и същ компонент, тоест промоцията не може да се
 * появи на едното място и да липсва на другото.
 */
export function DysonPromoBox({lines}: {lines: Array<any>}) {
  const act = useFetcher();

  const line = lines.find(
    (l) => String(l?.merchandise?.product?.handle ?? '') === DYSON_CAMPAIGN.handle,
  );
  const qty = Number(line?.quantity ?? 0);
  const busy = act.state !== 'idle';

  /* Нечетен брой на реда - остава един без своята половинка. Тогава не се
     добавя нов ред, а се вдига количеството на съществуващия: втори ред със
     същия вариант количката не приема, а и правилото брои по ред. */
  const odd = DYSON_CAMPAIGN.mechanic === 'cart-rule' && qty > 0;

  /* Колко броя иска бутонът. При правилото се допълва до следващата пълна
     двойка, тоест от 1 на 2 и от 3 на 4 - а не „плюс две", което би оставило
     количката пак на нечетно. */
  const addQty = DYSON_CAMPAIGN.mechanic === 'cart-rule'
    ? DYSON_CAMPAIGN.pairSize - (qty % DYSON_CAMPAIGN.pairSize)
    : 1;

  /* Бутонът на офертата също се брои, но САМО когато слага нов ред. При
     нечетен брой той минава през `UPDATE_CART`, тоест вдига брояча на вече
     съществуващ ред, а нито един брояч в количката не праща ecommerce събитие.
     Сметките стоят тук, над ранните изходи, защото hook не бива да се вика
     след `return`. */
  useTrackAddToCart(
    act,
    odd ? undefined : DYSON_CAMPAIGN.variantId,
    addQty,
    odd ? undefined : DYSON_CAMPAIGN.handle,
  );

  if (!DYSON_CAMPAIGN.active) return null;

  /* Спечелено: при правилото - четен брой (двойката е налице); при
     кръстосаната оферта - стига да има един брой, останалото е работа на
     платформата. */
  const earned =
    DYSON_CAMPAIGN.mechanic === 'cart-rule'
      ? qty > 0 && qty % DYSON_CAMPAIGN.pairSize === 0
      : qty > 0;

  if (earned) {
    /* Едно изречение, дословно както го написа клиентът, и то е СЪЩОТО, което
       стои на продуктовите страници. Дотук полето разказваше своя версия
       („Вторият брой е подарък - добавя се на касата…") и купувачът четеше две
       различни обещания за едно и също нещо (клиент, 31.08). */
    return (
      <div className="bb-offer is-earned bb-offer-dyson">
        <div className="bb-offer-text">
          <span className="bb-offer-icon" aria-hidden="true">🎁</span>
          {DYSON_CAMPAIGN.blurb}
        </div>
      </div>
    );
  }

  const cta = odd ? DYSON_CAMPAIGN.ruleOddCta
    : DYSON_CAMPAIGN.mechanic === 'cart-rule' ? DYSON_CAMPAIGN.ruleCta
    : DYSON_CAMPAIGN.cartCta;

  return (
    <div className="bb-offer bb-offer-dyson">
      <div className="bb-offer-text">
        <span className="bb-offer-icon" aria-hidden="true">🎁</span>
        {odd ? `${DYSON_CAMPAIGN.ruleOddTitle} - ${DYSON_CAMPAIGN.ruleOddText}` : DYSON_CAMPAIGN.blurb}
      </div>
      <div className="bb-offer-dyson-row">
        <Link
          to={`/product/${DYSON_CAMPAIGN.handle}`}
          className="bb-offer-dyson-name"
          prefetch="intent"
        >
          {DYSON_CAMPAIGN.shortTitle}
        </Link>
        <act.Form method="post" action={CART_ACTION} className="bb-offer-dyson-form">
          {odd ? (
            <>
              <input type="hidden" name="action" value="UPDATE_CART" />
              <input type="hidden" name="lineId" value={String(line?.id ?? '')} />
              <input type="hidden" name="quantity" value={String(qty + addQty)} />
            </>
          ) : (
            <>
              <input type="hidden" name="action" value="ADD_TO_CART" />
              <input type="hidden" name="merchandiseId" value={DYSON_CAMPAIGN.variantId} />
              {/* Резерва: няма ли вариантът да се приеме, действието намира
                  първия вариант по handle - същото поле, което ползва и bump
                  cart-ът. */}
              <input type="hidden" name="handle" value={DYSON_CAMPAIGN.handle} />
              <input type="hidden" name="quantity" value={String(addQty)} />
            </>
          )}
          <button
            type="submit"
            className="bb-offer-dyson-btn"
            disabled={busy}
            aria-label={`${cta} - ${DYSON_CAMPAIGN.shortTitle}`}
          >
            {busy ? 'Момент…' : cta}
          </button>
        </act.Form>
      </div>
    </div>
  );
}

/**
 * Промоции в количката — the merchant's cross-sell gifts and cart rules,
 * read live from the admin panel.
 *
 * The gift strip mirrors the free-shipping bar right above it: same progress
 * language, so a shopper reads two thresholds the same way instead of learning
 * two patterns. Renders nothing when the merchant has no active offers, which
 * is the normal state most of the year.
 */
export function CartOffersStrip({
  subtotalEur,
  messages = [],
  lines = [],
}: {
  subtotalEur: number;
  /** Редовете в количката - оттам се разбира дали кампанийният продукт е вътре. */
  lines?: Array<any>;
  /**
   * Съобщенията, които правилата за количката отправят към купувача, както ги
   * връща `Cart.messages`: почти достигнат праг, току-що приложена промоция.
   * Описанието на полето е недвусмислено - „покажи ги, това е търговецът,
   * който говори на купувача". Дотук не се показваха никъде.
   */
  messages?: string[];
}) {
  const gifts = giftProgress(subtotalEur);
  const {rules} = cartOffers();
  // Гол текст, за да се сравняват съобщение от панела и съобщение от
  // платформата, без да пречи форматирането и разредките.
  const seenMessages = new Set(messages.map(plainText).filter(Boolean));
  if (!gifts.length && !rules.length && !messages.length && !DYSON_CAMPAIGN.active) return null;

  return (
    <div className="bb-offers">
      {/* Кампанията стои НАД праговете на панела: тя е тазседмичната причина
          да се купи, а безплатната доставка е постоянният фон. */}
      <DysonPromoBox lines={lines} />

      {gifts.map((gift) => (
        <div key={gift.id} className={`bb-offer${gift.earned ? ' is-earned' : ''}`}>
          <div className="bb-offer-text">
            {gift.earned ? (
              <>
                <span className="bb-offer-icon" aria-hidden="true">🎁</span>
                Печелиш <strong>{gift.productTitle}</strong>
                {gift.free ? (
                  <>
                    {' '}- добавя се към поръчката за <strong className="accent">0,00 €</strong>
                  </>
                ) : (
                  <> - добавя се към поръчката</>
                )}
              </>
            ) : (
              <>
                <span className="bb-offer-icon" aria-hidden="true">🎁</span>
                Още <strong className="accent">{fmtEur(gift.remaining)}</strong>{' '}
                {SHOW_BGN && <span className="bb-offer-bgn">({fmtEur(gift.remaining * EUR_TO_BGN).replace('€', 'лв')})</span>}{' '}
                и получаваш <strong>{gift.productTitle}</strong>
              </>
            )}
          </div>
          <div className="bb-offer-track">
            <div className="bb-offer-fill" style={{width: `${gift.percent}%`}} />
          </div>
        </div>
      ))}

      {messages.map((html, i) => (
        <div key={`msg-${i}`} className="bb-offer bb-offer-rule">
          <div
            className="bb-offer-text bb-offer-msg-html"
            dangerouslySetInnerHTML={{__html: html}}
          />
        </div>
      ))}

      {rules
        // Съобщението на правилото се пише в панела с форматиране, значи идва
        // като HTML. Платформата вече го връща сред `messages` и то се рисува
        // отгоре, затова тук същият текст се пропуска - иначе кутията излизаше
        // два пъти, а долната показваше самите етикети <p> и <strong>.
        .filter((rule) => !seenMessages.has(plainText(rule.message)))
        .map((rule) => (
          <div key={rule.id} className="bb-offer bb-offer-rule">
            <div className="bb-offer-text">
              <span className="bb-offer-icon" aria-hidden="true">★</span>
              <strong>{rule.title}</strong>
              {rule.message ? (
                <span
                  className="bb-offer-msg bb-offer-msg-html"
                  dangerouslySetInnerHTML={{__html: ' · ' + rule.message}}
                />
              ) : null}
            </div>
          </div>
        ))}

    </div>
  );
}
