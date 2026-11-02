import {useState, useEffect} from 'react';
import {cdnResize} from '~/lib/product-images';

/**
 * Home campaign banner slider (client request). Responsive: shows the wide
 * DESKTOP banner on ≥768px and the tall MOBILE banner on phones (via <picture>).
 * Pure images — no text overlay / floating elements — per the client.
 *
 * Banners live on the CloudCart CDN. Desktop/mobile pairs were matched by
 * upload timestamp + aspect ratio (desktop ≈ 2033×773, mobile ≈ 1070×1470).
 *
 * `BannerSlider` is the same slider driven by whatever slides it is handed, so
 * the page builder's "Карусел" widget gets the identical hero instead of a
 * stack of images. `HeroStats` is the overlay, separated for the same reason:
 * on a builder-composed homepage it is placed with its own `bb:stats` marker.
 */
export type Slide = {desktop: string; mobile?: string; link?: string; target?: string};

const CDN = 'https://cdncloudcart.com/26377/files/image';

// CloudCart CDN supports `&width=W` resizing — keep banners light (mobile-ready):
// desktop displayed ≤ ~1440px → 1800 covers retina; mobile displayed ≤ ~430px → 800.
const D = '&width=1800';
const M = '&width=800';

/**
 * Резервният списък е ПРАЗЕН нарочно (клиент, 01.09).
 *
 * Дотук тук стояха пет летни банера и при всеки отказ на панела те се
 * появяваха на живо: „печелиш хавлия над 70 €" (тази оферта е изключена),
 * „FEMIN −40%", „Summer Sale −45%", „−30%", „КЕТО перли −15%". Нито един не е
 * верен днес, тоест магазинът обещаваше отстъпки, които касата не дава - и то
 * точно в мигове, в които вече нещо не е наред.
 *
 * Празен списък значи, че `BannerSlider` не рисува нищо: началната остава без
 * герой, докато панелът се върне. По-добре липсваща картинка, отколкото
 * невярна оферта.
 *
 * Ако някога има ВЕЧЕН банер - марка или продукт, без цена, процент и срок -
 * мястото му е тук.
 */
export const HERO_SLIDES: Slide[] = [];

export function BannerSlider({
  slides,
  rounded = false,
  children,
}: {
  slides: Slide[];
  rounded?: boolean;
  /** Overlay content — the achievement stats on the homepage. */
  children?: React.ReactNode;
}) {
  const [idx, setIdx] = useState(0);
  const n = slides.length;

  useEffect(() => {
    if (n < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % n), 5000);
    return () => clearInterval(t);
  }, [n]);

  if (!n) return null;
  const go = (i: number) => setIdx(((i % n) + n) % n);

  return (
    <section className={`bb-hslider${rounded ? ' bb-hslider--rounded' : ''}`} aria-label="Кампании" aria-roledescription="carousel">
      <div className="bb-hslider-track" style={{transform: `translateX(-${idx * 100}%)`}}>
        {slides.map((s, i) => {
          const picture = (
            <picture className="bb-hslider-slide">
              {/* Банерите от панела идват без параметри - голи PNG-та.
                  Героят тежеше 740 KB; като WebP е 57. Ширина НЕ се налага:
                  източникът е 1640 px и всяко по-голямо число само го надува
                  (1800 → 827 KB). */}
              {s.mobile && <source media="(max-width: 767px)" srcSet={cdnResize(s.mobile)} />}
              <img src={cdnResize(s.desktop)} alt={`Кампания ${i + 1}`} loading={i === 0 ? 'eager' : 'lazy'} />
            </picture>
          );
          if (!s.link) return <div key={i} className="bb-hslider-cell">{picture}</div>;
          /* Кой прозорец решава ПАНЕЛЪТ.
           * Дотук всичко, което не започва с наклонена черта, се отваряше в нов
           * прозорец - а в панела за този банер пише „същия". Изборът на
           * търговеца бие; когато не е казал нищо, външният адрес пак отваря
           * нов раздел, както се очаква от външна връзка. */
          const offsite = !s.link.startsWith('/') || s.link.startsWith('//');
          const wants = String(s.target ?? '').toLowerCase();
          const external = wants === '_blank' || (wants !== '_self' && offsite);
          return (
            <a
              key={i}
              className="bb-hslider-cell"
              href={s.link}
              target={external ? '_blank' : undefined}
              rel={external ? 'noopener noreferrer' : undefined}
            >
              {picture}
            </a>
          );
        })}
      </div>

      {children}

      {n > 1 && (
        <>
          <button type="button" className="bb-hslider-arrow bb-hslider-prev" onClick={() => go(idx - 1)} aria-label="Предишен слайд">‹</button>
          <button type="button" className="bb-hslider-arrow bb-hslider-next" onClick={() => go(idx + 1)} aria-label="Следващ слайд">›</button>

          <div className="bb-hslider-dots" role="tablist">
            {slides.map((_, i) => (
              <button key={i} type="button" className={`bb-hslider-dot${i === idx ? ' on' : ''}`} onClick={() => go(i)} aria-label={`Слайд ${i + 1}`} aria-selected={i === idx} role="tab" />
            ))}
          </div>
        </>
      )}

      <style>{`
        .bb-hslider { position: relative; overflow: hidden; width: 100%; background: var(--color-cream-2); }
        .bb-hslider--rounded { border-radius: 24px; }
        .bb-hslider-track { display: flex; transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1); }
        .bb-hslider-cell { flex: 0 0 100%; width: 100%; display: block; }
        /* Uniform banner height — fixed aspect ratio + cover so every slide is
           exactly the same height (banner 3 was slightly taller before). */
        .bb-hslider-slide { display: block; width: 100%; aspect-ratio: 2033 / 773; }
        @media (max-width: 767px) { .bb-hslider-slide { aspect-ratio: 1070 / 1470; } }
        .bb-hslider-slide img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .bb-hslider-arrow {
          position: absolute; top: 50%; transform: translateY(-50%);
          width: 44px; height: 44px; border-radius: 999px; border: none;
          background: rgba(255, 255, 255, 0.85); color: var(--color-ink);
          font-size: 26px; line-height: 1; cursor: pointer; z-index: 2;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 14px -4px rgba(10, 37, 64, 0.25); transition: background 0.18s;
        }
        .bb-hslider-arrow:hover { background: #fff; }
        .bb-hslider-prev { left: 16px; }
        .bb-hslider-next { right: 16px; }
        .bb-hslider-dots {
          position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%);
          display: flex; gap: 0; z-index: 2;
        }
        /* Точката се рисува вътре, а бутонът е 26 пиксела.
           Досега целият бутон беше 9 пиксела - под всякаква разумна мярка за
           пръст, а с междина от 8 пиксела съседните цели се застъпваха. Видът
           остава същият; расте само областта, която приема докосването. */
        .bb-hslider-dot {
          width: 26px; height: 26px;
          display: grid; place-items: center;
          border: none; padding: 0; background: none; cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .bb-hslider-dot::before {
          content: '';
          width: 9px; height: 9px; border-radius: 999px;
          background: rgba(255, 255, 255, 0.7);
          box-shadow: 0 1px 4px rgba(10, 37, 64, 0.25);
          transition: background 0.2s, transform 0.2s;
        }
        .bb-hslider-dot.on::before { background: var(--color-brand-pink); transform: scale(1.3); }
      `}</style>
    </section>
  );
}

