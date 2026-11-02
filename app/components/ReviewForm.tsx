import {useState} from 'react';
import {StarIcon} from '@heroicons/react/20/solid';

/**
 * „Остави отзив" на продуктовата страница.
 *
 * Отворена е за всички, защото така е настроено приложението „Отзиви" в панела
 * (`addedReviewsConditions: "all"`). Смени ли се на „само купувач", това тук
 * трябва да се скрие за невлезли клиенти - сървърът и без това ще откаже.
 *
 * Отговорът различава два успеха и това НЕ е дребна разлика за човека отсреща:
 * „публикуван" и „чака одобрение" изглеждат еднакво успешно, но във втория
 * случай той няма да види отзива си веднага и трябва да разбере защо.
 */

const MAX_COMMENT = 1000;

type Outcome =
  | 'published'
  | 'pending'
  | 'invalid'
  | 'closed'
  | 'buyers-only'
  | 'error';

const MESSAGES: Record<Outcome, string> = {
  published: 'Благодарим! Отзивът ти вече е на страницата.',
  pending: 'Благодарим! Отзивът ти е приет и ще се появи след преглед.',
  invalid: 'Провери попълненото: име, оценка и няколко думи за продукта.',
  closed: 'В момента не приемаме отзиви за този продукт.',
  'buyers-only': 'Отзив за този продукт могат да оставят само клиенти, които са го поръчали.',
  error: 'Нещо се обърка. Опитай пак след малко.',
};

interface Props {
  productId: string;
  productHandle: string;
  /** Панелът е на „само купувачи". */
  buyersOnly: boolean;
  loggedIn: boolean;
}

