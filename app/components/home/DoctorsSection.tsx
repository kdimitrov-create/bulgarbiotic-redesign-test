/**
 * "Препоръчано от специалисти" — real doctors who endorse Bactology (client
 * supplied 2026-07-24). Text (names / titles / bios / quotes) is REAL; the
 * photos live in `public/images/doctors/`. Until the client supplies the photo
 * files, each card gracefully falls back to a monogram circle (no fake faces).
 *
 * To add the photos: drop `kyurkchiev.jpg`, `marinova.jpg`, `dimitrov.jpg`
 * (square, ~600×600, face centered) into `public/images/doctors/`.
 */
type Doctor = {
  name: string;
  /** Academic post-nominal, e.g. "дмн". */
  credentials?: string;
  title: string;
  affiliation?: string;
  photo: string;
  initials: string;
  bio: string;
  quote: string;
};

const DOCTORS: Doctor[] = [
  {
    name: 'Проф. д-р Доброслав Кюркчиев',
    credentials: 'дмн',
    title: 'Клинична имунология',
    affiliation: 'Медицински университет – София',
    photo: '/images/doctors/kyurkchiev.jpg',
    initials: 'ДК',
    bio: 'Специалист по клинична имунология с над 26 години опит и професор към Медицински университет – София. Автор на над 120 научни публикации с над 1000 цитирания и носител на награда за високи научни и преподавателски постижения.',
    quote:
      'Добре е след антибиотично лечение да се приемат пробиотици. Антибиотиците унищожават не само вредните, но и полезните бактерии, което може да доведе до дисбактериоза. Приемът на пробиотици подпомага възстановяването на полезните бактерии и връщането на естествения баланс в червата.',
  },
  {
    name: 'Д-р Есмералда Маринова',
    title: 'Стоматолог, поливалентна стоматология',
    affiliation: 'Marinova Dental Clinic, София',
    photo: '/images/doctors/marinova.jpg',
    initials: 'ЕМ',
    bio: 'Стоматолог с дългогодишен опит и специалност по поливалентна стоматология. От 1997 г. развива своя частна практика, а днес посреща пациенти в Marinova Dental Clinic. Непрекъснато усъвършенства знанията си в ендодонтията и естетичната стоматология.',
    quote:
      'Здравата усмивка зависи не само от добрата хигиена, но и от баланса на бактериите в устната кухина. Пробиотиците на Bactology подпомагат естествения микробиом и допринасят за свеж дъх — с приятен ванилов вкус, подходящ и за деца.',
  },
  {
    name: 'Д-р Златко Димитров',
    title: 'Педиатър, клиничен алерголог',
    affiliation: 'Аджибадем Сити Клиник Болница Токуда',
    photo: '/images/doctors/dimitrov.jpg',
    initials: 'ЗД',
    bio: 'Педиатър и клиничен алерголог с дългогодишен опит в диагностиката и лечението на детски алергични заболявания. Заместник-председател на Българското дружество по алергология с интереси в респираторните алергии, астмата и хранителните алергии при деца.',
    quote:
      'Около 70–80% от клетките на имунната система са свързани с червата, затова поддържането на здравословен чревен микробиом е от съществено значение. Приемът на пробиотик, включително по време на бременност, може да намали риска от алергични прояви.',
  },
];

