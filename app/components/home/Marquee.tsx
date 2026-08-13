interface MarqueeItem {
  label?: string;
  text: string;
}

/**
 * Бягащата лента. Съдържанието може да дойде от списък, написан в панела
 * (`items`); без него важи списъкът отдолу, с който секцията живее в кода.
 */
export function Marquee({items: given}: {items?: MarqueeItem[]} = {}) {
  // Client (2026-07-24): removed "веган"/"растителен" (not accurate → just
  // "DR-Caps™ капсули"), removed free-shipping + made-in-Bulgaria lines; added
  // natural-ingredients / unique-strain-combo / 100%-natural claims.
  const fallback = [
    {label: 'НАУКА', text: 'Автентичен Lactobacillus bulgaricus'},
    {label: '', text: '50 милиарда активни бактерии'},
    {label: '', text: 'Уникални комбинации от пробиотични щамове, пребиотик и постбиотик'},
    {label: '', text: 'DR-Caps™ капсули'},
    {label: '', text: 'Наличие на естествени съставки'},
    {label: '', text: '5 пробиотични щама във всяка формула'},
    {label: '', text: 'Гарантирано 100% натурално'},
    {label: '', text: '30 дни гаранция - връщаме парите'},
  ];
  const items = given && given.length ? given : fallback;
  // Duplicate for seamless infinite scroll
  const all = [...items, ...items];
  return (
    <div className="bb-marquee-wrap">
      <div className="bb-marquee">
        {all.map((it, i) => (
          <span className="bb-marquee-item" key={i}>
            {it.label ? <span className="bb-marquee-badge">{it.label}</span> : <span className="bb-marquee-dot"></span>}
            {it.text}
          </span>
        ))}
      </div>
      <style>{`
        .bb-marquee-wrap {
          background: var(--color-cream-2);
          border-top: 1px solid rgba(10, 37, 64, 0.1);
          border-bottom: 1px solid rgba(10, 37, 64, 0.1);
          padding: 18px 0;
          overflow: hidden;
        }
        .bb-marquee {
          display: flex;
          animation: scroll-marquee 40s linear infinite;
          width: max-content;
        }
        .bb-marquee-item {
          display: inline-flex; align-items: center; gap: 10px;
          padding: 0 36px;
          font-size: 14px; font-weight: 700;
          color: var(--color-ink); white-space: nowrap; letter-spacing: 0.2px;
        }
        .bb-marquee-dot { width: 6px; height: 6px; background: var(--color-brand-pink); border-radius: 50%; opacity: 0.6; }
        .bb-marquee-badge {
          background: var(--color-pink-1); color: var(--color-brand-pink);
          padding: 3px 10px; border-radius: 999px;
          font-size: 11px; letter-spacing: 1.2px; text-transform: uppercase;
        }
      `}</style>
    </div>
  );
}
