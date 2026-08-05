import {useEffect} from 'react';

/**
 * "Събития и активности" — the page the client delivered as one self-contained
 * HTML file (2026-08-05). Kept as authored markup rather than rewritten into
 * JSX: it is editorial content, it changes as a whole when a new event is
 * added, and hand-converting 12 KB of markup would only invite typos.
 *
 * Two things were changed on the way in:
 *   • the eight photos arrived as base64 data URIs, which made the file 2.2 MB.
 *     They are now real files under /images/events/ so the browser caches them
 *     and the page itself weighs a few KB.
 *   • the reveal-on-scroll snippet shipped as an inline <script>, which React
 *     will not execute inside dangerouslySetInnerHTML. It lives in the effect
 *     below instead, with the same behaviour and a clean teardown.
 *
 * All CSS is namespaced under .bb-events by the author, so nothing here can
 * reach the rest of the site.
 */

const EVENTS_HTML = `<div class="bb-events">

  <!-- HERO -->
  <section class="bb-hero">
    <p class="bb-hero-kicker">Bactology &amp; Bulgar Biotic</p>
    <h1>Събития и <em>активности</em></h1>
    <p>Изложения, фестивали и срещи на живо — където разказваме за микробиома,
       показваме продуктите си и се запознаваме лично с хората, за които ги правим.</p>
  </section>

  <!-- DIVIDER -->
  <div class="bb-section">
    <div class="bb-divider"><div class="bb-divider-line"></div><span class="bb-divider-mark">Юни 2026</span><div class="bb-divider-line"></div></div>
  </div>

  <!-- EVENT 01 (newest) -->
  <section class="bb-section">
    <div class="bb-event">
      <div class="bb-event-media">
        <span class="bb-tape">Юни 2026</span>
        <div class="bb-frame">
          <img src="/images/events/event-01-35b73837d6.jpg" alt="Bactology и Furisto в Южен парк">
          <span class="bb-frame-caption">Южен парк, София</span>
        </div>
      </div>
      <div class="bb-event-body">
        <p class="bb-eyebrow">Семеен ден · Южен парк, София</p>
        <div class="bb-event-number">01 / 08</div>
        <h2>Bactology и <em>Furisto</em> в Южен парк</h2>
        <p>През юни 2026 г. Bactology и Furisto организираха специален семеен ден в
           Южен парк – София. Малките посетители се превърнаха в изследователи на
           микробиома, участваха в забавни лекарски занимания и научиха повече за
           грижата за здравето чрез игри. Благодарим на всички семейства, които
           споделиха този слънчев и усмихнат ден с нас!</p>
        <div class="bb-event-tags">
          <span>Изследователи на микробиома</span>
          <span class="bb-tag-teal">Семеен ден</span>
        </div>
      </div>
    </div>
  </section>

  <!-- DIVIDER -->
  <div class="bb-section">
    <div class="bb-divider"><div class="bb-divider-line"></div><span class="bb-divider-mark">Май 2026</span><div class="bb-divider-line"></div></div>
  </div>

  <!-- EVENT 02 -->
  <section class="bb-section">
    <div class="bb-event bb-reverse">
      <div class="bb-event-media">
        <span class="bb-tape">28–31 май</span>
        <div class="bb-frame">
          <img src="/images/events/event-02-8555c771d3.jpg" alt="Bactology на Шестата научна конференция">
          <span class="bb-frame-caption">Астория Гранд Хотел, София</span>
        </div>
      </div>
      <div class="bb-event-body">
        <p class="bb-eyebrow">Научна конференция · Астория Гранд Хотел, София</p>
        <div class="bb-event-number">02 / 08</div>
        <h2>Bactology на <em>Шестата научна конференция</em></h2>
        <p>През май 2026 г. Bactology участва със собствен щанд в Шестата научна
           конференция „Хронични заболявания, имунитет, възпаление и ваксини“ в
           Астория Гранд Хотел – София. По време на събитието се срещнахме с лекари,
           специалисти и студенти и представихме нашия научно обоснован подход към
           грижата за микробиома и имунитета. Благодарим на всички, които посетиха
           щанда ни и обмениха знания и опит с нашия екип!</p>
        <div class="bb-event-tags">
          <span>Имунитет</span>
          <span class="bb-tag-teal">Научна общност</span>
        </div>
      </div>
    </div>
  </section>

  <!-- DIVIDER -->
  <div class="bb-section">
    <div class="bb-divider"><div class="bb-divider-line"></div><span class="bb-divider-mark">Май 2026</span><div class="bb-divider-line"></div></div>
  </div>

  <!-- EVENT 03 -->
  <section class="bb-section">
    <div class="bb-event">
      <div class="bb-event-media">
        <span class="bb-tape">13–15 май</span>
        <div class="bb-frame">
          <img src="/images/events/event-03-1df856d0ba.jpg" alt="Bactology на БУЛМЕДИКА 2026">
          <span class="bb-frame-caption">Интер Експо Център, София</span>
        </div>
      </div>
      <div class="bb-event-body">
        <p class="bb-eyebrow">Международно изложение · Интер Експо Център</p>
        <div class="bb-event-number">03 / 08</div>
        <h2>Bactology на <em>БУЛМЕДИКА 2026</em></h2>
        <p>През май 2026 г. Bactology участва със собствен щанд на международното
           изложение БУЛМЕДИКА в Интер Експо Център – София. Представихме нашите
           пробиотични продукти и научно обоснован подход към грижата за микробиома,
           като обменихме опит и идеи с медицински специалисти и партньори от сектора.
           Благодарим на всички професионалисти, които посетиха щанда ни и проявиха
           интерес към решенията на Bactology!</p>
        <div class="bb-event-tags">
          <span>Научен подход</span>
          <span class="bb-tag-teal">Медицински специалисти</span>
        </div>
      </div>
    </div>
  </section>

  <!-- DIVIDER -->
  <div class="bb-section">
    <div class="bb-divider"><div class="bb-divider-line"></div><span class="bb-divider-mark">Април 2026</span><div class="bb-divider-line"></div></div>
  </div>

  <!-- EVENT 04 -->
  <section class="bb-section">
    <div class="bb-event bb-reverse">
      <div class="bb-event-media">
        <span class="bb-tape">25–26 април</span>
        <div class="bb-frame">
          <img src="/images/events/event-04-9c132dce73.jpg" alt="Bactology на Голямото изложение за малки мечтатели">
          <span class="bb-frame-caption">Семейно изложение</span>
        </div>
      </div>
      <div class="bb-event-body">
        <p class="bb-eyebrow">Семейно изложение</p>
        <div class="bb-event-number">04 / 08</div>
        <h2>Bactology на <em>„Голямото изложение за малки мечтатели“</em></h2>
        <p>През април 2026 г. Bactology участва със собствен щанд в „Голямото изложение
           за малки мечтатели“. Срещнахме се с много семейства, представихме нашите
           продукти за детското коремче и имунитета и отговорихме на въпроси, свързани
           с ежедневната грижа за децата. Благодарим на всички малки и големи посетители,
           които споделиха този усмихнат уикенд с нас!</p>
        <div class="bb-event-tags">
          <span>Детско коремче</span>
          <span class="bb-tag-teal">Имунитет</span>
        </div>
      </div>
    </div>
  </section>

  <!-- DIVIDER -->
  <div class="bb-section">
    <div class="bb-divider"><div class="bb-divider-line"></div><span class="bb-divider-mark">Април 2026</span><div class="bb-divider-line"></div></div>
  </div>

  <!-- EVENT 05 -->
  <section class="bb-section">
    <div class="bb-event">
      <div class="bb-event-media">
        <span class="bb-tape">24–26 април</span>
        <div class="bb-frame">
          <img src="/images/events/event-05-6a0cc26330.jpg" alt="Bactology на Arena of Beauty 2026">
          <span class="bb-frame-caption">Интер Експо Център, София</span>
        </div>
      </div>
      <div class="bb-event-body">
        <p class="bb-eyebrow">Изложение · Интер Експо Център</p>
        <div class="bb-event-number">05 / 08</div>
        <h2>Bactology на <em>Arena of Beauty 2026</em></h2>
        <p>През април 2026 г. Bactology участва със собствен щанд на Arena of Beauty в
           Интер Експо Център – София. Представихме нашите решения за красота и баланс
           отвътре, запознахме посетителите с продуктите ни и обменихме опит с
           професионалисти от бюти сектора. Благодарим на всички, които се срещнаха с
           нашия екип и проявиха интерес към Bactology!</p>
        <div class="bb-event-tags">
          <span>Красота отвътре</span>
          <span class="bb-tag-teal">Бюти сектор</span>
        </div>
      </div>
    </div>
  </section>

  <!-- DIVIDER -->
  <div class="bb-section">
    <div class="bb-divider"><div class="bb-divider-line"></div><span class="bb-divider-mark">Декември 2025</span><div class="bb-divider-line"></div></div>
  </div>

  <!-- EVENT 06 -->
  <section class="bb-section">
    <div class="bb-event bb-reverse">
      <div class="bb-event-media">
        <span class="bb-tape">12–14 декември</span>
        <div class="bb-frame">
          <img src="/images/events/event-06-26c7b7f229.jpg" alt="Bactology на Mish Mash Fest – Christmas Edition">
          <span class="bb-frame-caption">Ларгото, София</span>
        </div>
      </div>
      <div class="bb-event-body">
        <p class="bb-eyebrow">Фестивал · Ларгото, София</p>
        <div class="bb-event-number">06 / 08</div>
        <h2>Bactology на <em>Mish Mash Fest</em> – Christmas Edition</h2>
        <p>През декември Bactology беше част от коледното издание на Mish Mash Fest на
           Ларгото. На нашия щанд представихме подбрани продукти и празнични предложения,
           споделихме идеи за полезни подаръци и се срещнахме с много посетители в уютната
           атмосфера на фестивала. Благодарим на всички, които се отбиха при нас и споделиха
           празничното настроение с екипа на Bactology!</p>
        <div class="bb-event-tags">
          <span>Празнични подаръци</span>
          <span class="bb-tag-teal">Коледно настроение</span>
        </div>
      </div>
    </div>
  </section>

  <!-- DIVIDER -->
  <div class="bb-section">
    <div class="bb-divider"><div class="bb-divider-line"></div><span class="bb-divider-mark">Ноември 2025</span><div class="bb-divider-line"></div></div>
  </div>

  <!-- EVENT 07 -->
  <section class="bb-section">
    <div class="bb-event">
      <div class="bb-event-media">
        <span class="bb-tape">12–15 ноември</span>
        <div class="bb-frame">
          <img src="/images/events/event-07-9f138943c8.jpg" alt="Bulgar Biotic на Interfood & Drink 2025">
          <span class="bb-frame-caption">Интер Експо Център, София</span>
        </div>
      </div>
      <div class="bb-event-body">
        <p class="bb-eyebrow">23-то издание · Пътят на млякото</p>
        <div class="bb-event-number">07 / 08</div>
        <h2>Bulgar Biotic на <em>„Interfood &amp; Drink 2025“</em></h2>
        <p>През ноември 2025 г. Bulgar Biotic участва със собствен щанд в 23-тото издание
           на изложението „Пътят на млякото“ в Интер Експо Център – София. По време на
           събитието представихме нашите продукти и решения за подкрепа на чревния баланс
           и имахме възможност да разговаряме както със специалисти от сектора, така и с
           множество посетители. Благодарим на всички, които се срещнаха с нашия екип и
           проявиха интерес към Bulgar Biotic!</p>
        <div class="bb-event-tags">
          <span>Чревен баланс</span>
          <span class="bb-tag-teal">Срещи със специалисти</span>
        </div>
      </div>
    </div>
  </section>

  <!-- DIVIDER -->
  <div class="bb-section">
    <div class="bb-divider"><div class="bb-divider-line"></div><span class="bb-divider-mark">Октомври 2025</span><div class="bb-divider-line"></div></div>
  </div>

  <!-- EVENT 08 (oldest) -->
  <section class="bb-section">
    <div class="bb-event bb-reverse">
      <div class="bb-event-media">
        <span class="bb-tape">24–26 октомври</span>
        <div class="bb-frame">
          <img src="/images/events/event-08-b13dbed574.jpg" alt="Bulgar Biotic на Бебемания 2025">
          <span class="bb-frame-caption">Интер Експо Център, София</span>
        </div>
      </div>
      <div class="bb-event-body">
        <p class="bb-eyebrow">Изложение · Интер Експо Център</p>
        <div class="bb-event-number">08 / 08</div>
        <h2>Bulgar Biotic на <em>„Бебемания 2025“</em></h2>
        <p>През октомври 2025 г. Bulgar Biotic взе участие със собствен щанд в изложението
           „Бебемания“ в Интер Експо Център. Представихме нашите пробиотични решения за
           бебета, деца и родители, споделихме полезна информация и се срещнахме лично с
           бъдещи и настоящи родители. Благодарим на всички, които посетиха щанда ни и
           станаха част от събитието!</p>
        <div class="bb-event-tags">
          <span>Пробиотици за бебета</span>
          <span class="bb-tag-teal">Съвети за родители</span>
        </div>
      </div>
    </div>
  </section>

  <!-- CLOSING -->
  <div class="bb-closing">
    <h3>Ще се <em>видим</em> и на следващото събитие</h3>
    <p>Следвайте ни, за да разберете къде ще бъде щандът на Bactology и Bulgar Biotic
       следващия път — очакват ви нови продукти, съвети и специални предложения на живо.</p>
  </div>

</div>`;

