import {Link} from 'react-router';
import type {ReactNode} from 'react';
import {SciencePageContent} from '~/components/pages/SciencePageContent';
import {BeautyPageContent} from '~/components/pages/BeautyPageContent';
import {NewsletterPageContent} from '~/components/pages/NewsletterPageContent';
import {EventsPageContent} from '~/components/pages/EventsPageContent';

/**
 * Content override map for CMS pages whose `body` field is null because they
 * were authored via CloudCart's visual Page Builder (which stores content in
 * `builderDesign` JSON — a field NOT exposed by the Storefront API).
 *
 * Each entry is hand-formatted JSX derived from the real Admin-API content
 * (audited 2026-05). When CloudCart later exposes builderDesign via Storefront,
 * this layer can be replaced with a dynamic renderer (see
 * BuilderDesignRenderer.tsx for the planned structure).
 *
 * To add a new override:
 *   1. Identify the page handle (e.g. /pages/my-page → 'my-page')
 *   2. Pull its content via Admin GraphQL: `page(id) { builderDesign }`
 *   3. Translate the structure into clean JSX below
 */

export const PAGES_CONTENT: Record<string, () => ReactNode> = {
  'naukata-zad-bulgar-biotic': () => <SciencePageContent />,
  'abomanmet-za-byuletin': () => <NewsletterPageContent />,
  'events': () => <EventsPageContent />,
  /**
   * "За нас" (client 2026-08-05): keep the opening paragraph exactly as the
   * merchant wrote it, drop the general wellness paragraph that followed, and
   * state what the portfolio actually is. The store photo at the end is the
   * same file the CMS page carries, so the page looks unchanged apart from
   * the text. Listed in PAGES_WITH_AUTHORED_BODY so this wins over the CMS
   * body — the page does return real HTML, unlike the builder-built ones.
   */
  'about-us': () => (
    <>
      <p>
        Bulgar Biotic Ви предлага пробиотици от ново поколение Bactology! Нашето производство
        се основава на стари български традиции и най-нови съвременни технологии. Нашият
        производствен екип се състои от водещи учени и технолози, които контролират всички
        процеси и следят за постигането на най-високо качество и безвредност на всички наши
        продукти.
      </p>
      <p>
        Продуктовото портфолио е изградено на базата на автентичния{' '}
        <strong>Lactobacillus bulgaricus</strong>, комбиниран с клинично утвърдени щамове от
        родовете Lactobacillus, Bifidobacterium и Streptococcus, както и пребиотици и
        биоактивни съставки с доказана физиологична роля.
      </p>
      <p>
        Формулите са разработени за различни възрастови групи и специфични потребности —
        гастроинтестинален баланс, имунна подкрепа, женско и детско здраве, орална микрофлора
        и микробиом-свързан стрес. Производството съчетава българската традиция в
        пробиотичните култури със съвременни технологии за лиофилизация, контрол на
        стабилността и гарантирана концентрация на жизнеспособни микроорганизми до края на
        срока на годност.
      </p>
      <p>
        Екип от учени и технолози осъществява микробиологичен контрол на всяка производствена
        партида, като компанията развива и образователни инициативи за повишаване на
        информираността относно ролята на микробиома в ежедневната медицинска практика.
      </p>
      <p>
        <img src="https://cdncloudcart.com/26194/files/image/about-us.jpg" alt="" loading="lazy" />
      </p>
    </>
  ),
  // ───── legacy long-form entry below kept for reference only ─────
  '_legacy_naukata-zad-bulgar-biotic': () => (
    <>
      <p className="text-lg leading-relaxed">
        <strong>Bulgar Biotic не е просто марка пробиотици.</strong> Това е ангажимент към наука,
        качество и българска традиция, създаден с грижа за дългосрочното здраве на всяко
        семейство.
      </p>

      <div className="grid sm:grid-cols-2 gap-5 not-prose my-8">
        <div className="bg-[var(--color-pink-1)] border border-[rgba(227,22,108,0.12)] rounded-2xl p-6">
          <div className="text-[11px] font-bold uppercase tracking-[1.4px] text-[var(--color-brand-pink)] mb-2">
            Традиция
          </div>
          <h3 className="text-lg font-bold text-[var(--color-ink)] mb-3">Българско наследство</h3>
          <p className="text-sm text-gray-700 leading-relaxed m-0">
            Lactobacillus bulgaricus — пробиотичният щам, открит през 1905 г. от <em>Стамен
            Григоров</em>, който се среща естествено в българската планина и е в основата на
            автентичното българско кисело мляко.
          </p>
        </div>
        <div className="bg-[var(--color-cream-2)] border border-[rgba(10,37,64,0.08)] rounded-2xl p-6">
          <div className="text-[11px] font-bold uppercase tracking-[1.4px] text-[var(--color-brand-pink)] mb-2">
            Наука
          </div>
          <h3 className="text-lg font-bold text-[var(--color-ink)] mb-3">Съвременен подход</h3>
          <p className="text-sm text-gray-700 leading-relaxed m-0">
            Прецизно подбрани щамове, контролирани производствени процеси и научно обосновани
            формули с фокус върху ефективност, безопасност и реални ползи за организма.
          </p>
        </div>
      </div>

      <h2>Два стълба на качеството</h2>

      <h3>Лабораторни анализи</h3>
      <p>
        Нашият екип от висококвалифицирани специалисти разполага с модерно оборудване и експертиза
        за детайлни <strong>микробиологични и биохимични изследвания</strong> — за ефективност,
        чистота и стабилност на пробиотичните продукти.
      </p>
      <p>
        Всички методи и изследвания се провеждат в съответствие с приложимите европейски
        регламенти, националното законодателство и международно признати стандарти. Така
        потвърждаваме декларираните характеристики и доказваме безопасността на всяка партида.
      </p>

      <h3>Производствен контрол</h3>
      <p>
        Всички процеси, хигиена и материали се следят по <strong>европейски стандарти</strong> и
        вътрешни протоколи за надеждност и безопасност. Нашите сертификати включват{' '}
        <strong>HACCP, GMP (Good Manufacturing Practice), ISO 9001</strong> и Made in EU.
      </p>

      <h2>Експертно мнение</h2>
      <blockquote>
        Червата не са просто орган за храносмилане — те са интелигентна система, която влияе върху
        имунитета, настроението и цялостното ни здраве. Когато подкрепяме полезните бактерии в
        червата, ние подпомагаме естествените механизми на тялото за защита, баланс и
        възстановяване.
      </blockquote>
      <p className="text-sm text-gray-600 -mt-3">
        — <em>Джулия Ендерс</em>, учен и автор на книгата <strong>"Черво с чар"</strong>
      </p>

      <p>
        Освен Джулия Ендерс, в нашия научен съвет участва и <strong>гастроентеролог и невролог
        с 35-годишен опит</strong> в изследването на клиничните и невробиологични аспекти на
        взаимодействието между храносмилателната и нервната система — оста{' '}
        <em>черва ↔ мозък</em>.
      </p>

      <div className="not-prose mt-10 p-8 bg-[var(--color-ink)] text-[var(--color-cream-1)] rounded-2xl text-center">
        <h3 className="text-2xl font-bold mb-3 text-white">Готов ли си да започнеш?</h3>
        <p className="text-sm opacity-85 mb-5 max-w-md mx-auto">
          25+ научно проучени формули, изградени върху <em>Lactobacillus bulgaricus</em>.
        </p>
        <Link
          to="/category/all-products"
          className="inline-flex items-center gap-2 bg-[var(--color-brand-pink)] text-white font-bold px-6 py-3 rounded-full no-underline hover:bg-white hover:text-[var(--color-ink)] hover:no-underline transition-all"
        >
          Виж всички продукти
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="size-3.5">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </div>
    </>
  ),

  'probiotik-za-bremenni': () => (
    <>
      {/* Product showcase (client: add a product photo + a selling vitrine at
          the top — this page must sell). */}
      <div className="not-prose mb-10 grid md:grid-cols-2 gap-6 md:gap-8 items-center bg-white border border-[var(--color-pink-2)] rounded-3xl p-5 md:p-7 shadow-[0_18px_50px_-24px_rgba(10,37,64,0.25)]">
        <div className="rounded-2xl overflow-hidden bg-[var(--color-cream-1)]">
          <img
            src="/images/generated-v2/p-bremenni.png"
            alt="Bactology Пакет Бременност"
            className="w-full aspect-square object-cover"
            loading="eager"
          />
        </div>
        <div>
          <span className="inline-block text-[11px] font-bold uppercase tracking-[1.4px] text-[var(--color-brand-pink)] mb-2">
            Специална грижа за бъдещи майки
          </span>
          <h2 className="!mt-0 !mb-3 text-2xl md:text-[28px] font-extrabold text-[var(--color-ink)] leading-tight">
            Пакет Бременност
          </h2>
          <p className="!my-0 text-[15px] leading-relaxed text-[color:rgba(10,37,64,0.72)]">
            Три формули в едно — <strong>Femin</strong>, <strong>Gastro Balance</strong> и{' '}
            <strong>Beauty Hair &amp; Nails</strong> — за спокойна и здрава бременност.
          </p>
          <ul className="!mt-4 !mb-0 flex flex-col gap-2 list-none !p-0">
            {[
              'Здрава вагинална микрофлора и pH баланс',
              'Регулирано храносмилане, без лаксативи',
              'Красива коса и здрави нокти',
            ].map((b) => (
              <li key={b} className="flex items-center gap-2.5 !my-0 text-[14px] font-medium text-[var(--color-ink)]">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--color-brand-pink)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {b}
              </li>
            ))}
          </ul>
          <Link
            to="/product/probiotik-za-bremenni-paket"
            style={{color: '#fff'}}
            className="!mt-6 inline-flex items-center gap-2 bg-[var(--color-brand-pink)] font-bold px-7 py-3.5 rounded-full no-underline hover:bg-[#c20d59] hover:no-underline transition-all"
          >
            Купи Пакет Бременност
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="size-3.5">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
      </div>

      <p className="text-lg leading-relaxed">
        В <strong>Пакет Бременност</strong> обединихме сили с природата, за да ти предложим
        безопасна и ефективна подкрепа в този прекрасен, но изпълнен с предизвикателства период.
      </p>
      <p>
        Здравето и благополучието на всяка майка са на първо място, и заслужаваш да преживееш
        бременността си в пълна <em>хармония и спокойствие</em>.
      </p>

      <h2>Bactology Femin — здраве на вагиналната микрофлора</h2>
      <p>
        Поддържането на здравословна вагинална микрофлора и правилно <strong>pH (киселинност)</strong>{' '}
        по време на бременността е критично — не само за здравето на майката, но и за предаването
        на полезни микроорганизми към бебето и формирането на неговия микробиом.
      </p>
      <h4>Действие:</h4>
      <ul>
        <li>Предотвратява развитието на гъбички и вагинални инфекции</li>
        <li>Минимизира риска от инфекции и последваща нужда от антибиотици</li>
        <li>Регулира хормоналните нива в организма</li>
        <li>Спомага за запазването на здравословната микрофлора</li>
        <li>Детоксикира и изчиства от излишни течности</li>
      </ul>
      <p>
        <strong>Прием:</strong> 1 капсула Femin на ден — сутрин, след храна.
      </p>

      <h2>Bactology Gastro Balance — храносмилателно здраве</h2>
      <p>
        Много дами по време на бременността си се сблъскват с неприятните симптоми на{' '}
        <strong>запек</strong>. Това състояние не е никак безобидно — освен че причинява
        дискомфорт, задържането на токсини в организма е вредно както за майката, така и за бебето.
      </p>
      <p>
        По време на бременност не могат да се приемат почти никакви лекарства или лаксативи.
        Най-доброто решение е дамите да се доверят на естествени пробиотични формули, които
        регулират храносмилането без странични ефекти.
      </p>
      <p>
        <strong>Прием:</strong> 1 капсула Gastro Balance вечер, след последното хранене.
      </p>

      <h2>Bactology Beauty Hair &amp; Nails — за красотата на майката</h2>
      <p>
        По време на бременността тялото на жената се променя забележимо — и понякога косата и
        ноктите страдат заради хормоналните промени и повишените нужди от витамини.
      </p>
      <h4>Действие:</h4>
      <ul>
        <li>Укрепва косата и ноктите</li>
        <li>Осигурява антиоксидантна защита</li>
        <li>Подпомага енергийните нива</li>
        <li>Подкрепя имунитета</li>
        <li>Подобрява самочувствието</li>
      </ul>
      <p>
        <strong>Прием:</strong> 1 капсула Beauty Hair Nails сутрин, след храна.
      </p>

      <div className="not-prose my-10 p-7 bg-[var(--color-pink-1)] rounded-2xl">
        <div className="text-[11px] font-bold uppercase tracking-[1.4px] text-[var(--color-brand-pink)] mb-3">
          Дневна програма
        </div>
        <h3 className="text-xl font-bold text-[var(--color-ink)] mb-4">
          Прием на пробиотици от Пакет Бременност
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-4">
            <div className="text-xs font-bold text-[var(--color-brand-pink)] tracking-wider uppercase mb-2">
              ☀ Сутрин · след хранене
            </div>
            <div className="font-semibold text-[var(--color-ink)]">1× Femin</div>
            <div className="font-semibold text-[var(--color-ink)]">1× Beauty Hair Nails</div>
          </div>
          <div className="bg-white rounded-xl p-4">
            <div className="text-xs font-bold text-[var(--color-brand-pink)] tracking-wider uppercase mb-2">
              🌙 Вечер · след последно ядене
            </div>
            <div className="font-semibold text-[var(--color-ink)]">1× Gastro Balance</div>
          </div>
        </div>
      </div>

      <div className="not-prose text-center mt-10">
        <Link
          to="/product/probiotik-za-bremenni-paket"
          style={{color: 'var(--color-cream-1)'}}
          className="inline-flex items-center gap-2 bg-[var(--color-ink)] font-bold px-7 py-3.5 rounded-full no-underline hover:bg-[var(--color-brand-pink)] hover:no-underline transition-all"
        >
          Купи Пакет Бременност
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="size-3.5">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </div>
    </>
  ),

  'kosa-koja-i-nokti': () => <BeautyPageContent />,
  // ───── legacy long-form entry below kept for reference only ─────
  '_legacy_kosa-koja-i-nokti': () => (
    <>
      <p className="text-lg leading-relaxed">
        Сияйна красота отвътре навън. Bactology Beauty линията е създадена с грижа за{' '}
        <strong>косата, кожата и ноктите</strong> — защото истинският блясък идва от баланса в тялото.
      </p>

      <h2>Активна формула за здрава и блестяща коса и нокти</h2>
      <p>
        Комплексът от витамини и микроелементи стимулира клетките на епидермиса и съдейства за
        подобряване на външния вид на косата, ноктите и кожата.
      </p>
      <h4>Активни съставки:</h4>
      <ul>
        <li><strong>Биотин</strong> (Витамин B7)</li>
        <li><strong>Витамини A, C, E, D3</strong> + B-комплекс</li>
        <li><strong>Желязо</strong> — за здрав корен на косата</li>
        <li><strong>Силиций</strong> — за здрави нокти</li>
      </ul>
      <h4>Кога да го приемаш:</h4>
      <ul>
        <li><strong>Профилактично:</strong> за укрепване и подхранване на косата и ноктите; за предотвратяване на косопад и оплешивяване</li>
        <li><strong>Като съпътстващо лечение:</strong> ако косата ти е загубила своята еластичност и блясък, ако ноктите ти лесно се чупят, ако страдаш от косопад</li>
      </ul>

      <h2>Активна формула за сияйна и еластична кожа без бръчки</h2>
      <p>
        Bactology съчетава синергичното действие на няколко съставки, специално подбрани за
        запазване на младежкия вид на кожата.
      </p>
      <h4>Активни съставки:</h4>
      <ul>
        <li><strong>Витамини A, C, E, D</strong></li>
        <li><strong>Колаген</strong> и <strong>хиалуронова киселина</strong></li>
        <li><strong>Биотин</strong></li>
        <li><strong>Коензим Q10</strong></li>
      </ul>
      <h4>Кога да го приемаш:</h4>
      <ul>
        <li><strong>Профилактично:</strong> за запазване на младежкия вид на кожата и забавяне на стареенето; за поддържане на еластична, гладка и сияйна кожа; за предотвратяване на появата на целулит и стрии</li>
        <li><strong>Като съпътстващо лечение:</strong> ако имаш нараняване, изгаряне или ухапване; ако страдаш от кожни проблеми и раздразнения</li>
      </ul>

      <div className="not-prose grid sm:grid-cols-2 gap-4 my-10">
        <Link
          to="/product/aktivna-formula-za-zdrava-i-blestyashta-kosa-i-nokti-bactology"
          className="block bg-[var(--color-pink-1)] border border-[rgba(227,22,108,0.18)] rounded-2xl p-6 no-underline hover:bg-white hover:border-[var(--color-brand-pink)] hover:no-underline transition-all"
        >
          <div className="text-[11px] font-bold uppercase tracking-[1.4px] text-[var(--color-brand-pink)] mb-2">
            Beauty · Hair &amp; Nails
          </div>
          <div className="text-lg font-bold text-[var(--color-ink)] mb-1">Здрава и блестяща коса</div>
          <div className="text-sm text-gray-600">Биотин + витамини A/C/E/D3 + желязо + силиций</div>
          <div className="text-sm font-bold text-[var(--color-brand-pink)] mt-3">Купи сега →</div>
        </Link>
        <Link
          to="/product/aktivna-formula-za-siyayna-i-elastichna-koja-bez-brachki-bactology"
          className="block bg-[var(--color-cream-2)] border border-[rgba(10,37,64,0.08)] rounded-2xl p-6 no-underline hover:bg-white hover:border-[var(--color-brand-pink)] hover:no-underline transition-all"
        >
          <div className="text-[11px] font-bold uppercase tracking-[1.4px] text-[var(--color-brand-pink)] mb-2">
            Beauty · Skin
          </div>
          <div className="text-lg font-bold text-[var(--color-ink)] mb-1">Сияйна и еластична кожа</div>
          <div className="text-sm text-gray-600">Колаген + хиалуронова киселина + Q10 + витамини A/C/E/D</div>
          <div className="text-sm font-bold text-[var(--color-brand-pink)] mt-3">Купи сега →</div>
        </Link>
      </div>

      <p className="text-center text-sm text-gray-600">
        Висококачествени продукти за <strong>красота и здраве</strong>. Възползвай се сега и
        закупи продукти за кожа, коса и нокти.
      </p>
    </>
  ),

  'probiotik-ot-bactology': () => (
    <>
      <p className="text-lg leading-relaxed">
        <strong>Устремени към повишаване качеството на живот</strong>, ние сме тук, за да те
        вдъхновим! Екипът ни е съставен от хора, обединени от обща страст — <em>пълноценно
        здраве</em>.
      </p>
      <p>
        Влагайки в работата си много любов, енергия и лично отношение, успяхме да създадем{' '}
        <strong>щастието отвътре навън</strong>. За да ти предложим висококачествените пробиотици
        Bactology, ние съчетаваме дълбоките традиции за извличане на най-ценните за здравето
        природни съставки с най-съвременните технологии за производство.
      </p>
      <p>
        Всичко това се случва с помощта на водещи учени и технолози, провеждащи постоянни
        интензивни научни иновационни изследвания. Нашата цел е да утвърдим още един по-хубав път
        към себе си — <em>красиво, здраво, хармонично, балансирано тяло</em>.
      </p>

      <h2>Наука в основата на всеки Bactology продукт</h2>
      <p>
        Част от продуктите от линията Bactology са разработени с фокус върху{' '}
        <strong>Lactobacillus bulgaricus</strong> — добре познат пробиотичен щам с български
        произход, обект на научни изследвания от края на XIX и началото на XX век.
      </p>
      <p>
        В зависимост от конкретната формула, продуктите комбинират различни{' '}
        <strong>клинично изследвани пробиотични щамове</strong>, подбрани така, че да действат
        синергично и да подпомагат специфичните нужди на организма.
      </p>

      <h2>Bactology Gastro Balance</h2>
      <p>
        Пробиотична формула с висока концентрация от <strong>50 милиарда активни бактерии</strong>,
        създадена да подпомогне храносмилателната система и да възстанови баланса на чревната
        микрофлора.
      </p>

      <h2>Често задавани въпроси</h2>

      <details className="border border-gray-200 rounded-xl p-4 transition-colors hover:border-gray-300 open:border-gray-300 bg-white not-prose mb-3">
        <summary className="cursor-pointer list-none flex justify-between font-semibold text-[var(--color-ink)]">
          За колко време се виждат резултати?
          <span className="text-gray-400">▾</span>
        </summary>
        <div className="mt-3 text-sm text-gray-700 leading-relaxed">
          За остри оплаквания — 2 до 3 месеца. За поддръжка на имунната система специалистите
          съветват 2-3 курса годишно.
        </div>
      </details>

      <details className="border border-gray-200 rounded-xl p-4 transition-colors hover:border-gray-300 open:border-gray-300 bg-white not-prose mb-3">
        <summary className="cursor-pointer list-none flex justify-between font-semibold text-[var(--color-ink)]">
          Може ли пробиотик с антибиотик?
          <span className="text-gray-400">▾</span>
        </summary>
        <div className="mt-3 text-sm text-gray-700 leading-relaxed">
          Да. Приемай пробиотика <strong>2 часа след</strong> антибиотика и продължи курса още{' '}
          7-14 дни след края на лечението, за да възстановиш чревната флора.
        </div>
      </details>

      <details className="border border-gray-200 rounded-xl p-4 transition-colors hover:border-gray-300 open:border-gray-300 bg-white not-prose mb-3">
        <summary className="cursor-pointer list-none flex justify-between font-semibold text-[var(--color-ink)]">
          Има ли странични ефекти?
          <span className="text-gray-400">▾</span>
        </summary>
        <div className="mt-3 text-sm text-gray-700 leading-relaxed">
          Пробиотичните продукти Bactology са натурални и подходящи за дълъг прием. В{' '}
          <strong>първите 2-3 дни</strong> е възможно леко подуване, докато микрофлората се
          адаптира — това е нормално влияние и преминава бързо.
        </div>
      </details>
    </>
  ),

  'chesto-zadavani-vaprosi': () => (
    <>
      <p className="text-lg leading-relaxed">
        Събрахме най-често задаваните въпроси за пробиотиците Bactology. Ако не намериш отговор —{' '}
        <a href="mailto:bulgarbiotic.eu@gmail.com">пиши ни на bulgarbiotic.eu@gmail.com</a>.
      </p>

      <h2>Прием и дозировка</h2>

      {[
        {
          q: 'Кога да приемам пробиотика?',
          a: 'Препоръчваме сутрин с първото хранене за оптимално усвояване. При остри оплаквания — 1 капсула сутрин и 1 вечер. Винаги с чаша вода.',
        },
        {
          q: 'За колко време ще видя резултати?',
          a: 'За остри оплаквания — 2 до 3 месеца устойчив прием. За поддръжка на имунната система специалистите съветват 2-3 курса годишно. Минимум 4 седмици за първи видим ефект.',
        },
        {
          q: 'Може ли пробиотик с антибиотик?',
          a: 'Да. Приемай пробиотика 2 часа след антибиотика и продължи курса още 7-14 дни след края на лечението, за да възстановиш чревната флора.',
        },
      ].map((item, i) => (
        <details key={i} className="border border-gray-200 rounded-xl p-4 hover:border-gray-300 bg-white not-prose mb-3">
          <summary className="cursor-pointer list-none flex justify-between font-semibold text-[var(--color-ink)]">
            {item.q}
            <span className="text-gray-400">▾</span>
          </summary>
          <div className="mt-3 text-sm text-gray-700 leading-relaxed">{item.a}</div>
        </details>
      ))}

      <h2>Безопасност и съхранение</h2>

      {[
        {
          q: 'Има ли странични ефекти?',
          a: 'Пробиотичните продукти Bactology са натурални и подходящи за дълъг прием. В първите 2-3 дни е възможно леко подуване, докато микрофлората се адаптира — нормално и преминава бързо.',
        },
        {
          q: 'Безопасно ли е при бременност и кърмене?',
          a: 'Имаме специален Пакет Бременност с щамове, тествани и одобрени за този период. За другите формули — препоръчваме консултация с гинеколог преди прием.',
        },
        {
          q: 'Как се съхранява?',
          a: 'На сухо и хладно място, под 25°C. Не е необходимо да се пази в хладилник — нашите щамове са стабилни при стайна температура.',
        },
        {
          q: 'Подходящ ли е при непоносимост към лактоза?',
          a: 'Формулите ни не съдържат лактоза, глутен или соя. Идеален избор за хора с хранителни чувствителности. Капсулите ни са изцяло растителни (DR-Caps™).',
        },
      ].map((item, i) => (
        <details key={i} className="border border-gray-200 rounded-xl p-4 hover:border-gray-300 bg-white not-prose mb-3">
          <summary className="cursor-pointer list-none flex justify-between font-semibold text-[var(--color-ink)]">
            {item.q}
            <span className="text-gray-400">▾</span>
          </summary>
          <div className="mt-3 text-sm text-gray-700 leading-relaxed">{item.a}</div>
        </details>
      ))}

      <h2>Доставка и поръчки</h2>

      {[
        {
          q: 'Колко струва доставката?',
          a: 'Безплатна доставка при поръчка над 50 €. За поръчки под 50 € — куриерска такса 3,06 €.',
        },
        {
          q: 'След колко време пристига поръчката?',
          a: '24-48 часа за цяла България чрез Еконт или Спиди. Поръчай до 14:00 — изпращаме същия ден. Възможно е плащане при доставка (наложен платеж).',
        },
        {
          q: 'Мога ли да върна продукт?',
          a: '30 дни без въпроси. Ако продуктът не отговаря на очакванията ти — върни го и получаваш парите си обратно.',
        },
      ].map((item, i) => (
        <details key={i} className="border border-gray-200 rounded-xl p-4 hover:border-gray-300 bg-white not-prose mb-3">
          <summary className="cursor-pointer list-none flex justify-between font-semibold text-[var(--color-ink)]">
            {item.q}
            <span className="text-gray-400">▾</span>
          </summary>
          <div className="mt-3 text-sm text-gray-700 leading-relaxed">{item.a}</div>
        </details>
      ))}

      <div className="not-prose mt-10 p-7 bg-[var(--color-cream-2)] rounded-2xl text-center">
        <h3 className="text-lg font-bold text-[var(--color-ink)] mb-2">Все още имаш въпроси?</h3>
        <p className="text-sm text-gray-700 mb-5">
          Свържи се с нас на работно време <strong>09:00 — 18:00 ч.</strong>
        </p>
        <a
          href="mailto:bulgarbiotic.eu@gmail.com"
          className="inline-flex items-center gap-2 bg-[var(--color-ink)] text-[var(--color-cream-1)] font-bold px-6 py-3 rounded-full no-underline hover:bg-[var(--color-brand-pink)] hover:text-white hover:no-underline transition-all"
        >
          ✉ bulgarbiotic.eu@gmail.com
        </a>
      </div>
    </>
  ),
};

/** Look up a page handle in the override map. Returns null if no override exists. */
export function getPageContentOverride(handle: string): (() => ReactNode) | null {
  return PAGES_CONTENT[handle] ?? null;
}

/** Pages that have custom routes/layouts and should bypass the override fallback. */
export const PAGES_WITH_CUSTOM_LAYOUT = new Set(['pateshestvie', 'mediite-za-nas']);

/**
 * Pages whose JSX override must win even though the CMS returns real HTML.
 * The normal rule is "CMS body first, override only as a fallback", which is
 * right for pages nobody has rewritten — but here the client asked for exact
 * wording, so the code owns the copy.
 */
export const PAGES_WITH_AUTHORED_BODY = new Set(['about-us', 'events']);
