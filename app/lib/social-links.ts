import {themeModule} from './theme-modules';

/**
 * Връзките към профилите идват от админ панела, не от кода.
 *
 * В „Дизайн → Социални мрежи" (widget `social`, `map: extra.social`) търговецът
 * пуска и спира всяка мрежа поотделно и си пише адреса. Дотук долният ред тук
 * носеше четири зашити връзки, три от които сочеха `#` - тоест иконка, която не
 * води никъде. Сега се показва точно каквото е включено в панела и щом утре
 * пуснат TikTok, той се появява без промяна в кода.
 *
 * Форматът на настройките е по двойки: `<мрежа>_show` (0/1) и `<мрежа>_link`.
 */
export type SocialLink = {key: SocialKey; label: string; href: string};

const PLATFORMS = [
  {key: 'facebook', label: 'Facebook'},
  {key: 'instagram', label: 'Instagram'},
  {key: 'youtube', label: 'YouTube'},
  {key: 'tiktok', label: 'TikTok'},
  {key: 'x', label: 'X'},
  {key: 'linkedin', label: 'LinkedIn'},
  {key: 'pinterest', label: 'Pinterest'},
] as const;

export type SocialKey = (typeof PLATFORMS)[number]['key'];

function on(value: unknown): boolean {
  return value === 1 || value === '1' || value === true || value === 'yes';
}

/**
 * Адрес без път е стойността по подразбиране на панела (`https://www.tiktok.com`)
 * - иконка към началната страница на мрежата не е връзка към профил, затова се
 * пропуска дори мрежата да е включена.
 */
function isProfileUrl(raw: unknown): raw is string {
  if (typeof raw !== 'string') return false;
  const value = raw.trim();
  if (!value) return false;
  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol)) return false;
    return url.pathname.replace(/\/+$/, '').length > 0;
  } catch {
    return false;
  }
}

export function socialLinks(): SocialLink[] {
  const settings = themeModule('social')?.settings as Record<string, unknown> | undefined;
  if (!settings || !on(settings.enabled)) return [];
  const out: SocialLink[] = [];
  for (const {key, label} of PLATFORMS) {
    if (!on(settings[`${key}_show`])) continue;
    const href = settings[`${key}_link`];
    if (!isProfileUrl(href)) continue;
    out.push({key, label, href: href.trim()});
  }
  return out;
}
