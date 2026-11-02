import {useEffect, useMemo, useRef, useState} from 'react';
import {rememberPromo} from '../PendingPromo';
import {useFetcher, useFetchers} from 'react-router';
import {CART_ACTION} from '~/lib/cart-action';
import type {WheelGift, WheelTier} from '~/lib/wheel-tiers';
import {claimOverlay, releaseOverlay} from '~/lib/overlay-lock';
import {CROSS_SELL_FETCHER_KEY} from '~/components/CrossSellPopup';

const FETCHER_KEY = 'lucky-wheel';

/**
 * Колело на късмета — Nitrogen версия.
 *
 * Пали се, когато клиентът добави продукт в количката (от продуктова страница
 * или от листинг). Засича се през `useFetchers()`: гледа се всяко ЧУЖДО
 * подаване към действието на количката. Тук пишеше, че спусъкът е събитие
 * `bb:cart-changed` - такова събитие няма никъде в кода.
 * Показва се веднъж на клиент; ако бъде затворено без завъртане, има още един
 * шанс при следващо добавяне; след втори отказ спира.
 *
 * Награда:
 *   • продукт → добавя се в количката и веднага се прилага 100% промо код
 *   • процентна отстъпка → кодът се прилага автоматично
 * И двете минават през action-а на /cart (ADD_TO_CART / APPLY_DISCOUNT), тоест
 * през същия път, по който върви и обикновеното пазаруване.
 *
 * Портната версия за стандартната тема е в друго репо; тук няма нищо общо с
 * /cart/add, /cart/compact или jQuery — в Nitrogen тези неща не съществуват.
 */

const K_SPUN = 'lw_spun';
const K_DISMISS = 'lw_dismiss';
const MAX_DISMISSALS = 2;
const SPIN_MS = 5200;
const OPEN_DELAY_MS = 900;

type Sector = {
  /** Надписът върху сектора. За безплатните продукти е ОБЩ: кой е продуктът,
   *  се разкрива чак след спирането (клиент, 26.08.2026). */
  label: string;
  bg: string;
  /** Колко често се пада секторът. Сборът на теглата е 100, тоест теглото се
   *  чете направо като процент от завъртанията. */
  weight: number;
  /** купон: нивото, чийто пул дава кода; самият код идва от сървъра */
  tier?: WheelTier;
};

type FreeProduct = {
  /** Само за четене от хора - на колелото това име не се показва. */
  name: string;
  /** gid://cloudcart/ProductVariant/<id> - с това се добавя в количката */
  merchandiseId: string;
  /** ID-то на ПРОДУКТА: с него сървърът намира пула със 100% кодове.
   *  Тук няма код - той се тегли при завъртането, както при купоните. */
  gift: WheelGift;
  /** Тегло ВЪТРЕ в безплатните продукти; сборът им също е 100. */
  weight: number;
  /** Редът, с който продуктът се разкрива след спирането. */
  wonText: string;
};

/** Общият надпис на секторите с подарък (клиент, 26.08: „Продукт изненада"). */
const FREE_LABEL = 'Продукт\nизненада';

/* 11 сектора: 3 × „Безплатен продукт" + 8 купона (по 4 на -5% и -10%),
   както поиска клиентът на 26.08. Продуктовите стоят на 0, 4 и 8, тоест през
   равни разстояния, а еднаквите купони не се залепват един до друг.

   Теглата тук са РАВНИ, тоест шансът е точно колкото се вижда: 3 от 11
   сектора = 27,3% безплатен продукт и по 36,4% на всяко ниво отстъпка. Ако
   клиентът поиска друго съотношение, менят се само числата - например
   „продуктите да са 10% общо" значи 10/3 на продуктовите и 90/8 на купонните.

   Цветовете са стълбица от #E3166C, смесено с бяло от 95% до 35%. */