export function DoctorsSection() {
  return (
    <section className="bb-docs" aria-labelledby="bb-docs-title">
      <div className="bb-docs-head">
        <span className="bb-docs-eyebrow">Науката зад Bactology</span>
        <h2 id="bb-docs-title" className="bb-docs-title">
          Какво казва медицината за <em>микробиома</em>
        </h2>
        <p className="bb-docs-lead">
          Формулите ни стъпват на клинична експертиза. Ето какво казват лекарите, които
          стоят зад тях.
        </p>
      </div>

      <div className="bb-docs-grid">
        {DOCTORS.map((d) => (
          <article key={d.name} className="bb-doc">
            <div className="bb-doc-photo">
              <span className="bb-doc-initials" aria-hidden="true">{d.initials}</span>
              <img
                src={d.photo}
                alt={d.name}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            <h3 className="bb-doc-name">
              {d.name}
              {d.credentials && <span className="bb-doc-cred">, {d.credentials}</span>}
            </h3>
            <div className="bb-doc-title">{d.title}</div>
            {d.affiliation && <div className="bb-doc-aff">{d.affiliation}</div>}
            <p className="bb-doc-bio">{d.bio}</p>
            <blockquote className="bb-doc-quote">{d.quote}</blockquote>
          </article>
        ))}
      </div>

      <style>{`
        .bb-docs { max-width: 1380px; margin: 0 auto; padding: 72px 36px; }
        .bb-docs-head { text-align: center; max-width: 640px; margin: 0 auto 44px; }
        .bb-docs-eyebrow {
          display: inline-block; font-size: 12px; font-weight: 800; letter-spacing: 1.6px;
          text-transform: uppercase; color: var(--color-brand-pink); margin-bottom: 12px;
        }
        .bb-docs-title { font-size: 34px; line-height: 1.15; font-weight: 800; color: var(--color-ink); margin: 0; }
        .bb-docs-title em { font-family: var(--font-serif); font-style: italic; font-weight: 500; color: var(--color-brand-pink); }
        .bb-docs-lead { margin: 16px 0 0; font-size: 15px; line-height: 1.7; color: rgba(10, 37, 64, 0.65); }

        .bb-docs-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 26px; }
        .bb-doc {
          display: flex; flex-direction: column; align-items: center; text-align: center;
          background: #fff; border: 1px solid rgba(10, 37, 64, 0.08); border-radius: 22px;
          padding: 32px 26px 28px; box-shadow: 0 20px 44px -30px rgba(10, 37, 64, 0.4);
        }
        .bb-doc-photo {
          position: relative; width: 116px; height: 116px; border-radius: 999px;
          margin-bottom: 18px; overflow: hidden; flex: 0 0 auto;
          background: linear-gradient(135deg, var(--color-cream-2, #f5efe3), #fdeef3);
          box-shadow: 0 0 0 5px #fff, 0 0 0 6px rgba(227, 22, 108, 0.18);
        }
        .bb-doc-initials {
          position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
          font-family: var(--font-serif); font-style: italic; font-size: 34px; font-weight: 600;
          color: var(--color-brand-pink);
        }
        .bb-doc-photo img { position: relative; width: 100%; height: 100%; object-fit: cover; display: block; }

        .bb-doc-name { font-size: 17px; font-weight: 800; color: var(--color-ink); margin: 0; line-height: 1.25; }
        .bb-doc-cred { font-weight: 600; color: rgba(10, 37, 64, 0.5); }
        .bb-doc-title { margin-top: 5px; font-size: 13px; font-weight: 700; color: var(--color-brand-pink); }
        .bb-doc-aff { margin-top: 3px; font-size: 12px; color: rgba(10, 37, 64, 0.55); }
        .bb-doc-bio { margin: 16px 0 0; font-size: 13.5px; line-height: 1.65; color: rgba(10, 37, 64, 0.72); }
        .bb-doc-quote {
          position: relative; margin: 20px 0 0; padding: 16px 18px 16px 20px;
          text-align: left; font-size: 13.5px; line-height: 1.65; font-style: italic;
          color: var(--color-ink); background: var(--color-cream-2, #f7f2e8); border-radius: 14px;
          border-left: 3px solid var(--color-brand-pink);
        }
        .bb-doc-quote::before {
          content: '“'; position: absolute; top: -6px; left: 8px;
          font-family: var(--font-serif); font-size: 40px; color: rgba(227, 22, 108, 0.28); line-height: 1;
        }

        @media (max-width: 900px) { .bb-docs-grid { grid-template-columns: 1fr; max-width: 520px; margin: 0 auto; } }
        @media (max-width: 720px) { .bb-docs { padding: 56px 20px; } .bb-docs-title { font-size: 27px; } }
      `}</style>
    </section>
  );
}
