import {useEffect} from 'react';
import {CAMPAIGN_PARAMS} from '~/lib/campaign-attribution';

/**
 * Маха `cc_campaign` и `cc_subscriber` от адресната лента след хидратация.
 *
 * Класическата тема ги махаше с 302 още при кацането. Ние НЕ го правим на
 * сървъра: на този сайт част от заявките умират без нито един байт и всеки
 * допълнителен hop е още един шанс кацането от имейл да увисне - точно при
 * най-скъпия трафик. Кампанията вече е прибрана в cookie от `server.ts`, тоест
 * тук остава само козметика.
 *
 * `history.replaceState` вместо навигация: не пуска нито заявка, не пречиства
 * loader-ите и запазва вътрешното състояние на React Router (подава се същият
 * `history.state`). `useLocation()` ще продължи да вижда стария адрес до
 * следващата навигация, което е без значение - никой не чете тези параметри.
 * Филтрите така или иначе броят само познати ключове, тоест фантомен чип
 * „Филтри 1" не се появява дори преди чистенето.
 *
 * Не тръгне ли JS изобщо, параметрите остават в адреса. Безобидно е.
 */
export function useCampaignUrlCleanup() {
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      let changed = false;
      for (const param of CAMPAIGN_PARAMS) {
        if (url.searchParams.has(param)) {
          url.searchParams.delete(param);
          changed = true;
        }
      }
      if (!changed) return;
      const search = url.searchParams.toString();
      window.history.replaceState(
        window.history.state,
        '',
        url.pathname + (search ? `?${search}` : '') + url.hash,
      );
    } catch {
      // Адресната лента е козметика - не бива да вали страницата.
    }
  }, []);
}
