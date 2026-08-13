/**
 * Котвата „Съставки" се слага на сървъра, а не в браузъра.
 *
 * ⚠️ Дотук това ставаше с ефект в `SectionAnchorNav`: намери заглавието
 * „Състав…" и му сложи `id`. Проверено на живо - ефектите на този компонент
 * НЕ се изпълняват (нито котвата, нито лепкавото поведение, нито
 * подчертаването на активната връзка), затова бутонът „Съставки" стоеше видим
 * и не водеше наникъде. Причината за нехидратирането е отделен въпрос;
 * поправката не бива да зависи от нея.
 *
 * Затова заглавието се маркира в самия HTML, преди страницата да тръгне.
 * Печалбата е двойна: котвата съществува и без JavaScript, а страницата знае
 * ОЩЕ НА СЪРВЪРА дали такъв раздел изобщо има - значи връзката се рисува само
 * когато води някъде, вместо да се крие после.
 *
 * Описанието го пише мърчантът в панела, тоест заглавието няма свой `id` и не
 * всеки продукт има такъв раздел (Femin има, „Пакет Beauty" няма).
 */

export const INGREDIENTS_ID = 'ingredients';

/** Кратък ред, започващ със „Състав" - заглавие, а не изречение с тази дума. */
const HEADING = /<(h[1-6])\b([^>]*)>([\s\S]{0,80}?)<\/\1>/gi;

function looksLikeIngredients(inner: string): boolean {
  const text = inner.replace(/<[^>]+>/g, '').trim();
  return text.length <= 80 && /^състав/i.test(text);
}

export type WithAnchor = {html: string; hasIngredients: boolean};

/**
 * Връща описанието с `id` върху първото заглавие „Състав…" и казва дали такова
 * е намерено. Ако вече има такъв `id`, нищо не се пипа.
 */
export function withIngredientsAnchor(html: string | null | undefined): WithAnchor {
  const source = html ?? '';
  if (!source) return {html: source, hasIngredients: false};
  if (source.includes(`id="${INGREDIENTS_ID}"`)) return {html: source, hasIngredients: true};

  let done = false;
  const out = source.replace(HEADING, (match, tag, attrs, inner) => {
    if (done || !looksLikeIngredients(inner)) return match;
    done = true;
    return `<${tag}${attrs} id="${INGREDIENTS_ID}">${inner}</${tag}>`;
  });

  return {html: out, hasIngredients: done};
}