const SECTORS: Sector[] = [
  {label: FREE_LABEL, bg: '#FEF3F8', weight: 1},
  {label: '-5%', bg: '#FCE5EF', weight: 1, tier: '5'},
  {label: '-10%', bg: '#FAD7E6', weight: 1, tier: '10'},
  {label: '-5%', bg: '#F9C9DD', weight: 1, tier: '5'},
  {label: FREE_LABEL, bg: '#F7BBD4', weight: 1},
  {label: '-10%', bg: '#F5ADCC', weight: 1, tier: '10'},
  {label: '-5%', bg: '#F49FC3', weight: 1, tier: '5'},
  {label: '-10%', bg: '#F291BA', weight: 1, tier: '10'},
  {label: FREE_LABEL, bg: '#F084B1', weight: 1},
  {label: '-5%', bg: '#EE76A8', weight: 1, tier: '5'},
  {label: '-10%', bg: '#ED689F', weight: 1, tier: '10'},
];

/* Кой подарък се пада, щом колелото спре на „Безплатен продукт".
   Списъкът и теглата са по клиента (26.08): сборът е 100, тоест теглото се
   чете направо като процент ВЪТРЕ в безплатните завъртания.

   От 27.08 и петте участват: всеки си има кампания със 700 еднократни 100%
   кода, а кодът се тегли от сървъра в мига на завъртането. Дотогава двата нови
   подаръка стояха с празен код и се прескачаха, тоест теглата се преизчисляваха
   сами на 50/40/10 върху другите три. */
const FREE_PRODUCTS: FreeProduct[] = [
  {
    name: 'Химикал Bactology',
    merchandiseId: 'gid://cloudcart/ProductVariant/227',
    gift: '131',
    weight: 25,
    wonText: '🎉 Спечели: Химикал, който вече е\nДобавен в количката - безплатно!',
  },
  {
    name: 'Детска книжка за оцветяване',
    merchandiseId: 'gid://cloudcart/ProductVariant/252',
    gift: '147',
    weight: 30,
    wonText:
      '🎉 Спечели: Детска книжка за оцветяване, която вече е\nДобавена в количката - безплатно!',
  },
  {
    name: 'Мини опаковка пробиотични таблетки за смучене',
    merchandiseId: 'gid://cloudcart/ProductVariant/250',
    gift: '145',
    weight: 20,
    wonText:
      '🎉 Спечели: Мини опаковка таблетки за смучене, която вече е\nДобавена в количката - безплатно!',
  },
  {
    name: 'Формула за сияйна кожа',
    merchandiseId: 'gid://cloudcart/ProductVariant/230',
    gift: '134',
    weight: 20,
    wonText:
      '🎉 Спечели: Формулата за сияйна кожа, която вече е\nДобавена в количката - безплатно!',
  },
  {
    name: 'Хавлия Bactology',
    merchandiseId: 'gid://cloudcart/ProductVariant/225',
    gift: '129',
    weight: 5,
    wonText: '🎉 Спечели: Хавлия, която вече е\nДобавена в количката - безплатно!',
  },
];

const SEG = 360 / SECTORS.length;

/** Подаръците, които могат да се раздават.
 *
 *  Досега тук се филтрираше по наличие на код в реда. Кодовете вече не живеят в
 *  бъндъла, а се теглят от сървъра, тоест филтърът няма какво да провери:
 *  липсващ код се хваща при завъртането и завъртането не се изгаря. Функцията
 *  остава като едно място, през което минава изборът - тегло 0 изважда ред. */
function usableProducts(): FreeProduct[] {
  return FREE_PRODUCTS;
}

/** Тегли ред по тегло. Тегло 0 или по-малко изважда реда от играта. */
function pickByWeight<T extends {weight: number}>(items: T[]): T {
  const pool = items.filter((i) => i.weight > 0);
  const list = pool.length ? pool : items;
  const total = list.reduce((sum, i) => sum + Math.max(i.weight, 0), 0);
  if (total <= 0) return list[0];
  let r = Math.random() * total;
  for (const item of list) {
    r -= Math.max(item.weight, 0);
    if (r < 0) return item;
  }
  return list[list.length - 1];
}

