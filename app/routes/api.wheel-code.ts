import {data} from 'react-router';
import type {Route} from './+types/api.wheel-code';
import {getContext} from '~/lib/context';
import {claimGiftCode, claimWheelCode} from '~/lib/wheel-codes.server';
import {
  WHEEL_GIFTS,
  WHEEL_TIERS,
  type WheelGift,
  type WheelTier,
} from '~/lib/wheel-tiers';
import {isWheelLive} from '~/lib/wheel-schedule';
import {isWheelPreview} from '~/lib/wheel-preview.server';

/**
 * Един промо код за колелото на късмета.
 *
 * Колелото пита оттук в мига, в който тръгне да се върти - не след като спре.
 * Въртенето трае 5,2 s, а заявката ~150 ms, тоест кодът чака готов и клиентът
 * не вижда никакво забавяне.
 *
 * `no-store` е задължителен: всяко извикване трябва да върне различен код, а
 * кеширан отговор би раздал един и същ на всички.
 */

const NO_STORE = {'Cache-Control': 'no-store'};

export async function loader({request, context}: Route.LoaderArgs) {
  const params = new URL(request.url).searchParams;
  const tier = params.get('tier') as WheelTier | null;
  const gift = params.get('gift') as WheelGift | null;

  // Точно едно от двете. И двете наведнъж значи объркан извикващ, а не награда
  // от два вида - по-добре 400, отколкото мълчалив избор кое да пренебрегнем.
  const wantsTier = !!tier && WHEEL_TIERS.includes(tier);
  const wantsGift = !!gift && WHEEL_GIFTS.includes(gift);
  if (wantsTier === wantsGift) {
    return data({code: null}, {status: 400, headers: NO_STORE});
  }

  const what = wantsTier ? `ниво ${tier}` : `подарък ${gift}`;
  const ctx = await getContext(context, request);

  // Спрялото колело не раздава кодове и на заявка отвън: стара отворена
  // страница иначе продължава да черпи от пула след срока. Изключението е
  // пробата с ключ (`?wheel=<ключ>`), с която кампанията се проверява преди
  // да тръгне - виж `wheel-preview.server`.
  if (
    !isWheelLive() &&
    !(await isWheelPreview(request, ctx.env as Record<string, string | undefined>))
  ) {
    return data({code: null}, {status: 410, headers: NO_STORE});
  }

  const env = ctx.env as Record<string, string | undefined>;
  const code = await (
    wantsTier ? claimWheelCode(env, tier!) : claimGiftCode(env, gift!)
  ).catch((err) => {
    // Гълтана грешка тук изглежда точно като изчерпан пул. Логва се, защото
    // разликата между „няма кодове" и „админът отказа" е цялата диагностика.
    console.error(`[wheel] ${what} не даде код:`, err?.message ?? err);
    return null;
  });

  // 503 при празен резултат: колелото различава „няма код" от мрежова грешка
  // само по това, а и двете водят до един и същ изход - покана да опита пак.
  return data({code}, {status: code ? 200 : 503, headers: NO_STORE});
}
