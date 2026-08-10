import {useState} from 'react';

/**
 * Общата логика зад трите форми за бюлетина (попъп, футър, страница
 * „Абонирай се"). Всяка от тях си рисува своя вид, но питат един и същ
 * маршрут и показват един и същ текст за един и същ изход - иначе същият
 * имейл щеше да получава различен отговор на различно място.
 */

export type SubscribeStatus = 'created' | 'exists' | 'invalid' | 'consent' | 'error';
export type NewsletterState = 'idle' | 'sending' | SubscribeStatus;

/** Едно изречение за всеки изход. Успехът се съобщава от самата форма. */
export const NEWSLETTER_MESSAGES: Record<SubscribeStatus, string> = {
  created: 'Готово! Записахме те за бюлетина.',
  exists: 'Вече има абонат с този имейл.',
  invalid: 'Провери имейл адреса.',
  consent: 'Отбележи съгласието за обработване на лични данни.',
  error: 'Нещо се обърка. Опитай пак след малко.',
};

export function useNewsletter() {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<NewsletterState>('idle');

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (state === 'sending') return 'sending' as const;

    // Проверката се прави и тук, за да не пътува заявка за нищо, и на
    // сървъра, защото това тук всеки може да го заобиколи.
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email.trim())) {
      setState('invalid');
      return 'invalid' as const;
    }
    if (!consent) {
      setState('consent');
      return 'consent' as const;
    }

    setState('sending');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email: email.trim(), consent: true}),
      });
      const body = (await res.json().catch(() => ({}))) as {status?: SubscribeStatus};
      const status: SubscribeStatus = body.status ?? 'error';
      setState(status);
      return status;
    } catch {
      setState('error');
      return 'error' as const;
    }
  }

  /** Всяко пипане по полето маха стария отказ, за да не виси червен текст. */
  function change(value: string) {
    setEmail(value);
    if (state !== 'idle' && state !== 'sending') setState('idle');
  }

  function toggleConsent(value: boolean) {
    setConsent(value);
    if (state === 'consent') setState('idle');
  }

  return {
    email,
    consent,
    state,
    sending: state === 'sending',
    /** Показва ли се съобщение за отказ под формата. */
    problem:
      state === 'exists' || state === 'invalid' || state === 'consent' || state === 'error'
        ? NEWSLETTER_MESSAGES[state]
        : null,
    setEmail: change,
    setConsent: toggleConsent,
    submit,
    reset: () => setState('idle'),
  };
}
