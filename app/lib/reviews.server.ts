import {adminGql, adminOrigin, adminPat} from './admin-api.server';

/**
 * Оставяне на отзив от клиент.
 *
 * ⚠️ Тази пътека ПИШЕ в публичния каталог на търговеца. Затова всичко тук е
 * подредено около един въпрос: какво влиза веднага и какво чака одобрение.
 *
 * Политиката НЕ е измислена от нас - чете се от самото приложение „Отзиви"
 * в панела. На bulgarbiotic днес: `addedReviewsConditions: "all"` (всеки може
 * да остави отзив, не само купувач) и `acceptStar: 4` (отзив с 4 или 5 звезди
 * се публикува веднага, по-нисък чака).
 *
 * Мутацията `createProductReview` е админска и публикува БЕЗУСЛОВНО, тоест сама
 * по себе си не спазва тази политика. Затова отзив под прага веднага след това
 * се сваля в „чака одобрение" с `changeProductReviewsStatus`.
 *
 * SERVER ONLY - `.server.ts` държи PAT-а извън клиентския бъндъл.
 */

export type ReviewOutcome =
  | 'published' // публикуван веднага
  | 'pending' // приет, но чака одобрение от търговеца
  | 'invalid' // въведеното не става
  | 'closed' // приложението за отзиви е спряно
  | 'buyers-only' // панелът иска отзиви само от купувачи, а този не е
  | 'error'; // администраторското API не отговори

/**
 * Политиката на търговеца, както е в панела в ТОЗИ момент.
 *
 * Чете се на всяка заявка (с кратък кеш), а не се зашива в кода: смени ли
 * Мариета настройката, магазинът я следва до минута, без ново разгръщане.
 */
export type ReviewPolicy = {
  /** Приемат ли се отзиви изобщо. */
  enabled: boolean;
  /** Кой може да пише: всички или само купувач на този продукт. */
  condition: 'all' | 'buyer';
  /** Оценка, от която нагоре отзивът излиза веднага. */
  acceptStar: number;
  /** До колко дни след покупката може отзив. 0 = без ограничение. */
  maxDays: number;
};

const CLOSED: ReviewPolicy = {enabled: false, condition: 'all', acceptStar: 5, maxDays: 0};

/* Минута кеш в паметта на изолата.
 *
 * Достатъчно кратко, че промяна от панела да се вижда почти веднага, и
 * достатъчно дълго, че продуктова страница да не пита админа при всяко
 * зареждане. Cloudflare пуска нови изолати често, тоест на практика се пита
 * по-често от веднъж на минута, което е добре за отзивчивостта. */
const POLICY_TTL_MS = 60_000;
let policyCache: {at: number; value: ReviewPolicy} | null = null;

export async function fetchReviewPolicy(
  env: Record<string, string | undefined>,
): Promise<ReviewPolicy> {
  const now = Date.now();
  if (policyCache && now - policyCache.at < POLICY_TTL_MS) return policyCache.value;

  const pat = adminPat(env);
  const origin = adminOrigin(env);
  // Без достъп до админа не твърдим, че е отворено: по-добре формата да не се
  // покаже, отколкото да приема нещо, което после ще бъде отказано.
  if (!pat || !origin) return CLOSED;

  const data = await adminGql<{
    productReviewSettings: {
      isInstalled: boolean;
      isActive: boolean;
      acceptStar: number | null;
      addedReviewsConditions: string | null;
      maxDays: number | null;
    } | null;
  }>(origin, pat, SETTINGS).catch(() => null);

  const s = data?.productReviewSettings;
  const value: ReviewPolicy = s?.isInstalled && s?.isActive
    ? {
        enabled: true,
        condition: s.addedReviewsConditions === 'buyer' ? 'buyer' : 'all',
        // Липсваща стойност значи „нищо не минава без преглед", не обратното.
        acceptStar: typeof s.acceptStar === 'number' ? s.acceptStar : 6,
        maxDays: typeof s.maxDays === 'number' ? s.maxDays : 0,
      }
    : CLOSED;

  policyCache = {at: now, value};
  return value;
}

export type ReviewInput = {
  productId: string;
  name: string;
  rating: number;
  title: string;
  comment: string;
};

/** Ограниченията идват от самото API: заглавие 200, коментар 1000. */
export const REVIEW_LIMITS = {name: 60, title: 200, comment: 1000} as const;

