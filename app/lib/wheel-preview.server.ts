/**
 * Проба на колелото, докато то е спряно за клиентите.
 *
 * Нужна е, защото новите награди трябва да се видят и завъртят на живо, преди
 * кампанията да тръгне. Само параметър в адреса обаче не става: секторът с
 * безплатен продукт слага истински продукт с истински 100% код, тоест
 * `?wheel=test` без проверка би бил безплатен магазин за всеки, който го
 * научи, включително след края на кампанията.
 *
 * Затова параметърът носи ключ, а сървърът го проверява - и при рисуването на
 * страницата (`root`), и при раздаването на купонен код (`api.wheel-code`).
 * Ключът НЕ е нов secret: Nova env-ът не може да получи нов, без Ники. Той е
 * SHA-256 на `<CLOUDCART_ADMIN_PAT>:wheel-preview`, тоест се извежда от нещо,
 * което worker-ът вече има. Същият похват като `/bb-sync`.
 *
 * Адресът за проба:  https://bulgarbiotic.bg/product/<handle>?wheel=<ключ>
 */

/** Пълният ключ (64 шестнайсетични знака) за дадения PAT. */
export async function wheelPreviewKey(secret: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${secret}:wheel-preview`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Носи ли заявката валиден ключ за проба.
 *
 * Сравнението е с целия ключ, не с префикс: къс ключ се познава с достатъчно
 * опити, а тук наградата е реален продукт.
 */
export async function isWheelPreview(
  request: Request,
  env: Record<string, string | undefined>,
): Promise<boolean> {
  const given = new URL(request.url).searchParams.get('wheel') ?? '';
  if (!given) return false;
  const pat = env.CLOUDCART_ADMIN_PAT || env.CLOUDCARTADMINPAT;
  if (!pat) return false;
  return given === (await wheelPreviewKey(pat));
}
