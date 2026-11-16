/**
 * Адреси на тази тестова витрина, които не трябва да се индексират от търсачките:
 * собственият адрес на storefront-а (`*.cloudcart.dev`) и тестовият домейн.
 * Списъкът е по адрес, а не „навсякъде“, за да не скрие случайно bulgarbiotic.bg,
 * ако този код някога бъде пренесен към истинската витрина.
 *
 * robots.txt на testnitrogen.live идва от платформата (админ → SEO → Robots.txt),
 * там е `Disallow: /`; маршрутът в кода важи само за адреса в cloudcart.dev.
 */
const HIDDEN_HOSTS = new Set(['testnitrogen.live', 'www.testnitrogen.live']);

export function isHiddenHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host.endsWith('.cloudcart.dev') || HIDDEN_HOSTS.has(host);
}
