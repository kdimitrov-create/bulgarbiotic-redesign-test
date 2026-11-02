import {themeModule} from './theme-modules';

/**
 * Телефоните и имейлът в колоната „Свържи се" на футъра.
 *
 * Идват от уиджета „Footer Text" (`footerText`) в панела - същото поле, което
 * търговецът пипа за футъра на класическата тема. До 08.10.2026 бяха записани
 * в кода и добавеният там втори телефон не стигаше до витрината.
 *
 * От текста се взимат само номерата и адресите - останалото в него (старата
 * картинка с картите, оцветяването) е за класическата тема. Не е намерено
 * нищо - остават стойностите отдолу, за да не изчезне колоната.
 */

export interface FooterPhone {
  /** За `tel:` - само цифри с международния код. */
  tel: string;
  /** За очите: `+359 88 275 4163`. */
  label: string;
}

const FALLBACK_PHONES: FooterPhone[] = [{tel: '+359882754163', label: '+359 88 275 4163'}];
const FALLBACK_EMAILS = ['bulgarbiotic.eu@gmail.com'];

export function footerContacts(): {phones: FooterPhone[]; emails: string[]} {
  const raw = String(themeModule('footerText')?.settings?.text ?? '');
  // Таговете стават интервали, за да не се слепят два номера от съседни редове.
  const text = raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#43;|&plus;/g, '+');

  const phones: FooterPhone[] = [];
  for (const m of text.matchAll(/(?:\+359|\b0)[\s\-/]*\d(?:[\s\-/]*\d){7,8}/g)) {
    const phone = normalise(m[0]);
    if (phone && !phones.some((p) => p.tel === phone.tel)) phones.push(phone);
  }
  const emails = [...new Set(text.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g) ?? [])];

  return {
    phones: phones.length ? phones : FALLBACK_PHONES,
    emails: emails.length ? emails : FALLBACK_EMAILS,
  };
}

function normalise(found: string): FooterPhone | null {
  let digits = found.replace(/\D/g, '');
  if (digits.startsWith('359')) digits = digits.slice(3);
  else if (digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length < 8 || digits.length > 9) return null;
  // Мобилните (9 цифри) - `88 275 4163`; софийските (8, с 2 отпред) -
  // `2 123 4567`; останалите градски - `56 123 456`.
  const label =
    digits.length === 9
      ? `+359 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`
      : digits.startsWith('2')
        ? `+359 2 ${digits.slice(1, 4)} ${digits.slice(4)}`
        : `+359 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
  return {tel: `+359${digits}`, label};
}
