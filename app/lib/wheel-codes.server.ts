import {adminGql, adminOrigin, adminPat} from './admin-api.server';
import {
  WHEEL_GIFTS,
  WHEEL_TIERS,
  type WheelGift,
  type WheelTier,
} from './wheel-tiers';

/**
 * Раздаване на еднократен промо код за колелото на късмета.
 *
 * Дотук колелото носеше три твърдо закодирани купона. Кодовете им стояха в
 * клиентския бъндъл - всеки можеше да ги прочете от `root-*.js` и да ги
 * разпространи, а самите кодове бяха без лимит на употребите. Трите събраха 92
 * поръчки от 8 кода.
 *
 * Сега всяко ниво има свой пул от 7 000 кода с `max_uses: 1`. Пулът НЕ може да
 * влезе в бъндъла - това би било същата слабост, умножена по 7 000. Затова
 * кодът се тегли тук, на сървъра, и до клиента стига само неговият собствен.
 *
 * КАК се стига до случаен код измежду 7 000 с една заявка: курсорът на
 * `discountCodeProCodes` е base64 от поредния номер (`MQ==` = 1), тоест `after`
 * приема произволна позиция. Проверено на живо на 18.08: скок на 3 500 и на
 * 6 900 връща различни кодове за ~150 ms, подредбата между две заявки е
 * еднаква, страниците не се застъпват, а към края сървърът сам се прибира до
 * последната пълна страница.
 *
 * ЗАЩО СЕ МАРКИРА: `uses` расте чак когато клиентът поръча. Раздаден, но още
 * неизползван код изглежда съвсем свободен и се пада втори път - при 400
 * завъртания на ниво това са около десет двойки клиенти с един и същ код.
 * Затова раздаденият код получава маркер в `name` и повече не се предлага.
 *
 * Маркирането минава през `updateCodeProCode`, който иска `conditions` като
 * ЗАДЪЛЖИТЕЛНО поле, тоест записът е пълна замяна. Списъчната заявка връща
 * условията и групите КУХИ, затова данните за обратния запис се четат с
 * `discountCodeProCode` - единичната заявка е единствената, която ги носи
 * пълни. Съставен от списъка, записът би изтрил процента от кода. Проверено на
 * 18.08 върху нарочно създаден и после изтрит код: условия, групи, лимити и
 * дати оцеляват, променя се само `name`.
 *
 * SERVER ONLY: `.server.ts` пази PAT-а извън клиентския бъндъл.
 */

export {WHEEL_TIERS, WHEEL_GIFTS};
export type {WheelTier, WheelGift};

/** Кампаниите с по 7 000 еднократни кода (bulgarbiotic.bg, 18.08.2026). */
const POOL: Record<WheelTier, string> = {'5': '700', '10': '702', '15': '705'};

/** Кампаниите със 100% кодове за подаръците, по 700 всяка (27.08.2026).
 *  Ключът е ID-то на продукта, стойността - ID-то на кампанията. */
const GIFT_POOL: Record<WheelGift, string> = {
  '147': '706', // Детска книжка за оцветяване
  '145': '709', // Мини опаковка пробиотични таблетки за смучене
  '131': '712', // Химикал Bactology
  '134': '713', // Формула за сияйна и еластична кожа
  '129': '715', // Хавлия Bactology
};

/** Колкото се дърпат наведнъж. Сто е таванът, който API-то дава без спор. */
const PAGE = 100;
/** Опити с различна позиция, ако страницата се окаже изцяло раздадена. */
const ATTEMPTS = 4;
/** Броят кодове не мърда в рамките на кампанията; десет минути стигат. */
const TOTAL_TTL_MS = 10 * 60_000;
/** Началото на `name` при раздаден код. Истинските имена са самите кодове. */
const MARK = '#taken';

type Row = {
  id: string;
  code: string;
  name: string | null;
  uses: number | null;
  maxUses: number | null;
  active: boolean;
};

/** Живее в изолата - обикновен кеш, не състояние, на което се разчита. */
const totals = new Map<string, {value: number; at: number}>();

const COUNT_QUERY = `query WheelCodeCount($id: ID!) {
  discountCodeProCodes(discountId: $id, first: 1) { totalCount }
}`;

const PAGE_QUERY = `query WheelCodePage($id: ID!, $first: Int!, $after: String) {
  discountCodeProCodes(discountId: $id, first: $first, after: $after) {
    edges { node { id code name uses maxUses active } }
  }
}`;

/** Пълните полета на един код - само единичната заявка ги носи неокастрени.
 *
 *  🚨 `product`, `category`, `vendor` и `selection` НЕ са украса. Кодовете за
 *  подаръците са условие „100% върху продукт 147", а записът обратно е пълна
 *  замяна: не се ли прочете продуктът, маркирането го изтрива и кодът остава
 *  100% отстъпка без вързан продукт. За купоните полетата са празни и не
 *  пречат, затова липсата им не си личеше, докато пуловете бяха само три. */
const CODE_FIELDS = `id code name active uses maxUses maxusedUser customerGroups
  dateStart dateEnd codeApply applyRegularPrice onlyCustomer geoZoneId
  conditions { type setting value orderOver forceSave
    product { id } category { id } vendor { id } selection { id } }`;

const READ_QUERY = `query WheelCodeDetail($discountId: ID!, $codeId: ID!) {
  discountCodeProCode(discountId: $discountId, codeId: $codeId) { ${CODE_FIELDS} }
}`;

const MARK_MUTATION = `mutation WheelCodeMark($discountId: ID!, $codeId: ID!, $input: CodeProInput!) {
  updateCodeProCode(discountId: $discountId, codeId: $codeId, input: $input) { id name }
}`;