function readInt(key: string) {
  try {
    return parseInt(localStorage.getItem(key) || '0', 10) || 0;
  } catch {
    return 0;
  }
}
function hasSpun() {
  try {
    return !!localStorage.getItem(K_SPUN);
  } catch {
    return false;
  }
}
function mayShow(preview: boolean) {
  // В режим за проба колелото се показва винаги: иначе първата проба изяжда
  // единственото завъртане и следващата вече не се отваря.
  if (preview) return true;
  return !hasSpun() && readInt(K_DISMISS) < MAX_DISMISSALS;
}

/** Ключът за проба от адреса (`?wheel=<ключ>`), ако го има.
 *
 *  Кой има право на проба, решава СЪРВЪРЪТ: ключът се проверява в root loader-а
 *  и в endpoint-а за кодове (`wheel-preview.server`). Тук стойността само се
 *  прочита и се подава нататък - иначе всеки, който види параметъра в адресната
 *  лента, би могъл да си вади безплатни продукти след края на кампанията.
 *  ⚠️ Купонният код при проба е истински: всяко такова завъртане изважда един
 *  код от пула. */
function previewKeyFromUrl(): string {
  try {
    return new URLSearchParams(window.location.search).get('wheel') ?? '';
  } catch {
    return '';
  }
}

/** `&open=1` - отваря колелото веднага, без да се чака добавяне в количката.
 *
 *  По подразбиране пробата върви като при истински клиент: пали се СЛЕД
 *  добавяне в количката. Иначе човекът, който проверява, вижда поведение,
 *  каквото посетителите никога няма да получат. Мигновеното отваряне остава
 *  само за бърз оглед на самото колело. */
function autoOpenFromUrl(): boolean {
  try {
    return new URLSearchParams(window.location.search).get('open') === '1';
  } catch {
    return false;
  }
}

