import type {CcPageData} from './analytics';

/**
 * Мостът към СОБСТВЕНАТА аналитика на CloudCart — тази, която пълни таблото
 * в админ панела на търговеца.
 *
 * ⭐ Това е отделно от GTM и от пикселите. `app/lib/analytics.ts` захранва
 * контейнера на клиента (GA4, Google Ads) и Meta/TikTok. Тук е третият
 * получател, за когото дотук не пращахме нищо: самата CloudCart.
 *
 * ## Защо изобщо трябва
 *
 * Класическата тема вдига `user_analytics.min.js` и през него докладва всяко
 * посещение на `cca.cloudcart.com/<id на магазина>`. Nitrogen рисува собствен
 * DOM, значи нищо от това не се случва само — и таблото на CloudCart за този
 * магазин е сляпо от деня на миграцията.
 *
 * ## Договорът — 1:1 от жив класически магазин
 *
 * Разчетено на 20.08.2026 от `visvitalis.bg` (магазин 10383) и `zora.bg` (402),
 * начална + продуктова + категорийна страница:
 *
 * ```html
 * <script src="https://assets.cloudcart.com/sitecp/assetic/js/user_analytics.min.js"></script>
 * <script>
 *   window.CCE = new CCUA({
 *     tracker: new (window.ScribeFetchTracker ? ScribeFetchTracker : ScribeScriptTracker)({
 *       baseUrl: 'https://cca.cloudcart.com/10383'
 *     })
 *   });
 *   if (!CCE.getUuid()) CCE.init({"site":{"language":"bg","currency":"EUR"}});
 * </script>
 * ```
 *
 * и после, според типа страница:
 *
 * ```js
 * CCE.event('updateCustomer', {subscriber_id, type, address:{country:{iso,name}, city:{iso,name}}})
 * CCE.event('homePageView',   {homePageView: {home_id, name}})
 * CCE.event('viewCategory',   {viewCategory: {category_id, name, path:[…]}})
 * CCE.event('viewProduct',    {viewProduct:  {product_id, name, price, discount_price,
 *                                             currency, category, brand, url, type}})
 * ```
 *
 * ⛔ Имената на събитията и на полетата НЕ се преименуват. Сгрешим ли ги,
 * beacon-ът приема заявката мълчаливо (връща `void(0)` на всичко) и таблото
 * остава празно, без нито едно съобщение за грешка.
 *
 * ⚠️ За `search` НЯМА измерен договор — класическата тема не пусна събитие на
 * страницата с търсене при проверката. Затова не пращаме нищо: измислено име
 * би било приет боклук, не данни.
 */

/** Един път за всички: типът страница → име на събитие + име на обвивката. */
const PAGE_EVENTS: Record<string, string> = {
  site_home: 'homePageView',
  category: 'viewCategory',
  product: 'viewProduct',
};

type CCE = {
  getUuid?: () => unknown;
  init?: (payload: Record<string, unknown>) => void;
  event?: (name: string, payload: Record<string, unknown>) => void;
};

const w = () => window as any;

/**
 * PF-018: beacon-ът връща низа `void(0)` с тип `text/html`, а скриптът на
 * CloudCart вика `.json()` върху отговора. Тоест на всяка страница се ражда
 * необработено отхвърляне на обещание.
 *
 * ⚠️ Не е козметично при нас: Clarity брои всяко такова като „script error",
 * а точно този проект вече веднъж прати анализ по фалшива следа заради него.
 * Затова заглушаваме ТОЧНО този подпис и нищо друго — всяка друга грешка си
 * остава видима.
 */
let guarded = false;
function guardPf018() {
  if (guarded) return;
  guarded = true;
  window.addEventListener('unhandledrejection', (e) => {
    const msg = String((e as PromiseRejectionEvent).reason?.message ?? '');
    // Подписът на PF-018 и нищо по-широко: "Unexpected token 'v', "void(0)"…"
    if (msg.includes('void(0)') && /JSON/i.test(msg)) e.preventDefault();
  });
}

