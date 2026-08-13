import {NewsletterInlineForm} from '~/components/NewsletterInlineForm';

/**
 * /page/abomanmet-za-byuletin — Newsletter subscription landing page.
 *
 * Rebuilds the original bulgarbiotic.bg newsletter page (slogan, subscriber
 * benefits, what's inside, the 10%-off incentive, GDPR + frequency note) in the
 * redesign's design language: cream canvas, serif display headings, pink accents.
 *
 * Формата пише в истинските абонати на магазина през `/api/subscribe` - същият
 * маршрут, който обслужва футъра и попъпа.
 */
export function NewsletterPageContent() {
  return (
    <>
      {/* ─── HERO + SIGN-UP FORM ─── */}
      <section className="bb-news-hero not-prose">
        <div className="bb-news-hero-inner">
          <span className="bb-news-eyebrow">Бюлетин</span>
          <h2 className="bb-news-hero-h">
            Абонирай се за бюлетина на<br />
            <em>Bulgar Biotic</em>
          </h2>
          <p className="bb-news-hero-p">
            И получавай най-актуалните ни промоционални предложения - специални
            кодове, ексклузивни намаления и ранен достъп до нови продукти.
          </p>

          <NewsletterInlineForm
            id="bb-consent-newsletter-page"
            formClassName="bb-news-form"
            success={(message) => (
              <div className="bb-news-thanks" role="status">
                <span className="bb-news-thanks-icon" aria-hidden="true">✓</span>
                <div>
                  <strong>Благодарим ти!</strong>
                  <span>{message}</span>
                </div>
              </div>
            )}
          />

          <p className="bb-news-consent">
            Използваме имейла ти само за да ти пращаме бюлетина и офертите ни.
            Данните се обработват според GDPR и можеш да се отпишеш по всяко време.
          </p>
        </div>
      </section>

      {/* ─── SUBSCRIBER BENEFITS ─── */}
      <section className="bb-news-benefits not-prose">
        <div className="bb-news-section-head">
          <span className="bb-news-tag">Защо да се абонираш</span>
          <h2 className="bb-news-h2">Какво получаваш като абонат</h2>
        </div>
        <div className="bb-news-grid">
          {[
            {t: 'Персонализирани оферти', d: 'Подбрани спрямо теб - без излишен шум в пощата.'},
            {t: 'Ексклузивни намаления', d: 'Отстъпки, недостъпни никъде другаде извън бюлетина.'},
            {t: 'Ранен достъп до новости', d: 'Виждаш новите продукти преди всички останали.'},
            {t: 'Здравно съдържание', d: 'Научно-базирани съвети от експертите на Bactology.'},
          ].map((b, i) => (
            <div key={i} className="bb-news-card">
              <div className="bb-news-card-num">{String(i + 1).padStart(2, '0')}</div>
              <h3>{b.t}</h3>
              <p>{b.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── 10% INCENTIVE ─── */}
      <section className="bb-news-incentive not-prose">
        <div className="bb-news-incentive-badge">−10%</div>
        <div className="bb-news-incentive-text">
          <h2>Код за −10% при първата регистрация</h2>
          <p>
            Новите абонати получават еднократен код за 10% отстъпка -{' '}
            <strong>валиден за всички продукти, включително вече намалените</strong>.
          </p>
        </div>
      </section>

      {/* ─── WHAT'S INSIDE ─── */}
      <section className="bb-news-inside not-prose">
        <div className="bb-news-section-head">
          <span className="bb-news-tag">В бюлетина</span>
          <h2 className="bb-news-h2">Какво ще намериш вътре</h2>
          <p className="bb-news-section-sub">
            Обикновено няколко имейла месечно - малко повече при специални промоции.
          </p>
        </div>
        <div className="bb-news-pills">
          <span className="bb-news-pill">Специални дисконтни кодове</span>
          <span className="bb-news-pill">Месечни оферти</span>
          <span className="bb-news-pill">Flash промоции за абонати</span>
          <span className="bb-news-pill">Научно-базирано здравно съдържание</span>
        </div>
      </section>

      <style>{`
        .bb-news-hero { padding: 8px 0 4px; }
        .bb-news-hero-inner { max-width: 620px; margin: 0 auto; text-align: center; }
        .bb-news-eyebrow, .bb-news-tag {
          display: inline-block;
          font-size: 11px; font-weight: 800;
          letter-spacing: 1.8px; text-transform: uppercase;
          color: var(--color-brand-pink);
          margin-bottom: 14px;
        }
        .bb-news-hero-h {
          font-family: var(--font-serif);
          font-weight: 600;
          font-size: clamp(30px, 5vw, 46px);
          line-height: 1.08;
          letter-spacing: -0.8px;
          color: var(--color-ink);
          margin: 0 0 16px;
        }
        .bb-news-hero-h em { color: var(--color-brand-pink); font-style: italic; }
        .bb-news-hero-p {
          font-size: 16px; line-height: 1.6;
          color: rgba(10, 37, 64, 0.72);
          margin: 0 auto 28px; max-width: 500px;
        }

        .bb-news-form {
          display: flex; gap: 10px;
          max-width: 460px; margin: 0 auto;
          background: white;
          border: 1.5px solid rgba(10, 37, 64, 0.12);
          border-radius: 999px;
          padding: 6px 6px 6px 8px;
        }
        .bb-news-form input {
          flex: 1;
          border: 0; outline: 0; background: transparent;
          padding: 0 14px;
          font-family: inherit; font-size: 15px;
          color: var(--color-ink);
        }
        .bb-news-form input::placeholder { color: rgba(10, 37, 64, 0.4); }
        .bb-news-form button {
          border: 0; cursor: pointer;
          background: var(--color-brand-pink); color: white;
          font-family: inherit; font-size: 14px; font-weight: 800;
          letter-spacing: 0.2px;
          padding: 0 26px; min-height: 46px;
          border-radius: 999px;
          transition: background 0.18s, transform 0.12s;
          white-space: nowrap;
        }
        .bb-news-form button:hover { background: #c20d59; }
        .bb-news-form button:active { transform: scale(0.98); }

        .bb-news-thanks {
          display: inline-flex; align-items: center; gap: 14px;
          max-width: 460px; margin: 0 auto;
          background: var(--color-pink-1);
          border: 1px solid rgba(227, 22, 108, 0.18);
          border-radius: 16px;
          padding: 18px 22px;
          text-align: left;
        }
        .bb-news-thanks-icon {
          width: 34px; height: 34px; flex-shrink: 0;
          border-radius: 999px;
          background: var(--color-brand-pink); color: white;
          display: inline-flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 17px;
        }
        .bb-news-thanks strong { display: block; color: var(--color-ink); font-size: 15px; margin-bottom: 2px; }
        .bb-news-thanks span { font-size: 13px; color: rgba(10, 37, 64, 0.7); line-height: 1.5; }

        .bb-news-consent {
          font-size: 12px; line-height: 1.6;
          color: rgba(10, 37, 64, 0.5);
          margin: 16px auto 0; max-width: 420px;
        }

        /* ── section heads ── */
        .bb-news-section-head { text-align: center; margin: 0 0 28px; }
        .bb-news-h2 {
          font-family: var(--font-serif);
          font-weight: 600;
          font-size: clamp(24px, 3.4vw, 34px);
          letter-spacing: -0.5px;
          color: var(--color-ink);
          margin: 0;
        }
        .bb-news-section-sub {
          font-size: 14.5px; color: rgba(10, 37, 64, 0.62);
          margin: 10px auto 0; max-width: 460px;
        }

        /* ── benefits ── */
        .bb-news-benefits { margin-top: 64px; }
        .bb-news-grid {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;
        }
        @media (max-width: 860px) { .bb-news-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 480px) { .bb-news-grid { grid-template-columns: 1fr; } }
        .bb-news-card {
          background: white;
          border: 1px solid rgba(10, 37, 64, 0.08);
          border-radius: 16px;
          padding: 24px 20px;
        }
        .bb-news-card-num {
          font-family: var(--font-serif);
          font-size: 24px; font-weight: 600; font-style: italic;
          color: var(--color-brand-pink);
          margin-bottom: 12px;
        }
        .bb-news-card h3 {
          font-size: 16px; font-weight: 800;
          color: var(--color-ink); margin: 0 0 8px;
        }
        .bb-news-card p {
          font-size: 13.5px; line-height: 1.55;
          color: rgba(10, 37, 64, 0.68); margin: 0;
        }

        /* ── incentive ── */
        .bb-news-incentive {
          margin-top: 56px;
          display: flex; align-items: center; gap: 28px;
          background: linear-gradient(135deg, #0a2540 0%, #112c4d 100%);
          color: white;
          border-radius: 22px;
          padding: 36px 40px;
        }
        @media (max-width: 620px) {
          .bb-news-incentive { flex-direction: column; text-align: center; gap: 18px; padding: 30px 24px; }
        }
        .bb-news-incentive-badge {
          flex-shrink: 0;
          font-family: var(--font-serif);
          font-weight: 600; font-size: 46px; letter-spacing: -1.5px;
          color: #f4d585;
        }
        .bb-news-incentive-text h2 {
          font-size: clamp(20px, 3vw, 26px); font-weight: 800;
          letter-spacing: -0.4px; margin: 0 0 8px;
        }
        .bb-news-incentive-text p {
          font-size: 14.5px; line-height: 1.6; margin: 0;
          color: rgba(255, 255, 255, 0.82);
        }
        .bb-news-incentive-text strong { color: #f4d585; }

        /* ── what's inside ── */
        .bb-news-inside { margin-top: 56px; padding-bottom: 8px; }
        .bb-news-pills {
          display: flex; flex-wrap: wrap; justify-content: center; gap: 12px;
          max-width: 620px; margin: 0 auto;
        }
        .bb-news-pill {
          background: var(--color-pink-1);
          border: 1px solid rgba(227, 22, 108, 0.16);
          color: var(--color-ink);
          font-size: 14px; font-weight: 600;
          padding: 11px 20px; border-radius: 999px;
        }
      `}</style>
    </>
  );
}
