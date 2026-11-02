import {useEffect, useState, useRef} from 'react';
import {NewsletterConsent} from '~/components/NewsletterConsent';
import {useRouteLoaderData} from 'react-router';
import {useNewsletter} from '~/lib/use-newsletter';
import {isNewsletterPopupLive} from '~/lib/newsletter-popup-schedule';

const POPUP_KEY = 'bactology-npopup-v1';

/**
 * Кога излиза попъпът - 30 секунди, откакто човекът е отворил МАГАЗИНА.
 *
 * Беше 8 секунди и се засичаше с банера за бисквитки: той идва по веригата
 * GTM → uc.js → cc.js, тоест на бавна мрежа доста късно (мерено 42 s на
 * Fast 3G), и лягаше върху попъпа. Кой ще е отгоре беше лотария.
 */
const DELAY_MS = 30_000;

/**
 * Мигът на влизане в магазина, а не в тази страница.
 *
 * Попъпът живее само на началната. Без този запис часовникът тръгваше отначало
 * при всяко връщане там, тоест човек, който обикаля из сайта, не го виждаше
 * никога. Записът е за сесията - нов раздел значи ново посещение.
 */
const ARRIVED_KEY = 'bactology-npopup-arrived';

function arrivedAt(): number {
  try {
    const saved = Number(sessionStorage.getItem(ARRIVED_KEY));
    if (saved > 0) return saved;
    const now = Date.now();
    sessionStorage.setItem(ARRIVED_KEY, String(now));
    return now;
  } catch {
    // Частен режим без storage: часовникът тръгва оттук и толкова.
    return Date.now();
  }
}

/**
 * Показва ли се попъпът само с `?popup=1` в адреса.
 *
 * Кратка история, за да не се върти пак: махнахме го от началната на
 * 2026-08-10, защото формата не пишеше никъде. След като я вързахме към
 * истинските абонати, клиентът я пусна обратно за всички - същия ден.
 * Обратното изключване е една стойност оттук, без да се пипа страницата.
 */
const PREVIEW_ONLY = false;

/**
 * Попъп за бюлетина при първо посещение: излиза 30 s след влизане в магазина.
 *
 * Три състояния:
 *   1. Capture: имейл + съгласие. Праща към `/api/subscribe`, което първо
 *      проверява дали такъв абонат вече съществува.
 *   2. Reveal: потвърждение, че кодът пътува по имейл.
 *   3. Exists: казваме, че вече има абонат с този имейл.
 *
 * ⚠️ Кодът WELCOME10 НЕ се показва тук (промяна 20.08.2026). Раздава се с
 * welcome кампания по имейл, за да мине всеки записал се през етикета
 * `popup-nl`: върху него се строи потребителският сегмент, а върху сегмента -
 * кампанията. Покажем ли кода на екрана, човек го взима и си тръгва, без
 * писмото да е нужно, и сегментът губи смисъла си.
 */