export function LuckyWheel({live = true}: {live?: boolean}) {
  const [open, setOpen] = useState(false);
  /* Пробата се чете СЛЕД монтирането: на сървъра адресът на браузъра го няма,
     а разлика между двата рендера чупи хидратацията. */
  const [previewKey, setPreviewKey] = useState('');
  const [autoOpen, setAutoOpen] = useState(false);
  const preview = previewKey !== '';
  const [spinning, setSpinning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const openRef = useRef(false);
  const fetcher = useFetcher({key: FETCHER_KEY});
  const fetchers = useFetchers();
  const pendingCode = useRef<string | null>(null);
  /** Кой безплатен продукт е спечелен: решава се при завъртането, показва се
   *  при спирането. Един и същ обект стига и до текста, и до количката. */
  const wonProduct = useRef<FreeProduct | null>(null);
  /** Заявката за купонния код: тръгва при завъртане, чака се при спиране. */
  const codeRequest = useRef<Promise<string | null> | null>(null);
  const wasAdding = useRef(false);
  const toastTimer = useRef<number | undefined>(undefined);

  openRef.current = open;
  /* Само сървърът пали колелото: `live` вече е вярно и когато заявката носи
     валиден ключ за проба. Параметърът сам по себе си не отваря нищо. */
  const enabled = live;

  useEffect(() => {
    setPreviewKey(previewKeyFromUrl());
    setAutoOpen(autoOpenFromUrl());
  }, []);

  /* Мигновено отваряне САМО с `&open=1`: без него пробата минава по същия
     път като при клиент - добавяне в количката, после колелото. */
  useEffect(() => {
    if (preview && live && autoOpen) setOpen(true);
  }, [preview, live, autoOpen]);

  /* Засичане на добавяне в количката: всеки ЧУЖД fetcher към адреса на
     количката с ADD_TO_CART. Нашият собствен (за наградата) се изключва по
     ключ, за да не се самозапали колелото. */
  const someoneAdding = fetchers.some(
    (f) =>
      f.key !== FETCHER_KEY &&
      // Продукт от кръстосаната оферта е отговор на прозорец - не пали втори.
      f.key !== CROSS_SELL_FETCHER_KEY &&
      f.formAction === CART_ACTION &&
      f.formData?.get('action') === 'ADD_TO_CART',
  );

  useEffect(() => {
    if (!enabled) return;
    if (someoneAdding) {
      wasAdding.current = true;
      return;
    }
    if (!wasAdding.current) return;
    wasAdding.current = false;
    if (!mayShow(preview) || openRef.current) return;
    const t = window.setTimeout(() => {
      // Кръстосаната оферта е излязла първа - колелото чака следващо добавяне.
      if (!openRef.current && claimOverlay('wheel')) setOpen(true);
    }, OPEN_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [someoneAdding]);

  // Заключваме скролването на страницата, докато прозорецът е отворен + ESC.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, finished]);

  /* Щом продуктът-награда влезе в количката, прилагаме неговия 100% код.
     Редът е задължителен - код преди продукта не важи за нищо. */
  /* Щом продуктът-награда влезе в количката, прилагаме неговия 100% код. */
  useEffect(() => {
    if (fetcher.state !== 'idle' || !fetcher.data) return;
    const code = pendingCode.current;
    if (!code) return;
    pendingCode.current = null;
    // Кодът за спечеления продукт се добавя към вече приложените, а не ги
    // заменя: списъкът с кодове се подменя целият при всяко подаване.
    const existing = (((fetcher.data as any)?.cart?.discountCodes ?? []) as Array<{code: string}>)
      .map((d) => d.code)
      .filter(Boolean);
    const body = new FormData();
    body.append('action', 'APPLY_DISCOUNT');
    for (const c of new Set([...existing, code])) body.append('code', c);
    fetcher.submit(body, {method: 'post', action: CART_ACTION});
    showToast('Промо кодът е добавен в количката');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.state, fetcher.data]);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  function showToast(text: string) {
    setToast(text);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4200);
  }

  function close() {
    // Затваряне БЕЗ завъртане = отказ. Второто спира колелото завинаги.
    if (!finished && !preview) {
      try {
        localStorage.setItem(K_DISMISS, String(readInt(K_DISMISS) + 1));
      } catch {
        /* частен режим — просто няма да се запомни */
      }
    }
    setOpen(false);
    releaseOverlay('wheel');
  }

  /** Сектор по тегло. Връща индекс, защото колелото спира по номер. */
  function pick() {
    const total = SECTORS.reduce((sum, sec) => sum + Math.max(sec.weight, 0), 0);
    if (total <= 0) return Math.floor(Math.random() * SECTORS.length);
    let r = Math.random() * total;
    for (let i = 0; i < SECTORS.length; i++) {
      r -= Math.max(SECTORS[i].weight, 0);
      if (r < 0) return i;
    }
    return SECTORS.length - 1;
  }

  function spin() {
    if (spinning || finished) return;
    setSpinning(true);

    const idx = pick();
    // Продуктът се тегли още сега, за да е едно и също това, което ще се
    // покаже, и това, което влиза в количката.
    const tier = SECTORS[idx].tier;
    const prize = tier ? null : pickByWeight(usableProducts());
    wonProduct.current = prize;
    // Кодът се иска СЕГА, докато колелото се върти: заявката трае под секунда
    // срещу 5,2 s въртене, тоест до спирането отговорът вече чака. Важи и за
    // подаръците - техните 100% кодове също идват от пул на сървъра.
    codeRequest.current = tier
      ? requestCode({tier})
      : requestCode({gift: prize!.gift});

    const mid = idx * SEG + SEG / 2;
    setRotation((prev) => {
      const current = ((prev % 360) + 360) % 360;
      const wanted = (360 - mid) % 360;
      return prev + 360 * 6 + (((wanted - current) % 360) + 360) % 360;
    });

    window.setTimeout(() => settle(idx), SPIN_MS + 300);
  }

  /**
   * Кодът за купона се тегли от сървъра - в бъндъла няма нито един.
   *
   * Пулът е 7 000 еднократни кода на ниво и раздаденият се отбелязва в админа,
   * за да не се падне на втори човек. Подробностите са в `wheel-codes.server`.
   */
  async function requestCode(
    what: {tier: WheelTier; gift?: never} | {gift: WheelGift; tier?: never},
  ): Promise<string | null> {
    try {
      // Ключът за проба пътува и до endpoint-а: спряло колело не раздава
      // кодове на никого без него.
      const which = what.tier ? `tier=${what.tier}` : `gift=${what.gift}`;
      const url = previewKey
        ? `/api/wheel-code?${which}&wheel=${encodeURIComponent(previewKey)}`
        : `/api/wheel-code?${which}`;
      const res = await fetch(url, {
        headers: {Accept: 'application/json'},
      });
      if (!res.ok) return null;
      const body = (await res.json()) as {code?: string | null};
      return body?.code || null;
    } catch {
      return null;
    }
  }

  function markSpun() {
    // Пробата не изгаря завъртането - иначе се тества само веднъж.
    if (preview) return;
    try {
      localStorage.setItem(K_SPUN, '1');
    } catch {
      /* частен режим */
    }
  }

  async function settle(idx: number) {
    const p = SECTORS[idx];
    setSpinning(false);

    // Наградата чака своя код преди всичко останало: без код няма награда, а
    // тогава завъртането не бива да се отбелязва като изразходвано - иначе
    // човекът остава и без нея, и без право на второ завъртане.
    //
    // Важи еднакво за купон и за подарък. При подарък цената на пропуска е
    // по-висока: продукт, добавен без своя 100% код, влиза в количката на пълна
    // цена веднага след надписа „спечели безплатно".
    const code = await (codeRequest.current ?? Promise.resolve(null));
    codeRequest.current = null;

    if (!code) {
      wonProduct.current = null;
      setFailed(true);
      setResult('Наградата не успя да се подготви.\nЗатвори прозореца и опитай пак след малко.');
      return;
    }

    setFinished(true);
    markSpun();

    if (!p.tier) {
      // Ето тук се разкрива кой е продуктът: на колелото пишеше само
      // „Продукт изненада".
      //
      // Продуктът е ТОЧНО този, за когото е изтеглен кодът. Тук стоеше резерва
      // „избери наново, ако липсва" - тя стана опасна в мига, в който кодът
      // спря да е закован в реда: нов избор значи 100% код за продукт А върху
      // продукт Б, тоест подаръкът влиза в количката на пълна цена. По-добре
      // никаква награда, отколкото грешната.
      const prize = wonProduct.current;
      wonProduct.current = null;
      if (!prize) {
        setFinished(false);
        setFailed(true);
        setResult('Наградата не успя да се подготви.\nЗатвори прозореца и опитай пак след малко.');
        return;
      }
      setResult(prize.wonText);
      // Редът е задължителен: продуктът първо, кодът след него. Код върху
      // количка без своя продукт не важи за нищо.
      pendingCode.current = code;
      fetcher.submit(
        {action: 'ADD_TO_CART', merchandiseId: prize.merchandiseId, quantity: '1'},
        {method: 'post', action: CART_ACTION},
      );
      return;
    }

    // Кодът се запомня ВИНАГИ. Прилагането върху празна количка минава без
    // грешка, но не се запазва (проверено срещу живото API), а при завъртане
    // количката почти винаги е празна - затова спечеленият код изчезваше.
    // `PendingPromo` го слага при първото добавяне на продукт.
    rememberPromo(code!);
    fetcher.submit(
      {action: 'APPLY_DISCOUNT', code: code!},
      {method: 'post', action: CART_ACTION},
    );
    // Показва се с главни букви, а се прилага точно както стои в базата:
    // кодовете се пазят със смесен регистър (`pvebCz`) и само точният низ е
    // сигурен за автоматичното прилагане.
    const shown = code!.toUpperCase();
    setResult(
      `🎉 Спечели: ${p.label} отстъпка\nКодът ${shown} е запазен и ще се приложи в количката ти.`,
    );
    showToast(`Промо код ${shown} е запазен за поръчката ти`);
  }

  const gradient = useMemo(
    () =>
      SECTORS.map(
        (p, i) => `${p.bg} ${i * SEG}deg ${(i + 1) * SEG}deg`,
      ).join(', '),
    [],
  );

  if (!open && !toast) return null;

  return (
    <>
      {open && (
        <div
          className="lw-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lw-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="lw-card">
            <button
              type="button"
              className="lw-close"
              onClick={close}
              aria-label="Затвори"
            >
              ×
            </button>

            <h2 id="lw-title" className="lw-title">
              Завърти и спечели!
            </h2>
            <p className="lw-sub">
              Всяко завъртане носи награда, която добавяме в количката ти:
            </p>

            <div className="lw-wrap">
              <div className="lw-pointer" />
              <div
                className="lw-wheel"
                style={{
                  background: `conic-gradient(${gradient})`,
                  transform: `rotate(${rotation}deg)`,
                }}
              >
                {SECTORS.map((p, i) => {
                  /* Етикетът е завъртян на mid, колелото спира на (360 − mid) →
                     печелившият надпис застава изправен под стрелката. */
                  const mid = i * SEG + SEG / 2;
                  const rad = (mid * Math.PI) / 180;
                  /* Надписът „Безплатен продукт" е завъртян на 90° надясно
                     спрямо процентите (клиент, 26.08): чете се по радиуса, а
                     не напречно на него. Процентите са къси и остават както
                     са били. */
                  const isFree = p.label === FREE_LABEL;
                  const turn = isFree ? 90 : 0;
                  /* Завъртян на 90°, надписът ляга ПО радиуса, тоест дългата му
                     страна вече заема място навън, а не напречно. При 14px
                     „Продукт изненада" опира ръба на колелото, затова слиза с
                     една степен. Мястото (32% от ширината) е същото като на
                     процентите - изместен навън, надписът лягаше върху канта.
                     Проверено по четирите ъгъла на текста: радиус 94..156 при
                     главина 52 и ръб 203. */
                  const at = 32;
                  return (
                    <div
                      key={i}
                      className="lw-label"
                      style={{
                        left: `${50 + at * Math.sin(rad)}%`,
                        top: `${50 - at * Math.cos(rad)}%`,
                        transform: `translate(-50%,-50%) rotate(${mid + turn}deg)`,
                        ...(isFree ? {fontSize: 'clamp(9px,2.5vw,12px)'} : null),
                      }}
                    >
                      {p.label.split('\n').map((line, j) => (
                        <span key={j}>
                          {line}
                          {j === 0 && p.label.includes('\n') ? <br /> : null}
                        </span>
                      ))}
                    </div>
                  );
                })}
              </div>
              <div className="lw-hub">
                {/* Логото на марката в средата (клиент, 13.08).
                    Дотук тук стоеше само розовата бактерия - тя е част от
                    логото, но не е логото. Сега е самата словна марка.

                    Взима се SVG-то, а не растер: кръгчето мени големината си
                    според колелото (`--lw-size`), а буквите трябва да остават
                    остри на всяка от тях. Марката е широка и ниска, затова
                    `object-fit: contain` я вписва по ширина. */}
                <img src="/logo.svg" alt="Bactology" width={200} height={80} />
              </div>
            </div>

            <button
              type="button"
              className="lw-spin"
              disabled={spinning}
              onClick={() => (finished ? close() : spin())}
            >
              {finished ? 'ЗАТВОРИ' : 'ЗАВЪРТИ КОЛЕЛОТО'}
            </button>

            {result && (
              <div className="lw-result" role="status" aria-live="polite">
                {result.split('\n').map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
                {!failed && (
                  <a href="/cart" className="lw-tocart">
                    КЪМ КОЛИЧКАТА
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className="lw-toast" role="status" aria-live="polite">
          <span className="lw-toast-tick">✓</span>
          <span>{toast}</span>
        </div>
      )}

      <style>{`
        .lw-overlay{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;
          justify-content:center;background:rgba(13,43,107,.55);padding:16px}
        .lw-card{background:linear-gradient(#fff,#fff2f8);border-radius:18px;max-width:520px;
          width:100%;padding:22px 22px 24px;position:relative;text-align:center;
          box-shadow:0 20px 60px rgba(0,0,0,.35);box-sizing:border-box}
        .lw-close{position:absolute;top:10px;right:14px;border:0;background:none;font-size:26px;
          line-height:1;cursor:pointer;color:#e3166c}
        .lw-title{font-size:24px;font-weight:800;color:#e3166c;margin:2px 0 6px;line-height:1.15}
        .lw-sub{font-size:14px;color:#0d2b6b;margin:0 0 14px}
        .lw-wrap{--lw-size:min(406px,88vw);position:relative;width:var(--lw-size);
          height:var(--lw-size);margin:8px auto 14px}
        .lw-pointer{position:absolute;top:-12px;left:50%;transform:translateX(-50%);z-index:5;
          width:0;height:0;border-left:15px solid transparent;border-right:15px solid transparent;
          border-top:24px solid #e3166c}
        .lw-wheel{width:100%;height:100%;border-radius:50%;border:9px solid #0d2b6b;
          box-sizing:border-box;position:relative;overflow:hidden;
          transition:transform ${SPIN_MS / 1000}s cubic-bezier(.17,.67,.2,1)}
        .lw-label{position:absolute;font-weight:800;font-size:clamp(11px,3vw,14px);
          white-space:pre;color:#0d2b6b;text-align:center;line-height:1.12}
        .lw-hub{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:4;
          width:calc(var(--lw-size)*.255);height:calc(var(--lw-size)*.255);border-radius:50%;
          background:#fff;border:3px solid #e3166c;display:flex;align-items:center;
          justify-content:center;overflow:hidden;padding:9px 7px;box-sizing:border-box}
        .lw-hub img{width:100%;height:100%;object-fit:contain}
        .lw-spin{width:100%;padding:14px;border:0;border-radius:25px;background:#e3166c;
          color:#fff;font-size:16px;font-weight:800;cursor:pointer;font-family:inherit}
        .lw-spin:disabled{opacity:.55;cursor:default}
        .lw-result{margin-top:12px;font-weight:800;color:#e3166c;font-size:14px;line-height:1.4}
        .lw-tocart{display:inline-block;margin-top:8px;padding:9px 16px;border-radius:20px;
          background:#0d2b6b;color:#fff;font-size:13px;font-weight:700;text-decoration:none}
        .lw-tocart:hover{text-decoration:none;color:#fff}
        .lw-toast{position:fixed;z-index:100000;right:20px;bottom:20px;max-width:340px;
          padding:14px 18px;border-radius:14px;background:#0d2b6b;color:#fff;
          font:700 14px/1.35 inherit;box-shadow:0 12px 32px rgba(0,0,0,.3);
          display:flex;gap:10px;align-items:center}
        .lw-toast-tick{flex:0 0 auto;width:24px;height:24px;border-radius:50%;background:#e3166c;
          display:flex;align-items:center;justify-content:center;font-size:14px}
        @media (max-width:520px){
          .lw-overlay{padding:8px}
          .lw-card{padding:16px 14px 18px;border-radius:14px}
          .lw-title{font-size:21px}
          .lw-sub{font-size:13px;margin-bottom:10px}
          .lw-toast{right:12px;left:12px;bottom:12px;max-width:none}
        }
      `}</style>
    </>
  );
}