/** Курсорът е base64 от поредния номер; нула значи „от началото". */
function cursorAt(offset: number): string | null {
  return offset > 0 ? btoa(String(offset)) : null;
}

function isTaken(name: string | null | undefined): boolean {
  return typeof name === 'string' && name.startsWith(MARK);
}

/** Целите на едно условие обратно към вход: API-то ги чете като обекти, а ги
 *  приема като списък от ID-та. */
function ids(list: Array<{id: string}> | null | undefined): string[] {
  return Array.isArray(list) ? list.map((x) => x.id) : [];
}

function isAvailable(row: Row): boolean {
  if (!row?.code || !row.active || isTaken(row.name)) return false;
  if (row.maxUses == null) return true;
  return (row.uses ?? 0) < row.maxUses;
}

async function poolSize(origin: string, pat: string, discountId: string): Promise<number> {
  const hit = totals.get(discountId);
  if (hit && Date.now() - hit.at < TOTAL_TTL_MS) return hit.value;

  const res = await adminGql<any>(origin, pat, COUNT_QUERY, {id: discountId});
  const value = Number(res?.discountCodeProCodes?.totalCount ?? 0);
  if (value > 0) totals.set(discountId, {value, at: Date.now()});
  return value;
}

/**
 * Отбелязва кода като раздаден.
 *
 * Всичко прочетено се връща обратно непокътнато - записът е пълна замяна и
 * пропуснато поле значи изтрито поле. Променя се единствено `name`.
 */
async function markClaimed(
  origin: string,
  pat: string,
  discountId: string,
  codeId: string,
): Promise<boolean> {
  const current = (await adminGql<any>(origin, pat, READ_QUERY, {discountId, codeId}))
    ?.discountCodeProCode;
  // Без пълните условия няма как да се запише безопасно - по-добре нищо.
  if (!current?.code || !Array.isArray(current.conditions) || !current.conditions.length) {
    return false;
  }

  const input = {
    code: current.code,
    name: `${MARK} ${new Date().toISOString()}`,
    date_start: current.dateStart,
    date_end: current.dateEnd,
    active: current.active,
    code_apply: current.codeApply,
    apply_regular_price: current.applyRegularPrice,
    only_customer: current.onlyCustomer,
    geo_zone_id: current.geoZoneId,
    max_uses: current.maxUses,
    maxused_user: current.maxusedUser,
    customer_groups: current.customerGroups,
    conditions: current.conditions.map((c: any) => ({
      type: c.type,
      setting: c.setting,
      value: c.value,
      order_over: c.orderOver,
      force_save: c.forceSave,
      // Целите на условието се връщат такива, каквито бяха. Пропуснат `product`
      // значи изтрит `product`, а с него си отива и смисълът на кода.
      product: ids(c.product),
      category: ids(c.category),
      vendor: ids(c.vendor),
      selection: ids(c.selection),
    })),
  };

  const res = await adminGql<any>(origin, pat, MARK_MUTATION, {discountId, codeId, input});
  return isTaken(res?.updateCodeProCode?.name);
}

/**
 * Един нераздаден код от даден пул, или `null`, ако нищо не се намери.
 *
 * Извикващият третира `null` като „не давай награда" - клиентът получава
 * покана да опита пак, вместо код, който няма да сработи.
 *
 * `label` влиза само в предупрежденията: когато нещо се обърка, разликата между
 * „ниво 10" и „подарък 147" е цялата диагностика.
 */
async function claimFromPool(
  env: Record<string, string | undefined> | undefined,
  discountId: string | undefined,
  label: string,
): Promise<string | null> {
  const origin = adminOrigin(env);
  const pat = adminPat(env);
  if (!discountId || !origin || !pat) return null;

  const total = await poolSize(origin, pat, discountId);
  if (!total) return null;

  // Най-голямата позиция, която още връща пълна страница.
  const highest = Math.max(0, total - PAGE);

  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const offset = Math.floor(Math.random() * (highest + 1));
    const res = await adminGql<any>(origin, pat, PAGE_QUERY, {
      id: discountId,
      first: PAGE,
      after: cursorAt(offset),
    });

    const free: Row[] = (res?.discountCodeProCodes?.edges ?? [])
      .map((edge: {node: Row}) => edge?.node)
      .filter(Boolean)
      .filter(isAvailable);
    if (!free.length) continue;

    const chosen = free[Math.floor(Math.random() * free.length)];
    const marked = await markClaimed(origin, pat, discountId, chosen.id).catch(() => false);
    // Кодът се дава и когато маркирането падне: клиентът е спечелил и не бива
    // да остане без награда заради една неуспяла заявка към админа. Цената е,
    // че точно този код може да се падне още веднъж.
    if (!marked) {
      console.warn(`[wheel] кодът ${chosen.code} се раздаде без маркер (${label})`);
    }
    return chosen.code;
  }

  return null;
}

/** Код за процентна награда (-5 / -10 / -15). */
export function claimWheelCode(
  env: Record<string, string | undefined> | undefined,
  tier: WheelTier,
): Promise<string | null> {
  return claimFromPool(env, POOL[tier], `ниво ${tier}`);
}

/**
 * 100% код за спечелен подарък.
 *
 * Върви по същия път като купоните нарочно: един пул, случайна позиция,
 * маркиране на раздадения. Разликата е само коя кампания се чете. Така
 * поправка в тегленето важи и за двете, вместо да се дублира логика, която
 * после се разминава.
 */
export function claimGiftCode(
  env: Record<string, string | undefined> | undefined,
  gift: WheelGift,
): Promise<string | null> {
  return claimFromPool(env, GIFT_POOL[gift], `подарък ${gift}`);
}
