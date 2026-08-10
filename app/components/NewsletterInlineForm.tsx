import type {ReactNode} from 'react';
import {NewsletterConsent} from '~/components/NewsletterConsent';
import {useNewsletter} from '~/lib/use-newsletter';

/**
 * Формата за бюлетин, която стои в текста на страницата - футърът и
 * „Абонирай се за бюлетин". Попъпът си има собствен вид и не минава оттук.
 *
 * Двете места изглеждат различно, затова класовете и текстовете идват отвън, а
 * вътре остава само това, което трябва да е еднакво навсякъде: съгласието,
 * заявката и отговорът при вече съществуващ абонат.
 */

interface Props {
  /** Различен за всяка форма - отметките се вързват по id. */
  id: string;
  formClassName: string;
  placeholder?: string;
  label?: string;
  /**
   * Какво се показва на мястото на формата след успешно записване.
   * Текстът идва отвътре, защото „записахме те" и „отново си записан" са два
   * различни успеха и формата знае кой от двата се е случил.
   */
  success: (message: string) => ReactNode;
}

export function NewsletterInlineForm({
  id,
  formClassName,
  placeholder = 'твоят имейл адрес',
  label = 'Абонирай се',
  success,
}: Props) {
  const news = useNewsletter();

  if (news.done) return <>{success(news.successMessage ?? '')}</>;

  return (
    <div className="bb-nl-inline">
      <form className={formClassName} onSubmit={news.submit}>
        <input
          type="email"
          required
          value={news.email}
          onChange={(e) => news.setEmail(e.target.value)}
          placeholder={placeholder}
          aria-label="Имейл адрес"
          disabled={news.sending}
        />
        <button type="submit" disabled={news.sending}>
          {news.sending ? 'Записваме…' : label}
        </button>
      </form>

      <NewsletterConsent id={id} checked={news.consent} onChange={news.setConsent} />

      {news.problem ? (
        <p className="bb-nl-problem" role="alert">
          {news.problem}
        </p>
      ) : null}

      <style>{`
        .bb-nl-problem {
          margin: 6px 0 0;
          font-size: 12.5px;
          font-weight: 600;
          line-height: 1.45;
          color: var(--color-brand-pink);
        }
        .bb-nl-inline input:disabled,
        .bb-nl-inline button:disabled { opacity: 0.6; cursor: default; }
      `}</style>
    </div>
  );
}
