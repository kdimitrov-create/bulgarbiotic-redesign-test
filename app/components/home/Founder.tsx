import {useState} from 'react';

/**
 * Founder section — Marieta Zaharieva, managing director of Bulgar Biotic.
 *
 * Client (т.10): mission-focused story + a "Прочети повече" toggle that reveals
 * the full "Булгар Биотик – семейният бранд…" long-form brand story.
 */
export function Founder() {
  const [expanded, setExpanded] = useState(false);
  return (
    <section className="bb-founder">
      <div className="bb-container bb-founder-grid reveal">
        <div className="bb-founder-portrait">
          <span className="bb-founder-stamp">Управител · от 2019</span>
          <img
            src="/images/people/founder-enhanced.png"
            alt="Мариета Захариева — управител на Bulgar Biotic"
            loading="lazy"
          />
        </div>

        <div className="bb-founder-text">
          <div className="section-tag">Историята зад бранда</div>
          <h2 className="bb-founder-h2">
            Мариета Захариева и нейната мисия —<br />
            <span className="bb-founder-accent">добрите бактерии.</span>
          </h2>

          <p className="bb-founder-lead">
            Личното предизвикателство се превръща в мисия. След години на ръководни позиции, свързани с
            високо темпо, отговорности и ежедневен стрес, Мариета Захариева насочва вниманието си към
            вътрешното здраве и ролята на микробиома за цялостното благополучие. Това лично осъзнаване я
            вдъхновява да създаде Bulgar Biotic с една ясна цел – да направи науката за микробиома
            по-достъпна и да помогне на повече хора да изградят здравето си отвътре навън.
          </p>
          <p className="bb-founder-lead">
            Днес компанията разработва висококачествени пробиотични решения, вдъхновени от българската
            традиция и подкрепени от съвременната наука.
          </p>

          <blockquote className="bb-founder-quote">
            <span className="bb-founder-quotemark" aria-hidden="true">“</span>
            Вярвам, че истинското здраве започва с грижата за микробиома. Когато създаваш с мисия,
            продуктите носят реална промяна в живота на хората.
          </blockquote>

          {expanded && (
            <div style={{marginTop: 22, paddingTop: 22, borderTop: '1px solid rgba(10,37,64,0.1)'}}>
              <h3 style={{fontSize: 18, fontWeight: 800, color: 'var(--color-ink)', margin: '0 0 14px', lineHeight: 1.3}}>
                Булгар Биотик – семейният бранд, който превърна грижата за микробиома в своя мисия
              </h3>
              <p className="bb-founder-lead">
                Все повече хора осъзнават, че доброто здраве започва от баланса в червата. Именно върху
                тази идея е създаден Булгар Биотик – български семеен бранд, който съчетава научни
                разработки, традициите на Lactobacillus bulgaricus и модерен подход към пробиотиците.
              </p>
              <p className="bb-founder-lead">
                Историята на компанията започва с личното преживяване на основателя Мариета Захариева.
                След здравословен проблем, породен от дългогодишен стрес, тя насочва вниманието си към
                науката за микробиома и открива колко тясно са свързани червата, имунитетът и цялостното
                благосъстояние. Това поставя началото на Булгар Биотик през 2019 г. с мисията да направи
                грижата за микробиома достъпна и разбираема за всяко семейство.
              </p>
              <p className="bb-founder-lead">
                Днес компанията разработва пробиотични продукти за различни потребности – храносмилане,
                имунитет, стрес, интимно и орално здраве. Формулите комбинират клинично проучени
                пробиотични щамове с висококачествени съставки като коластра, пчелно млечице и български
                билки, а иновативните форми – таблетки за дъвчене, шоколадови перли и сашета – правят
                приема лесен и приятен както за деца, така и за възрастни.
              </p>
              <p className="bb-founder-lead">
                Освен в разработването на продукти, Булгар Биотик инвестира активно в образователни
                инициативи, чрез които популяризира научно обоснована информация за ролята на микробиома.
                Компанията вярва, че информираните хора вземат по-добри решения за своето здраве, а
                доверието на клиентите е най-голямото признание за нейния успех.
              </p>
              <p className="bb-founder-lead">
                Като семеен бизнес Булгар Биотик гледа дългосрочно към развитието си – с фокус върху
                качество, иновации и човешки подход. Именно тази комбинация превръща бранда не просто в
                производител на пробиотици, а в компания с мисия да насърчава по-здравословен и осъзнат
                начин на живот.
              </p>
            </div>
          )}

          <div className="bb-founder-meta">
            <div className="bb-founder-av">МЗ</div>
            <div>
              <div className="bb-founder-name">Мариета Захариева</div>
              <div className="bb-founder-role">Управител · Bulgar Biotic ЕООД</div>
            </div>
            <button
              type="button"
              className="bb-founder-readmore"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
            >
              {expanded ? 'Скрий' : 'Прочети повече'}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