/**
 * Вдига скрипта на CloudCart и построява `window.CCE`.
 *
 * Извиква се веднъж. Връща обещание, защото събитията на ПЪРВАТА страница
 * тръгват преди скриптът да се е качил — виж опашката по-долу.
 */
let loading: Promise<CCE | null> | null = null;

export function loadCloudCartAnalytics(storeId: string): Promise<CCE | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (loading) return loading;

  guardPf018();

  loading = new Promise<CCE | null>((resolve) => {
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://assets.cloudcart.com/sitecp/assetic/js/user_analytics.min.js';
    s.onload = () => {
      try {
        const g = w();
        const Tracker = g.ScribeFetchTracker ?? g.ScribeScriptTracker;
        if (!g.CCUA || !Tracker) return resolve(null);
        g.CCE = new g.CCUA({
          tracker: new Tracker({baseUrl: `https://cca.cloudcart.com/${storeId}`}),
        });
        // Точно както класическата тема: `init` само ако още няма uuid.
        if (!g.CCE.getUuid?.()) {
          g.CCE.init({site: {language: 'bg', currency: 'EUR'}});
        }
        resolve(g.CCE as CCE);
      } catch {
        // Счупен скрипт на платформата не бива да вали витрината.
        resolve(null);
      }
    };
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });

  return loading;
}

/**
 * Опашка за събитията, изпреварили скрипта.
 *
 * ⚠️ Същият капан, който вече ни коства `ViewContent` на Meta (виж
 * `pendingMeta` в `analytics.ts`): събитието на първата отворена страница
 * тръгва, преди скриптът да се е качил. Човек, дошъл от реклама, вижда една
 * страница и си тръгва — и точно неговото посещение не се отчиташе.
 */
type Pending = {name: string; payload: Record<string, unknown>};
const pending: Pending[] = [];
const MAX_PENDING = 20;

function send(name: string, payload: Record<string, unknown>) {
  const cce: CCE | undefined = w().CCE;
  if (typeof cce?.event !== 'function') {
    if (pending.length < MAX_PENDING) pending.push({name, payload});
    return;
  }
  try {
    cce.event(name, payload);
  } catch {
    /* платформеният скрипт не бива да вали витрината */
  }
}

/** Вика се, щом `CCE` е готов — изпива каквото се е насъбрало. */
export function flushCloudCartEvents() {
  const queued = pending.splice(0, pending.length);
  for (const p of queued) send(p.name, p.payload);
}

/** Кой е посетителят. Класическата тема го праща на всяка страница. */
export function ccUpdateCustomer(customer: {
  subscriber_id?: number | string | null;
  type?: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
} | null) {
  if (typeof window === 'undefined') return;
  send('updateCustomer', {
    subscriber_id: customer?.subscriber_id ?? null,
    type: customer?.type ?? (customer ? 'customer' : 'guest'),
    // ⚠️ Адресът НАРОЧНО не се измисля. Класическата тема го пълни от
    // геолокацията на платформата, до която витрината няма достъп. Празно
    // поле е честно; изсмукано поле трови отчета по градове.
  });
}

/**
 * Едно посещение на страница, преведено на езика на CloudCart.
 *
 * Източникът е същият `cc_page_data`, който вече пълним за GTM — тоест
 * страниците не пипат нищо, за да проработи това.
 */
export function ccPageView(page: CcPageData) {
  if (typeof window === 'undefined') return;
  const name = PAGE_EVENTS[String(page.type)];
  if (!name) return; // непознат тип (вкл. `search` и `other`) — мълчим нарочно

  const inner: Record<string, unknown> =
    name === 'homePageView'
      ? {home_id: 0, name: String(page.name ?? 'Начална страница')}
      : name === 'viewCategory'
        ? {category_id: page.id ?? null, name: page.name ?? '', path: page.path ?? []}
        : {
            product_id: page.id ?? null,
            name: page.name ?? '',
            price: page.price ?? null,
            discount_price: page.discount_price ?? null,
            currency: page.currency ?? 'EUR',
            category: page.category ?? null,
            brand: page.brand ?? null,
            url: page.url ?? null,
            type: page.product_type ?? 'simple',
          };

  send(name, {[name]: inner});
}
