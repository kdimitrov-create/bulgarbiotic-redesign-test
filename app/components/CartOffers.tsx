import {giftProgress, cartOffers} from '~/lib/cart-offers';

import {SHOW_BGN} from '~/lib/currency';
const EUR_TO_BGN = 1.95583;

const fmtEur = (n: number) =>
  new Intl.NumberFormat('bg-BG', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(n) + ' €';

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

      {rules.map((rule) => (
        <div key={rule.id} className="bb-offer bb-offer-rule">
          <div className="bb-offer-text">
            <span className="bb-offer-icon" aria-hidden="true">★</span>
            <strong>{rule.title}</strong>
            {rule.message ? <span className="bb-offer-msg"> · {rule.message}</span> : null}
          </div>
        </div>
      ))}

      <style>{`
        .bb-offers { display: flex; flex-direction: column; gap: 8px; margin: 10px 0 4px; }
        .bb-offer {
          background: #fff7fb;
          border: 1px solid rgba(227, 22, 108, 0.18);
          border-radius: 12px;
          padding: 10px 12px;
        }
        .bb-offer.is-earned {
          background: #f2fbf5;
          border-color: rgba(22, 163, 74, 0.28);
        }
        .bb-offer-text {
          font-size: 12.5px; line-height: 1.45; color: var(--color-ink);
        }
        .bb-offer-text strong { font-weight: 800; }
        .bb-offer-text .accent { color: var(--color-brand-pink); }
        .bb-offer-icon { margin-right: 6px; }
        .bb-offer-bgn { color: rgba(10, 37, 64, 0.5); font-size: 11.5px; }
        .bb-offer-msg { color: rgba(10, 37, 64, 0.62); }
        /* Съобщението идва като HTML от панела - изравняваме отстоянията му
           с останалите редове в лентата. */
        .bb-offer-msg-html p { margin: 0; }
        .bb-offer-msg-html strong { font-weight: 800; }

        .bb-offer-track {
          margin-top: 8px; height: 5px; border-radius: 999px;
          background: rgba(10, 37, 64, 0.1); overflow: hidden;
        }
        .bb-offer-fill {
          height: 100%; border-radius: 999px;
          background: var(--color-brand-pink);
          transition: width 0.35s ease;
        }
        .bb-offer.is-earned .bb-offer-fill { background: #16a34a; }
      `}</style>
    </div>
  );
}
