import {useEffect, useState} from 'react';
import {Link} from 'react-router';
import {readConsent, setConsent} from '~/lib/analytics';

/**
 * GDPR cookie consent banner.
 *
 * Изборът се пази в localStorage, не в sessionStorage: със sessionStorage
 * банерът изскачаше наново при всяко ново табче, а <Analytics/> не виждаше
 * съгласие - тоест GTM не тръгваше и трафикът оставаше неизмерен.
 * `setConsent` вдига и събитие, за да тръгне контейнерът веднага след
 * натискане, без презареждане.
 */
export function CookieBanner() {
  const [shown, setShown] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (readConsent()) return;
    setDismissed(false);
    const t = setTimeout(() => setShown(true), 1200);
    return () => clearTimeout(t);
  }, []);

  function persist(value: 'accepted' | 'rejected') {
    setConsent(value);
    setShown(false);
    setTimeout(() => setDismissed(true), 600);
  }

  if (dismissed) return null;

  return (
    <div className={`bb-cookie ${shown ? 'shown' : 'hidden'}`} role="dialog" aria-labelledby="bb-cookie-title">
      <div className="bb-cookie-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a9 9 0 11-9-9c-.5 1 0 2 1 2.5s.5 2-.5 2.5 0 2 1 2.5 1 1.5 0 2.5 0 2 1.5 2 2 2 2 3 1.5 2.5 3.5 2.5" />
          <circle cx="9" cy="10" r="1" fill="currentColor" />
          <circle cx="15" cy="14" r="1" fill="currentColor" />
          <circle cx="11" cy="16" r="0.7" fill="currentColor" />
        </svg>
      </div>
      <div className="bb-cookie-text">
        <h4 id="bb-cookie-title">Този сайт използва бисквитки</h4>
        <p>
          За да подобрим преживяването ти и да измерваме ефективността на офертите.{' '}
          <Link to="/page/politika-otnosno-biskvitkite">Прочети повече</Link>
        </p>
      </div>
      <div className="bb-cookie-actions">
        <button type="button" className="bb-cookie-reject" onClick={() => persist('rejected')}>
          Само нужните
        </button>
        <button type="button" className="bb-cookie-accept" onClick={() => persist('accepted')}>
          Приемам всички
        </button>
      </div>
    </div>
  );
}