const SETTINGS = `query {
  productReviewSettings {
    isInstalled isActive acceptStar addedReviewsConditions maxDays
  }
}`;

const CREATE = `mutation CreateReview($input: CreateProductReviewInput!) {
  createProductReview(input: $input) { id isApproved }
}`;

const SET_STATUS = `mutation SetStatus($ids: [ID!]!, $status: Int!) {
  changeProductReviewsStatus(ids: $ids, status: $status)
}`;

/**
 * Изчиства и проверява подаденото.
 *
 * Не се доверяваме на нищо от браузъра: полетата се режат до границите на
 * API-то, защото по-дълъг текст не връща грешка, а отрязан запис.
 */
export function cleanReview(raw: Partial<ReviewInput>): ReviewInput | null {
  const productId = String(raw.productId ?? '').trim();
  const name = String(raw.name ?? '').trim().slice(0, REVIEW_LIMITS.name);
  const title = String(raw.title ?? '').trim().slice(0, REVIEW_LIMITS.title);
  const comment = String(raw.comment ?? '').trim().slice(0, REVIEW_LIMITS.comment);
  const rating = Math.round(Number(raw.rating));

  if (!productId) return null;
  if (name.length < 2) return null;
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return null;
  // Заглавието е задължително за API-то; ако човекът не е писал, вземаме
  // първите думи от коментара, вместо да го връщаме с грешка за поле, което
  // формата дори не показва като задължително.
  if (comment.length < 3) return null;
  const finalTitle = title || comment.slice(0, 60);

  return {productId, name, rating, title: finalTitle, comment};
}

/**
 * Номерът на продукта за админското API.
 *
 * Storefront API-то дава `gid://cloudcart/Product/67`, а админското чака `67`.
 */
export function numericProductId(gid: string): string {
  const m = /(\d+)\s*$/.exec(gid);
  return m ? m[1] : gid;
}

/**
 * @param isBuyer - купил ли е този човек точно този продукт. Проверява се от
 *   маршрута, защото само той има достъп до влезлия клиент. Подава се `false`
 *   при непознат посетител.
 */
export async function submitReview(
  env: Record<string, string | undefined>,
  input: ReviewInput,
  isBuyer = false,
): Promise<ReviewOutcome> {
  const pat = adminPat(env);
  const origin = adminOrigin(env);
  if (!pat || !origin) return 'error';

  try {
    const policy = await fetchReviewPolicy(env);
    // Спряно приложение значи, че търговецът не иска отзиви. Не заобикаляме.
    if (!policy.enabled) return 'closed';

    /* Проверката се прави и ТУК, не само в интерфейса.
     *
     * Формата се скрива при „само купувачи", но адресът остава отворен, а
     * админската мутация не знае нищо за тази настройка - тя публикува каквото
     * ѝ подадеш. Тоест без този ред настройката в панела е само козметика. */
    if (policy.condition === 'buyer' && !isBuyer) return 'buyers-only';

    const created = await adminGql<{
      createProductReview: {id: string; isApproved: number} | null;
    }>(origin, pat, CREATE, {
      input: {
        product_id: numericProductId(input.productId),
        user_name: input.name,
        rating: input.rating,
        title: input.title,
        comment: input.comment,
      },
    });

    const id = created?.createProductReview?.id;
    if (!id) return 'error';

    /* Прагът на търговеца, приложен на ръка.
     *
     * `createProductReview` е админска мутация: публикува веднага, каквато и да
     * е оценката. Оставим ли я така, единица от случаен посетител излиза на
     * живо в същата секунда. Затова под прага го сваляме в чакащи.
     *
     * Между създаването и свалянето отзивът е публичен за части от секундата.
     * Приемливо е: алтернативата е да не приемаме отзиви изобщо. */
    const threshold = policy.acceptStar;
    if (input.rating < threshold) {
      const demoted = await adminGql<{changeProductReviewsStatus: unknown}>(
        origin,
        pat,
        SET_STATUS,
        {ids: [id], status: 0},
      );
      // Не успее ли свалянето, отзивът остава публикуван. Логва се, защото
      // това е точно случаят, в който търговецът вижда нещо неодобрено.
      if (!demoted) {
        console.error('отзиви: не успях да сваля', id, 'в чакащи');
        return 'published';
      }
      return 'pending';
    }

    return 'published';
  } catch (error) {
    console.error('отзиви: записването не мина -', (error as Error).message);
    return 'error';
  }
}