export function ReviewForm({productId, productHandle, buyersOnly, loggedIn}: Props) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const done = outcome === 'published' || outcome === 'pending';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    // Проверява се и тук, за да не пътува заявка за нищо, и на сървъра,
    // защото това тук всеки може да го заобиколи.
    if (rating < 1 || name.trim().length < 2 || comment.trim().length < 3) {
      setOutcome('invalid');
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({productId, productHandle, name, rating, title, comment}),
      });
      const body = (await res.json().catch(() => ({}))) as {status?: Outcome};
      setOutcome(body.status ?? 'error');
    } catch {
      setOutcome('error');
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="bb-rf-done" role="status">
        {MESSAGES[outcome as Outcome]}
      </div>
    );
  }

  /* Панелът е на „само купувачи", а човекът дори не е влязъл.
   *
   * Не му показваме форма, за да я попълни и да получи отказ накрая. Дали
   * наистина е купил продукта се проверява на сървъра след влизането - оттук
   * не се вижда. */
  if (buyersOnly && !loggedIn) {
    return (
      <div className="bb-rf-wrap">
        <p className="bb-rf-note">
          Отзив за този продукт могат да оставят само клиенти, които са го поръчали.
        </p>
        <a className="bb-rf-open" href="/account/login">
          Влез в профила си
        </a>
        <style>{FORM_CSS}</style>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="bb-rf-wrap">
        <button type="button" className="bb-rf-open" onClick={() => setOpen(true)}>
          Остави отзив
        </button>
        <style>{FORM_CSS}</style>
      </div>
    );
  }

  return (
    <div className="bb-rf-wrap">
      <form className="bb-rf" onSubmit={submit}>
        <div className="bb-rf-title">Твоят отзив</div>

        <div className="bb-rf-stars" role="radiogroup" aria-label="Оценка">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} от 5 звезди`}
              className={`bb-rf-star${n <= (hover || rating) ? ' on' : ''}`}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
            >
              <StarIcon />
            </button>
          ))}
        </div>

        <input
          className="bb-rf-input"
          placeholder="Име"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          disabled={sending}
          required
        />
        <input
          className="bb-rf-input"
          placeholder="Заглавие (по избор)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          disabled={sending}
        />
        <textarea
          className="bb-rf-input bb-rf-text"
          placeholder="Какво мислиш за продукта?"
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT))}
          rows={4}
          disabled={sending}
          required
        />
        <div className="bb-rf-count">
          {comment.length}/{MAX_COMMENT}
        </div>

        {outcome && !done ? (
          <p className="bb-rf-problem" role="alert">
            {MESSAGES[outcome]}
          </p>
        ) : null}

        <div className="bb-rf-actions">
          <button type="submit" className="bb-rf-send" disabled={sending}>
            {sending ? 'Изпращаме…' : 'Изпрати'}
          </button>
          <button
            type="button"
            className="bb-rf-cancel"
            onClick={() => setOpen(false)}
            disabled={sending}
          >
            Откажи
          </button>
        </div>
      </form>

      <style>{FORM_CSS}</style>
    </div>
  );
}

/* Стиловете са тук, а не в `app.css`, по същата причина като при попъпа:
   компонентът си носи вида. Ползват се от трите изхода, затова са константа,
   а не вграден блок. */
const FORM_CSS = `
        .bb-rf-wrap { margin-top: 28px; text-align: center; }
        .bb-rf-note {
          font-size: 13.5px; line-height: 1.6; opacity: 0.7;
          max-width: 420px; margin: 0 auto 14px;
        }
        .bb-rf-open {
          display: inline-block; text-decoration: none;
          background: var(--color-ink); color: var(--color-cream-1);
          border: none; cursor: pointer; font-family: inherit;
          padding: 13px 28px; border-radius: 999px;
          font-size: 13px; font-weight: 800;
          transition: background 0.2s;
        }
        .bb-rf-open:hover { background: var(--color-brand-pink); color: var(--color-cream-1); }
        .bb-rf {
          max-width: 560px; margin: 0 auto; text-align: left;
          display: flex; flex-direction: column; gap: 10px;
          padding: 26px; border-radius: 18px;
          background: var(--color-cream-1);
          border: 1px solid rgba(10, 37, 64, 0.08);
        }
        .bb-rf-title { font-size: 16px; font-weight: 800; color: var(--color-ink); }
        .bb-rf-stars { display: flex; gap: 2px; }
        .bb-rf-star {
          background: none; border: none; cursor: pointer; padding: 2px;
          width: 30px; height: 30px; color: rgba(10, 37, 64, 0.18);
          transition: color 0.15s, transform 0.15s;
        }
        .bb-rf-star.on { color: #f6a609; }
        .bb-rf-star:hover { transform: scale(1.12); }
        .bb-rf-input {
          padding: 12px 14px; border-radius: 12px;
          border: 1px solid rgba(10, 37, 64, 0.12);
          font-family: inherit; font-size: 14px;
          background: white; color: var(--color-ink); outline: none;
          transition: border-color 0.2s;
        }
        .bb-rf-input:focus { border-color: var(--color-brand-pink); }
        .bb-rf-text { resize: vertical; min-height: 96px; }
        .bb-rf-count { font-size: 11px; opacity: 0.45; text-align: right; margin-top: -6px; }
        .bb-rf-problem { font-size: 12.5px; color: #b4243f; margin: 0; }
        .bb-rf-actions { display: flex; gap: 10px; margin-top: 4px; }
        .bb-rf-send {
          background: var(--color-ink); color: var(--color-cream-1);
          border: none; cursor: pointer; font-family: inherit;
          padding: 12px 26px; border-radius: 999px;
          font-size: 13px; font-weight: 800; transition: background 0.2s;
        }
        .bb-rf-send:hover:not([disabled]) { background: var(--color-brand-pink); }
        .bb-rf-send[disabled] { opacity: 0.7; cursor: default; }
        .bb-rf-cancel {
          background: none; border: none; cursor: pointer; font-family: inherit;
          font-size: 13px; font-weight: 700; color: var(--color-ink); opacity: 0.55;
        }
        .bb-rf-cancel:hover { opacity: 1; }
        .bb-rf-done {
          margin-top: 28px; text-align: center;
          font-size: 14px; font-weight: 700; color: var(--color-ink);
          background: var(--color-cream-2);
          padding: 18px 22px; border-radius: 14px;
        }
`;
