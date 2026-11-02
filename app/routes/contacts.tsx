import type {Route} from './+types/contacts';
import {getSeoMeta} from '@cloudcart/nitro';
import {PageShell} from '~/components/PageShell';

/**
 * `/contacts` - адресът, на който класическата тема държи страницата „Контакти".
 *
 * На живия bulgarbiotic.bg това е реална страница с код 200, вписана в
 * sitemap-а („boilerplate") и с canonical към самата себе си. В редизайна я
 * нямаше и адресът връщаше 404, а връзките в header-а и footer-а сочеха към
 * `/page/about-us#contact` - котва, която дори не съществува в текста на „За
 * нас". Страницата е тук, на същия адрес, за да не се налага нито 301, нито
 * загуба на индексиран адрес.
 *
 * Данните са преписани едно към едно от старата страница (проверено 2026-08-12).
 */
export const meta: Route.MetaFunction = () =>
  getSeoMeta({
    title: 'Контакти | Bactology',
    description: 'Свържете се с нас за повече въпроси.',
  });

const EMAIL = 'bulgarbiotic.eu@gmail.com';

const PHONES = [
  {
    label: 'Поръчки и доставки',
    display: '0882 75 41 63',
    tel: '+359882754163',
  },
  {
    label: 'Консултация за употреба на продуктите',
    display: '0882 05 87 87',
    tel: '+359882058787',
  },
];

const PEOPLE = [
  {
    name: 'Никола Рангелов',
    role: 'International Sales Director',
    display: '+359 882 058 787',
    tel: '+359882058787',
  },
  {
    name: 'Мирела Янакиева',
    role: 'International Marketing Manager & Business Development Europe',
    display: '+359 888 101 281',
    tel: '+359888101281',
  },
];

export default function ContactsPage() {
  return (
    <PageShell
      title="Контакти"
      tag="Свържи се с нас"
      lead="Пиши ни или се обади - отговаряме в работни дни между 09:00 и 18:00 ч."
      variant="narrow"
    >
      <div className="bb-contacts not-prose">
        <a className="bb-contacts-card bb-contacts-card--mail" href={`mailto:${EMAIL}`}>
          <span className="bb-contacts-kicker">Email</span>
          <span className="bb-contacts-value">{EMAIL}</span>
          <span className="bb-contacts-note">Пиши по всяко време - отговаряме в работни дни.</span>
        </a>

        <div className="bb-contacts-grid">
          {PHONES.map((p) => (
            <a key={p.tel + p.label} className="bb-contacts-card" href={`tel:${p.tel}`}>
              <span className="bb-contacts-kicker">{p.label}</span>
              <span className="bb-contacts-value">{p.display}</span>
            </a>
          ))}
        </div>

        <h2 className="bb-contacts-h2">Международни продажби и партньорства</h2>
        <div className="bb-contacts-grid">
          {PEOPLE.map((p) => (
            <div key={p.tel + p.name} className="bb-contacts-card bb-contacts-card--person">
              <span className="bb-contacts-name">{p.name}</span>
              <span className="bb-contacts-role">{p.role}</span>
              <a className="bb-contacts-value bb-contacts-value--sm" href={`tel:${p.tel}`}>
                {p.display}
              </a>
            </div>
          ))}
        </div>

        <div className="bb-contacts-hours">
          <strong>Работно време</strong>
          <span>Понеделник - Петък, 09:00 - 18:00 ч.</span>
        </div>
      </div>

      <style>{`
        .bb-contacts { display: flex; flex-direction: column; gap: 16px; }
        .bb-contacts-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        @media (min-width: 640px) {
          .bb-contacts-grid { grid-template-columns: 1fr 1fr; }
        }
        .bb-contacts-card {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 22px 24px;
          background: white;
          border: 1px solid rgba(10, 37, 64, 0.09);
          border-radius: 18px;
          text-decoration: none;
          color: var(--color-ink);
          transition: transform 0.24s cubic-bezier(0.2, 0.8, 0.2, 1),
                      box-shadow 0.24s ease, border-color 0.24s ease;
        }
        a.bb-contacts-card:hover {
          transform: translateY(-3px);
          border-color: var(--color-pink-2);
          box-shadow: 0 22px 44px -20px rgba(10, 37, 64, 0.28);
          text-decoration: none;
          color: var(--color-ink);
        }
        /* Тялото на страницата е с prose типография, която подчертава всяка
           връзка. Тук картите СА връзки, затова чертата се маха изрично. */
        .bb-contacts a,
        .bb-contacts a:hover,
        .bb-contacts-card,
        .bb-contacts-card * { text-decoration: none; }
        .bb-contacts-card--mail { background: var(--color-cream-2); }
        .bb-contacts-kicker {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          color: rgba(10, 37, 64, 0.55);
        }
        .bb-contacts-value {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.4px;
          color: var(--color-brand-pink);
          word-break: break-word;
        }
        .bb-contacts-value--sm { font-size: 16px; }
        .bb-contacts-note {
          font-size: 13px;
          color: rgba(10, 37, 64, 0.6);
        }
        .bb-contacts-h2 {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.5px;
          color: var(--color-ink);
          margin: 18px 0 0;
        }
        .bb-contacts-name { font-size: 15px; font-weight: 800; color: var(--color-ink); }
        .bb-contacts-role {
          font-size: 12.5px;
          line-height: 1.45;
          color: rgba(10, 37, 64, 0.6);
          margin-bottom: 4px;
        }
        .bb-contacts-hours {
          display: flex;
          flex-wrap: wrap;
          gap: 4px 10px;
          align-items: baseline;
          padding: 18px 24px;
          border-radius: 18px;
          background: var(--color-pink-1);
          font-size: 14px;
          color: rgba(10, 37, 64, 0.75);
        }
        .bb-contacts-hours strong { color: var(--color-ink); }
      `}</style>
    </PageShell>
  );
}
