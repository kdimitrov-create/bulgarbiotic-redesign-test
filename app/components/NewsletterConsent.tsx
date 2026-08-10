/**
 * Отметката за съгласие пред всяка форма за бюлетина.
 *
 * Три неща, които не се менят без правно основание:
 *  - НЕ е отметната по подразбиране. Предварително маркирано съгласие не е
 *    съгласие по GDPR, а точно това правеше старият попъп - записваше имейла
 *    без да пита.
 *  - Води към истинските страници на магазина, не към общ текст.
 *  - Сървърът отказва заявка без нея, тоест махането ѝ от тук не отваря вратичка.
 */

const PRIVACY = '/page/privacy-policy';
const CONSENT_DECLARATION =
  '/page/deklaraciya-za-davane-na-saglasie-za-obrabotvane-na-lichni-danni';

interface Props {
  checked: boolean;
  onChange: (value: boolean) => void;
  /** Различен id за всяка форма - иначе кликът върху една маркира друга. */
  id: string;
  className?: string;
}

export function NewsletterConsent({checked, onChange, id, className}: Props) {
  return (
    <label className={`bb-consent${className ? ` ${className}` : ''}`} htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        Съгласявам се данните ми да се обработват според{' '}
        <a href={PRIVACY} target="_blank" rel="noreferrer">
          Политиката за поверителност
        </a>{' '}
        и{' '}
        <a href={CONSENT_DECLARATION} target="_blank" rel="noreferrer">
          Декларацията за съгласие
        </a>
        .
      </span>

      <style>{`
        .bb-consent {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          margin: 12px 0 4px;
          font-size: 12px;
          line-height: 1.5;
          text-align: left;
          cursor: pointer;
          color: rgba(10, 37, 64, 0.72);
        }
        .bb-consent input {
          flex: 0 0 auto;
          width: 16px;
          height: 16px;
          margin-top: 1px;
          accent-color: var(--color-brand-pink);
          cursor: pointer;
        }
        .bb-consent a {
          color: inherit;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .bb-consent a:hover { color: var(--color-brand-pink); }
        /* Във футъра фонът е тъмен, затова текстът се обръща. */
        .bb-footer .bb-consent { color: rgba(255, 255, 255, 0.62); }
        .bb-footer .bb-consent a:hover { color: #fff; }
      `}</style>
    </label>
  );
}
