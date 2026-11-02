/**
 * Докога излиза попъпът за бюлетина (кодът WELCOME10 по имейл).
 *
 * Същата схема като `wheel-schedule`: проверява се на СЪРВЪРА, с изричен
 * часови пояс (+03:00 = София), защото Nova върви в UTC. Deploy-ът минава
 * предварително, а попъпът сам спира в точния час.
 *
 * Спира се само попъпът. Формата в бюлетина и във футъра остават, а welcome
 * кампанията по имейл не се пипа.
 *
 * История: спира на 09.10.2026 в 00:00 (края на 08.10) по искане на клиента.
 * За да се пусне пак: `NEWSLETTER_POPUP_END = null`.
 */
export const NEWSLETTER_POPUP_END: string | null = '2026-10-09T00:00:00+03:00';

/** Излиза ли попъпът в момента `now` (по подразбиране: сега). */
export function isNewsletterPopupLive(now: number = Date.now()): boolean {
  if (!NEWSLETTER_POPUP_END) return true;
  const end = Date.parse(NEWSLETTER_POPUP_END);
  return Number.isNaN(end) ? true : now < end;
}
