import {useEffect, useMemo, useRef, useState} from 'react';
import {rememberPromo} from '../PendingPromo';
import {useFetcher, useFetchers} from 'react-router';
import {CART_ACTION} from '~/lib/cart-action';

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

type Prize = {
  label: string;
  bg: string;
  /** продукт-награда: gid://cloudcart/ProductVariant/<id> */
  merchandiseId?: string;
  /** 100% код за продукта-награда */
  freeCode?: string;
  /** купон: код за цялата поръчка */
  code?: string;
  wonText?: string;
};

/* 11 сектора: 5 продукта + по 2 полета на всеки от трите промо кода.
   Продукт и купон се редуват; еднаквите кодове са на 6 позиции разстояние.
   Цветовете са стълбица от #e3166c, смесено с бяло от 5% до 65%. */
const PRIZES: Prize[] = [
  {label: '-5%', bg: '#FEF3F8', code: 'A72AQ4K380'},
  {
    label: 'Хавлия',
    bg: '#FCE5EF',
    merchandiseId: 'gid://cloudcart/ProductVariant/225',
    freeCode: '80W3JG567A',
    wonText: '🎉 Спечели: Хавлия, която вече е\nДобавена в количката - безплатно!',
  },
  {label: '-10%', bg: '#FAD7E6', code: 'H6FR7965O9'},
  {
    label: 'Химикал',
    bg: '#F9C9DD',
    merchandiseId: 'gid://cloudcart/ProductVariant/227',
    freeCode: 'A0X9IP44N3',
    wonText: '🎉 Спечели: Химикал, който вече е\nДобавен в количката - безплатно!',
  },
  {label: '-15%', bg: '#F7BBD4', code: '06VLV2N252'},
  {
    label: 'Коса и\nнокти',
    bg: '#F5ADCC',
    merchandiseId: 'gid://cloudcart/ProductVariant/233',
    freeCode: 'F18MJ76KG5',
    wonText:
      '🎉 Спечели: Формулата за коса и нокти, която вече е\nДобавена в количката - безплатно!',
  },
  {label: '-5%', bg: '#F49FC3', code: 'A72AQ4K380'},
  {
    label: 'Сияйна\nкожа',
    bg: '#F291BA',
    merchandiseId: 'gid://cloudcart/ProductVariant/230',
    freeCode: '3VXVV6ZXLF',
    wonText:
      '🎉 Спечели: Формулата за сияйна кожа, която вече е\nДобавена в количката - безплатно!',
  },
  {label: '-10%', bg: '#F084B1', code: 'H6FR7965O9'},
  {
    label: 'Анти\nстрес',
    bg: '#EE76A8',
    merchandiseId: 'gid://cloudcart/ProductVariant/228',
    freeCode: 'TPX196C9G4',
    wonText:
      '🎉 Спечели: Bactology Anti Stress, който вече е\nДобавен в количката - безплатно!',
  },
  {label: '-15%', bg: '#ED689F', code: '06VLV2N252'},
];

const SEG = 360 / PRIZES.length;

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
function mayShow() {
  return !hasSpun() && readInt(K_DISMISS) < MAX_DISMISSALS;
}

export function LuckyWheel() {
  const [open, setOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const openRef = useRef(false);
  const fetcher = useFetcher({key: FETCHER_KEY});
  const fetchers = useFetchers();
  const pendingCode = useRef<string | null>(null);
  const wasAdding = useRef(false);
  const toastTimer = useRef<number | undefined>(undefined);

  openRef.current = open;

  /* Засичане на добавяне в количката: всеки ЧУЖД fetcher към адреса на
     количката с ADD_TO_CART. Нашият собствен (за наградата) се изключва по
     ключ, за да не се самозапали колелото. */
  const someoneAdding = fetchers.some(
    (f) =>
      f.key !== FETCHER_KEY &&
      f.formAction === CART_ACTION &&
      f.formData?.get('action') === 'ADD_TO_CART',
  );

  useEffect(() => {
    if (someoneAdding) {
      wasAdding.current = true;
      return;
    }
    if (!wasAdding.current) return;
    wasAdding.current = false;
    if (!mayShow() || openRef.current) return;
    const t = window.setTimeout(() => {
      if (!openRef.current) setOpen(true);
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
    if (!finished) {
      try {
        localStorage.setItem(K_DISMISS, String(readInt(K_DISMISS) + 1));
      } catch {
        /* частен режим — просто няма да се запомни */
      }
    }
    setOpen(false);
  }

  function pick() {
    return Math.floor(Math.random() * PRIZES.length);
  }

  function spin() {
    if (spinning || finished) return;
    setSpinning(true);

    const idx = pick();
    const mid = idx * SEG + SEG / 2;
    setRotation((prev) => {
      const current = ((prev % 360) + 360) % 360;
      const wanted = (360 - mid) % 360;
      return prev + 360 * 6 + (((wanted - current) % 360) + 360) % 360;
    });

    window.setTimeout(() => settle(idx), SPIN_MS + 300);
  }

  function settle(idx: number) {
    const p = PRIZES[idx];
    setFinished(true);
    setSpinning(false);
    try {
      localStorage.setItem(K_SPUN, '1');
    } catch {
      /* частен режим */
    }

    if (p.merchandiseId) {
      setResult(p.wonText || `🎉 Спечели: ${p.label.replace(/\n/g, ' ')}`);
      // Редът е задължителен: продуктът първо, кодът след него. Код върху
      // количка без своя продукт не важи за нищо.
      pendingCode.current = p.freeCode ?? null;
      fetcher.submit(
        {action: 'ADD_TO_CART', merchandiseId: p.merchandiseId, quantity: '1'},
        {method: 'post', action: CART_ACTION},
      );
    } else {
      // Кодът се запомня ВИНАГИ. Прилагането върху празна количка минава без
      // грешка, но не се запазва (проверено срещу живото API), а при завъртане
      // количката почти винаги е празна - затова спечеленият код изчезваше.
      // `PendingPromo` го слага при първото добавяне на продукт.
      rememberPromo(p.code!);
      fetcher.submit(
        {action: 'APPLY_DISCOUNT', code: p.code!},
        {method: 'post', action: CART_ACTION},
      );
      setResult(
        `🎉 Спечели: ${p.label} отстъпка\nКодът ${p.code} е запазен и ще се приложи в количката ти.`,
      );
      showToast(`Промо код ${p.code} е запазен за поръчката ти`);
    }
  }

  const gradient = useMemo(
    () =>
      PRIZES.map(
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
                {PRIZES.map((p, i) => {
                  /* Етикетът е завъртян на mid, колелото спира на (360 − mid) →
                     печелившият надпис застава изправен под стрелката. */
                  const mid = i * SEG + SEG / 2;
                  const rad = (mid * Math.PI) / 180;
                  return (
                    <div
                      key={i}
                      className="lw-label"
                      style={{
                        left: `${50 + 32 * Math.sin(rad)}%`,
                        top: `${50 - 32 * Math.cos(rad)}%`,
                        transform: `translate(-50%,-50%) rotate(${mid}deg)`,
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
                <a href="/cart" className="lw-tocart">
                  КЪМ КОЛИЧКАТА
                </a>
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
