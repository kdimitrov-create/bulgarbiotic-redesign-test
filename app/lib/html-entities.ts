/**
 * Един декодер за текста, който идва от админ панела.
 *
 * Текстът на търговеца пътува като HTML: редакторът пише `&euro;`, `&ndash;`,
 * понякога и числов код (`&#8364;`). Класическата тема го слага като HTML и
 * браузърът го превръща в знак; ние го слагаме като ТЕКСТ, значи трябва сами да
 * го разчетем - иначе на екрана стои суровият код.
 *
 * Открито на живо 17.08.2026: промо лентата, най-горният ред на всяка страница,
 * пишеше „поръчка над 70&euro;". Причината е, че всяко място си имаше свой
 * кратък списък с два-три знака и точно този го нямаше. Затова списъкът е един,
 * тук, и по числата не се налага да се допълва.
 */
const NAMED: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  mdash: '—',
  ndash: '–',
  hellip: '…',
  laquo: '«',
  raquo: '»',
  bdquo: '„',
  ldquo: '“',
  rdquo: '”',
  lsquo: '‘',
  rsquo: '’',
  rarr: '→',
  larr: '←',
  euro: '€',
  pound: '£',
  copy: '©',
  reg: '®',
  trade: '™',
  deg: '°',
  times: '×',
  middot: '·',
  bull: '•',
  eacute: 'é',
};

/** Разчита именуваните и числовите знаци. Не пипа нищо друго. */
export function decodeEntities(input: string): string {
  if (!input || input.indexOf('&') === -1) return input;
  return input.replace(/&(#x?[0-9a-f]+|[a-z][a-z0-9]*);/gi, (whole, body: string) => {
    if (body[0] === '#') {
      const code =
        body[1] === 'x' || body[1] === 'X'
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
      // Кодове извън Unicode или служебни - оставя се както е, вместо да се
      // хвърля: текстът на търговеца не бива да поваля страницата.
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return whole;
      try {
        return String.fromCodePoint(code);
      } catch {
        return whole;
      }
    }
    const hit = NAMED[body.toLowerCase()];
    return hit ?? whole;
  });
}

/** Маха таговете и разчита знаците - за места, които показват чист текст. */
export function plainText(html: string): string {
  return decodeEntities(String(html ?? '').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}