const EVENTS_CSS = `/* ===== Scoped namespace: .bb-events ===== */
  .bb-events {
    --bb-navy: #0A2540;
    --bb-navy-soft: #143355;
    --bb-cream: #FAF6F0;
    --bb-pink: #E31C79;
    --bb-pink-soft: #FBE4EF;
    --bb-teal: #1FA5A8;
    --bb-teal-soft: #E3F4F3;
    --bb-gray: #6B7385;
    --bb-line: rgba(10,37,64,0.10);

    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: var(--bb-cream);
    color: var(--bb-navy);
    box-sizing: border-box;
    overflow-x: hidden;
  }
  .bb-events *, .bb-events *::before, .bb-events *::after { box-sizing: inherit; }

  @font-face {
    font-family: 'BBDisplay';
    src: local('Fraunces'), local('Georgia');
  }

  .bb-events .bb-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    font-weight: 700;
    color: var(--bb-pink);
    margin-bottom: 18px;
  }
  .bb-events .bb-eyebrow::before {
    content: "";
    width: 22px;
    height: 1px;
    background: var(--bb-pink);
    display: inline-block;
  }

  /* ---------- HERO ---------- */
  .bb-events .bb-hero {
    position: relative;
    padding: 90px 24px 60px;
    text-align: center;
    background:
      radial-gradient(ellipse 60% 50% at 15% 0%, var(--bb-pink-soft) 0%, transparent 60%),
      radial-gradient(ellipse 55% 45% at 90% 15%, var(--bb-teal-soft) 0%, transparent 60%),
      var(--bb-cream);
    overflow: hidden;
  }
  .bb-events .bb-hero-kicker {
    font-family: 'BBDisplay', Georgia, 'Times New Roman', serif;
    font-style: italic;
    font-size: 15px;
    color: var(--bb-teal);
    margin: 0 0 14px;
    letter-spacing: 0.02em;
  }
  .bb-events .bb-hero h1 {
    font-family: 'BBDisplay', Georgia, 'Times New Roman', serif;
    font-weight: 600;
    font-size: clamp(38px, 6.4vw, 68px);
    line-height: 1.06;
    margin: 0 0 22px;
    letter-spacing: -0.01em;
  }
  .bb-events .bb-hero h1 em {
    font-style: italic;
    color: var(--bb-pink);
  }
  .bb-events .bb-hero p {
    max-width: 560px;
    margin: 0 auto;
    font-size: 17px;
    line-height: 1.65;
    color: var(--bb-gray);
  }

  /* ---------- SECTION SHELL ---------- */
  .bb-events .bb-section {
    position: relative;
    padding: 30px 24px 30px;
  }
  .bb-events .bb-divider {
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 46px 0;
    opacity: 0;
    transform: translateY(24px);
    transition: opacity 0.8s cubic-bezier(.2,.8,.2,1), transform 0.8s cubic-bezier(.2,.8,.2,1);
  }
  .bb-events .bb-divider.bb-in-view { opacity: 1; transform: translateY(0); }
  .bb-events .bb-divider-line {
    flex: 1;
    height: 1px;
    background: var(--bb-line);
    transform: scaleX(0);
    transform-origin: center;
    transition: transform 1s cubic-bezier(.2,.8,.2,1) 0.15s;
  }
  .bb-events .bb-divider.bb-in-view .bb-divider-line { transform: scaleX(1); }
  .bb-events .bb-divider-mark {
    font-family: 'BBDisplay', Georgia, serif;
    font-style: italic;
    font-size: 13px;
    color: var(--bb-teal);
    white-space: nowrap;
  }

  .bb-events .bb-event {
    max-width: 1100px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 56px;
    align-items: center;
  }
  .bb-events .bb-event.bb-reverse { direction: rtl; }
  .bb-events .bb-event.bb-reverse > * { direction: ltr; }

  .bb-events .bb-event-media {
    position: relative;
    opacity: 0;
    filter: blur(6px);
    transform: translateY(50px) scale(0.92);
    transition: opacity 1s cubic-bezier(.16,.8,.2,1), transform 1s cubic-bezier(.16,.8,.2,1), filter 1s ease;
  }
  .bb-events .bb-event.bb-reverse .bb-event-media {
    transform: translateX(40px) translateY(30px) scale(0.92);
  }
  .bb-events .bb-event:not(.bb-reverse) .bb-event-media {
    transform: translateX(-40px) translateY(30px) scale(0.92);
  }
  .bb-events .bb-event-media.bb-in-view {
    opacity: 1;
    filter: blur(0);
    transform: translateX(0) translateY(0) scale(1);
  }

  .bb-events .bb-event-media .bb-frame {
    position: relative;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 30px 60px -20px rgba(10,37,64,0.28);
  }
  .bb-events .bb-event-media img {
    width: 100%;
    height: auto;
    display: block;
    transition: transform 0.7s cubic-bezier(.16,.8,.2,1), filter 0.7s ease;
    will-change: transform;
  }
  .bb-events .bb-event-media .bb-frame::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(0deg, rgba(10,37,64,0.42) 0%, rgba(10,37,64,0) 42%);
    opacity: 0;
    transition: opacity 0.5s ease;
    pointer-events: none;
  }
  .bb-events .bb-event-media:hover img {
    transform: scale(1.09) rotate(-0.4deg);
  }
  .bb-events .bb-event-media:hover .bb-frame::after {
    opacity: 1;
  }
  .bb-events .bb-event-media .bb-tape {
    position: absolute;
    top: -14px;
    left: 28px;
    z-index: 2;
    background: var(--bb-navy);
    color: #fff;
    font-family: 'BBDisplay', Georgia, serif;
    font-style: italic;
    font-size: 13px;
    padding: 7px 16px;
    border-radius: 20px;
    box-shadow: 0 8px 20px rgba(10,37,64,0.25);
    transition: transform 0.4s cubic-bezier(.16,.8,.2,1);
  }
  .bb-events .bb-event-media:hover .bb-tape {
    transform: translateY(-3px) scale(1.04);
  }
  .bb-events .bb-event-media .bb-frame-caption {
    position: absolute;
    left: 24px;
    right: 24px;
    bottom: 18px;
    z-index: 2;
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.03em;
    opacity: 0;
    transform: translateY(10px);
    transition: opacity 0.4s ease, transform 0.4s ease;
    pointer-events: none;
  }
  .bb-events .bb-event-media:hover .bb-frame-caption {
    opacity: 1;
    transform: translateY(0);
  }

  .bb-events .bb-event-body {
    opacity: 0;
    transform: translateY(36px);
    transition: opacity 0.9s cubic-bezier(.16,.8,.2,1) 0.16s, transform 0.9s cubic-bezier(.16,.8,.2,1) 0.16s;
  }
  .bb-events .bb-event-body.bb-in-view { opacity: 1; transform: translateY(0); }

  .bb-events .bb-event-number {
    font-family: 'BBDisplay', Georgia, serif;
    font-size: 13px;
    color: var(--bb-gray);
    margin-bottom: 10px;
    letter-spacing: 0.04em;
  }

  .bb-events .bb-event-body h2 {
    font-family: 'BBDisplay', Georgia, 'Times New Roman', serif;
    font-weight: 600;
    font-size: clamp(26px, 3.2vw, 36px);
    line-height: 1.16;
    margin: 0 0 18px;
  }
  .bb-events .bb-event-body h2 em {
    font-style: italic;
    color: var(--bb-pink);
  }

  .bb-events .bb-event-body p {
    font-size: 16px;
    line-height: 1.75;
    color: var(--bb-navy-soft);
    margin: 0 0 22px;
  }

  .bb-events .bb-event-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .bb-events .bb-event-tags span {
    font-size: 12.5px;
    font-weight: 600;
    padding: 8px 14px;
    border-radius: 999px;
    background: var(--bb-pink-soft);
    color: var(--bb-pink);
    transition: transform 0.3s ease, background 0.3s ease, color 0.3s ease;
  }
  .bb-events .bb-event-tags span.bb-tag-teal {
    background: var(--bb-teal-soft);
    color: var(--bb-teal);
  }
  .bb-events .bb-event-tags span:hover {
    transform: translateY(-2px);
    background: var(--bb-pink);
    color: #fff;
  }
  .bb-events .bb-event-tags span.bb-tag-teal:hover {
    background: var(--bb-teal);
    color: #fff;
  }

  /* ---------- CLOSING ---------- */
  .bb-events .bb-closing {
    max-width: 640px;
    margin: 10px auto 0;
    text-align: center;
    padding: 60px 24px 100px;
    opacity: 0;
    transform: translateY(24px);
    transition: opacity 0.9s ease, transform 0.9s ease;
  }
  .bb-events .bb-closing.bb-in-view { opacity: 1; transform: translateY(0); }
  .bb-events .bb-closing h3 {
    font-family: 'BBDisplay', Georgia, serif;
    font-weight: 600;
    font-size: clamp(24px, 3vw, 30px);
    margin: 0 0 14px;
  }
  .bb-events .bb-closing h3 em { font-style: italic; color: var(--bb-pink); }
  .bb-events .bb-closing p {
    color: var(--bb-gray);
    font-size: 15.5px;
    line-height: 1.7;
    margin: 0;
  }

  /* ---------- RESPONSIVE ---------- */
  @media (max-width: 860px) {
    .bb-events .bb-event {
      grid-template-columns: 1fr;
      gap: 26px;
    }
    .bb-events .bb-event.bb-reverse { direction: ltr; }
    .bb-events .bb-hero { padding: 64px 20px 40px; }
    .bb-events .bb-section { padding: 8px 18px; }
    .bb-events .bb-event-media,
    .bb-events .bb-event.bb-reverse .bb-event-media,
    .bb-events .bb-event:not(.bb-reverse) .bb-event-media {
      transform: translateY(34px) scale(0.96);
    }
    .bb-events .bb-event-media:hover img {
      transform: scale(1.05);
    }
    .bb-events .bb-divider { padding: 32px 0; }
  }

  @media (hover: none) {
    .bb-events .bb-event-media:hover img { transform: none; }
    .bb-events .bb-event-media .bb-frame::after,
    .bb-events .bb-event-media .bb-frame-caption { display: none; }
  }

  @media (prefers-reduced-motion: reduce) {
    .bb-events .bb-divider,
    .bb-events .bb-divider-line,
    .bb-events .bb-event-media,
    .bb-events .bb-event-body,
    .bb-events .bb-closing,
    .bb-events .bb-event-media img {
      transition: none !important;
      opacity: 1 !important;
      transform: none !important;
      filter: none !important;
    }
  }`;

export function EventsPageContent() {
  // Reveal each block as it scrolls into view. Without IntersectionObserver
  // (or with reduced motion) everything is simply shown at once.
  useEffect(() => {
    const nodes = Array.from(
      document.querySelectorAll(
        '.bb-events .bb-divider, .bb-events .bb-event-media, .bb-events .bb-event-body, .bb-events .bb-closing',
      ),
    );
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !('IntersectionObserver' in window)) {
      nodes.forEach((el) => el.classList.add('bb-in-view'));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('bb-in-view');
            observer.unobserve(entry.target);
          }
        });
      },
      {threshold: 0.2, rootMargin: '0px 0px -80px 0px'},
    );
    nodes.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div dangerouslySetInnerHTML={{__html: EVENTS_HTML}} />
      <style>{EVENTS_CSS}</style>
    </>
  );
}
