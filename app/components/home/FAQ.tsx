import {useState} from 'react';
import {Link} from 'react-router';

/**
 * FAQ accordion — 8 most-asked questions in BG, single-open behaviour.
 * Copy is original, paraphrasing the brand's actual product info.
 */
type QA = {q: string; a: string};

// Client (т.17): keep ONLY the first question here; the rest live on the
// store's full FAQ page (linked from the side).
const FAQ_ITEMS: QA[] = [
  {
    q: 'След колко време ще усетя резултат?',
    a:
      'Първи измерими промени в микробиома се установяват след около 14 дни редовен прием. Усещане за разлика — намаляване на подуване, по-стабилна храносмилателна функция, повече енергия — обикновено идва между 2 и 6 седмици. За хронични проблеми препоръчваме поне 3 месеца последователен прием.',
  },
];

export function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section className="bb-faq">
      <div className="bb-container bb-faq-grid reveal">
        <div className="bb-faq-side">
          <div className="section-tag">Често задавани въпроси</div>
          <h2 className="section-h2 bb-faq-h2">
            Имаш<br />
            въпрос? <span className="accent">Имаме отговор.</span>
          </h2>
          <p className="bb-faq-lead">
            Най-честите въпроси които получаваме за пробиотиците, дозировката и резултатите.
            Виж всички отговори или ни пиши директно.
          </p>
          <Link to="/page/chesto-zadavani-vaprosi" className="bb-faq-link" prefetch="intent">
            Виж всички въпроси
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
          <Link to="/page/about-us#contact" className="bb-faq-link">
            Пиши ни директно
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <div className="bb-faq-list">
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = openIdx === i;
            return (
              <div key={item.q} className={`bb-faq-item${isOpen ? ' open' : ''}`}>
                <button
                  type="button"
                  className="bb-faq-q"
                  aria-expanded={isOpen}
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                >
                  <span className="bb-faq-q-text">{item.q}</span>
                  <span className="bb-faq-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </span>
                </button>
                <div className="bb-faq-a">
                  <div className="bb-faq-a-inner">{item.a}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