export function NewsletterPopup() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [stage, setStage] = useState<'capture' | 'reveal' | 'exists'>('capture');
  const triggered = useRef(false);
  // „popup" → абонатът получава етикет `popup-nl` (виж `api.subscribe`).
  const news = useNewsletter('popup');
  /* Графикът е в `newsletter-popup-schedule`. Решава сървърът (root loader-ът);
     часовникът на браузъра само спира попъпа и в раздел, отворен преди срока. */
  const rootData = useRouteLoaderData<{newsletterPopupLive?: boolean}>('root');
  const live = rootData?.newsletterPopupLive !== false;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!live) return;
    if (PREVIEW_ONLY && !new URLSearchParams(window.location.search).has('popup')) return;
    if (sessionStorage.getItem(POPUP_KEY)) return;
    setMounted(true);

    const trigger = () => {
      if (triggered.current) return;
      if (!isNewsletterPopupLive()) return;
      triggered.current = true;
      setOpen(true);
    };

    // Остатъкът от тридесетте секунди, а не самите тридесет: човек, който вече
    // е обикалял из магазина, не чака отначало, щом се върне на началната.
    const left = Math.max(0, DELAY_MS - (Date.now() - arrivedAt()));
    const t = window.setTimeout(trigger, left);
    const onScroll = () => {
      // Скролът само ускорява, но НЕ преди срока. Иначе бърз скрол вдига
      // попъпа на петата секунда и той пак се засича с банера за бисквитки.
      if (Date.now() - arrivedAt() < DELAY_MS) return;
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      if (window.scrollY / Math.max(docH, 1) > 0.3) trigger();
    };
    window.addEventListener('scroll', onScroll, {passive: true});

    return () => {
      window.clearTimeout(t);
      window.removeEventListener('scroll', onScroll);
    };
  }, [live]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function close() {
    sessionStorage.setItem(POPUP_KEY, 'closed');
    setOpen(false);
    setTimeout(() => {
      setMounted(false);
      // Reset for next session
      setStage('capture');
    }, 600);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const status = await news.submit(e);
    // `updated` е абонат, който го е имало, но не е приемал маркетинг и тъкмо
    // е дал съгласие. За бюлетина това е записване като всяко друго, затова
    // минава по същия път - иначе човекът дава съгласие и остава с празни ръце.
    if (status === 'created' || status === 'updated') setStage('reveal');
    else if (status === 'exists') setStage('exists');
    // При отказ оставаме на формата - `news.problem` казва защо.
  }

  if (!mounted) return null;

  return (
    <>
      <div className={`bb-npopup-overlay${open ? ' open' : ''}`} onClick={close} aria-hidden="true" />
      <div
        className={`bb-npopup${open ? ' open' : ''}`}
        role="dialog"
        aria-labelledby="bb-npopup-title"
        aria-modal="true"
      >
        <div className="bb-npopup-image">
          <button type="button" className="bb-npopup-close" onClick={close} aria-label="Затвори">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <div className="bb-npopup-discount">
            10<span className="pct">%</span>
          </div>
        </div>
        <div className="bb-npopup-content">
          {stage === 'capture' ? (
            <>
              <h2 id="bb-npopup-title">
                Подарък за <em>първата ти поръчка.</em>
              </h2>
              <p>
                Запиши се за бюлетина и получи код за <strong>10% намаление</strong> на първата си поръчка
                + седмични съвети за микробиома директно в имейла ти.
              </p>
              <form className="bb-npopup-form" onSubmit={onSubmit}>
                <input
                  type="email"
                  placeholder="твоят имейл адрес"
                  value={news.email}
                  onChange={(e) => news.setEmail(e.target.value)}
                  disabled={news.sending}
                  required
                />
                <button type="submit" disabled={news.sending}>
                  {news.sending ? 'Записваме…' : 'Получи кода'}
                </button>
              </form>
              <NewsletterConsent
                id="bb-consent-popup"
                checked={news.consent}
                onChange={news.setConsent}
              />
              {news.problem ? (
                <div className="bb-npopup-problem" role="alert">
                  {news.problem}
                </div>
              ) : null}
              <div className="bb-npopup-fineprint">
                Без спам. Можеш да се отпишеш по всяко време. Присъединяваш се към 117 000+ читатели.
              </div>
            </>
          ) : stage === 'exists' ? (
            <>
              <h2 id="bb-npopup-title">
                Вече си <em>с нас.</em>
              </h2>
              <p>
                Вече има абонат с този имейл, затова не го записваме втори път. Бюлетинът
                продължава да идва както досега.
              </p>
              <a href="/category/all-products" className="bb-welcome-shop" onClick={close}>
                Пазарувай сега
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </a>
              <div className="bb-npopup-fineprint">
                Ако не получаваш писмата ни, провери папката „Спам".
              </div>
            </>
          ) : (
            <>
              <h2 id="bb-npopup-title">
                Готово! Кодът пътува към <em>имейла ти.</em>
              </h2>
              <p>
                Изпращаме ти код за <strong>10% намаление</strong> на първата поръчка с първото
                писмо. Провери пощата си след няколко минути.
              </p>
              <a href="/category/all-products" className="bb-welcome-shop" onClick={close}>
                Пазарувай сега
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </a>
              <div className="bb-npopup-fineprint">
                Кодът е валиден за първата ти поръчка, без минимална сума.
              </div>
            </>
          )}
        </div>

        <style>{`
          /* Отказът стои под формата, не на мястото ѝ - иначе човекът губи
             написаното и не вижда какво да поправи. */
          .bb-npopup-problem {
            margin-top: 10px;
            padding: 9px 12px;
            border-radius: 10px;
            background: rgba(227, 22, 108, 0.08);
            border: 1px solid rgba(227, 22, 108, 0.24);
            color: var(--color-brand-pink);
            font-size: 12.5px;
            font-weight: 600;
            text-align: left;
          }
          .bb-npopup-form input:disabled,
          .bb-npopup-form button:disabled { opacity: 0.6; cursor: default; }

          /* Кодът вече НЕ се показва тук: праща се с welcome кампанията по
             имейл, за да минат всички през етикета popup-nl и сегмента.
             Стиловете на талона с кода паднаха заедно с него.
             (Без обратни апострофи в този коментар - блокът е template literal
             и първият от тях го затваря по средата.) */
          .bb-welcome-shop {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: var(--color-ink);
            color: var(--color-cream-1);
            padding: 12px 22px;
            border-radius: 999px;
            font-size: 13px;
            font-weight: 700;
            margin-bottom: 14px;
            transition: background 0.18s, transform 0.18s;
          }
          .bb-welcome-shop:hover {
            background: var(--color-brand-pink);
            color: white;
            text-decoration: none;
            transform: translateY(-1px);
          }
          .bb-welcome-shop svg { width: 14px; height: 14px; }
        `}</style>
      </div>
    </>
  );
}
