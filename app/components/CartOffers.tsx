import {giftProgress, cartOffers} from '~/lib/cart-offers';

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
  const inCart = new Set(
    lines.map((l) => l?.merchandise?.id).filter(Boolean) as string[],
  );
  const earned = giftProgress(subtotalEur).filter(
    (g) => g.earned && g.variantId && !inCart.has(g.variantId),
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
}: {
  subtotalEur: number;
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
  if (!gifts.length && !rules.length && !messages.length) return null;

  return (
    <div className="bb-offers">
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