/** Achievement stats — bottom-right overlay, delayed slide-in from the side. */
export function HeroStats() {
  return (
    <div className="bb-hslider-stats" aria-label="Постижения на Bactology">
      <div className="bb-hslider-stat"><span className="bb-hslider-stat-v">110<i>k+</i></span><span className="bb-hslider-stat-l">доволни клиенти</span></div>
            <div className="bb-hslider-stat"><span className="bb-hslider-stat-v">7<i>y+</i></span><span className="bb-hslider-stat-l">опит от 2019</span></div>
      <div className="bb-hslider-stat"><span className="bb-hslider-stat-v">4.9<i>★</i></span><span className="bb-hslider-stat-l">от 3 303 ревюта</span></div>

      <style>{`
        .bb-hslider-stats {
          /* Bottom-RIGHT corner (client) — bottom-left was covering banner text. */
          position: absolute; right: 24px; bottom: 18px; z-index: 3;
          display: flex; gap: 20px;
          padding: 14px 22px; border-radius: 18px;
          background: rgba(255, 255, 255, 0.82);
          -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.6);
          box-shadow: 0 18px 44px -16px rgba(10, 37, 64, 0.35);
          animation: bb-hslider-stats-in 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) 0.9s backwards;
        }
        @keyframes bb-hslider-stats-in {
          from { opacity: 0; transform: translateX(52px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .bb-hslider-stat-v {
          display: block; font-family: var(--font-serif); font-style: italic;
          font-weight: 500; font-size: 26px; letter-spacing: -1px;
          color: var(--color-ink); line-height: 1;
        }
        .bb-hslider-stat-v i { font-size: 13px; opacity: 0.6; font-style: italic; }
        .bb-hslider-stat-l {
          display: block; margin-top: 5px; font-size: 10px; font-weight: 700;
          letter-spacing: 1.2px; text-transform: uppercase; color: rgba(10, 37, 64, 0.6);
        }
        @media (max-width: 767px) { .bb-hslider-arrow, .bb-hslider-stats { display: none; } }
      `}</style>
    </div>
  );
}

/**
 * Банерите идват от панела; списъкът в кода е само резерва.
 *
 * `HERO_SLIDES` остава за случая, в който панелът не върне нито един насрочен
 * банер - началната не бива да остава без герой заради празна въртележка.
 */
export function HeroBannerSlider({
  rounded = false,
  slides,
}: {
  rounded?: boolean;
  slides?: Slide[];
}) {
  const shown = slides && slides.length ? slides : HERO_SLIDES;
  return (
    <BannerSlider slides={shown} rounded={rounded}>
      <HeroStats />
    </BannerSlider>
  );
}
