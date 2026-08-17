/**
 * Съобщенията за грешка от количката, на български.
 *
 * `userErrors` идват от платформата и са на английски - магазинът е само на
 * български, тоест клиентът вижда „Invalid discount code" под полето за
 * промокод. Тук всяко познато съобщение се превежда, а непознатото пада на общ
 * български текст вместо да се показва суровото английско.
 *
 * Ключът се търси по СЪДЪРЖАНИЕ, не по точно съвпадение: платформата връща ту
 * „Invalid discount code", ту „The discount code is invalid" за едно и също
 * нещо, а и добавя име на код накрая.
 */
const RULES: Array<{match: RegExp; bg: string}> = [
  {match: /invalid.*discount|discount.*(invalid|not valid)/i, bg: 'Невалиден промокод.'},
  {match: /discount.*(expired|no longer)/i, bg: 'Промокодът е изтекъл.'},
  {match: /discount.*(used|limit|exceed)/i, bg: 'Промокодът вече е използван.'},
  {match: /(not|no).*(applicable|apply)/i, bg: 'Кодът не важи за продуктите в количката.'},
  {match: /minimum|min\.? *(order|amount|subtotal)/i, bg: 'Поръчката не достига минималната сума за този код.'},
  {match: /out of stock|not available|unavailable|insufficient/i, bg: 'Продуктът не е наличен в това количество.'},
  {match: /quantity/i, bg: 'Количеството не може да бъде променено.'},
  {match: /cart .*(not found|missing)|no cart/i, bg: 'Количката изтече. Презареди страницата и опитай пак.'},
  {match: /rate limit|too many/i, bg: 'Твърде много заявки. Опитай пак след няколко секунди.'},
];

/** Дали текстът е на кирилица - тогава идва от нас и си остава както е. */
const IS_BG = /[Ѐ-ӿ]/;

export function cartErrorText(message: string | undefined | null): string {
  const raw = (message ?? '').trim();
  if (!raw) return 'Нещо се обърка. Опитай пак.';
  if (IS_BG.test(raw)) return raw;
  const hit = RULES.find((r) => r.match.test(raw));
  return hit ? hit.bg : 'Нещо се обърка. Опитай пак.';
}
