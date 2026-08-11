import {Link} from 'react-router';

/**
 * Small, PDP-friendly version of the BGolden Awards 2025 badge.
 *
 * The full "trophy" block lives on the homepage as <Award />. This is a
 * horizontal compact inline strip designed to sit above the variants/price
 * area on the product detail page — instant authority signal.
 */
export function PdpAwardBadge() {
  return (
    <div className="bb-pdp-award-row">
    <Link
      to="/article/bulgar-biotik-e-nay-dobriyat-balgarski-brand-za-probiotici-za-2025-g"
      className="bb-pdp-award"
      prefetch="intent"
      aria-label="Награда BGolden Awards 2025"
    >
      <span className="bb-pdp-award-medal" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="11" r="7" fill="#1a1a1a" stroke="#d4af6a" strokeWidth="1" />
          <text x="12" y="14" textAnchor="middle" fill="#f4d585" fontSize="6" fontWeight="800" fontFamily="Manrope">25</text>
          <path d="M9 17l-2 5 3-1.5L12 22l2-1.5 3 1.5-2-5" fill="#c4974f" stroke="#a07c3a" strokeWidth="0.6" />
        </svg>
      </span>
      <span className="bb-pdp-award-text">
        <span className="bb-pdp-award-line1">№1 български пробиотик · 2025</span>
        <span className="bb-pdp-award-line2">BGolden Awards · EVA × GRAZIA</span>
      </span>
      <svg className="bb-pdp-award-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
      </svg>
    </Link>

      {/* Client 2026-08-05: "тука не се разбира въобще какво е това" — the bare
          Forbes graphic said nothing on its own, so it is spelled out. Same
          image the merchant uses as a product banner, now with its own label. */}
      <div className="bb-pdp-award-forbes">
        <img
          src="https://bulgarbiotic.bg/cdn/img/products_banners/7/%21%21%21%D1%81.png?width=96&height=96&v=1777459060"
          alt=""
          aria-hidden="true"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        <span className="bb-pdp-award-text">
          <span className="bb-pdp-award-line1">Номиниран за Forbes</span>
          <span className="bb-pdp-award-line2">Семейна компания на 2026</span>
        </span>
      </div>

      <style>{`
        .bb-pdp-award-row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin: 10px 0 6px;
        }
        /* На десктоп двете отличия стоят едно до друго (клиент, 2026-08-10).
           Дотук се пренасяха едно под друго, защото и двете искаха повече
           място, отколкото има кутията за купуване. Сега си делят реда, а
           текстът вътре се пренася на два реда вместо цялата значка. */
        @media (min-width: 768px) {
          .bb-pdp-award-row { flex-wrap: nowrap; align-items: stretch; }
          .bb-pdp-award-row > .bb-pdp-award,
          .bb-pdp-award-row > .bb-pdp-award-forbes { flex: 1 1 0; min-width: 0; }
          .bb-pdp-award-row .bb-pdp-award-text { min-width: 0; }
          .bb-pdp-award-row .bb-pdp-award-line1,
          .bb-pdp-award-row .bb-pdp-award-line2 { white-space: normal; }
        }
        /* Matches the neighbouring EVA award pill: dark-navy fill, gold
           hairline border, soft rounding + shadow. */
        .bb-pdp-award-forbes {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 16px 8px 10px;
          background: linear-gradient(135deg, #0a2540 0%, #112c4d 100%);
          border: 1px solid rgba(244, 213, 133, 0.3);
          border-radius: 999px;
          box-shadow: 0 6px 16px -8px rgba(10, 37, 64, 0.45);
        }
        .bb-pdp-award-forbes img {
          width: 32px; height: 32px;
          object-fit: contain;
          flex-shrink: 0;
        }
        .bb-pdp-award {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 14px 8px 8px;
          background: linear-gradient(135deg, #0a2540 0%, #112c4d 100%);
          border: 1px solid rgba(244, 213, 133, 0.3);
          border-radius: 999px;
          text-decoration: none;
          transition: all 0.18s;
        }
        .bb-pdp-award:hover {
          text-decoration: none;
          transform: translateY(-1px);
          border-color: #f4d585;
          box-shadow: 0 8px 18px -6px rgba(244, 213, 133, 0.35);
        }
        .bb-pdp-award-medal {
          width: 32px; height: 32px;
          display: inline-flex;
          align-items: center; justify-content: center;
          background: radial-gradient(circle at 35% 30%, #f4d585, #c4974f);
          border-radius: 999px;
          flex-shrink: 0;
        }
        .bb-pdp-award-medal svg { width: 28px; height: 28px; }
        .bb-pdp-award-text {
          display: inline-flex;
          flex-direction: column;
          line-height: 1.15;
        }
        .bb-pdp-award-line1 {
          font-size: 12px; font-weight: 800;
          color: #f4d585;
          letter-spacing: -0.1px;
        }
        .bb-pdp-award-line2 {
          font-size: 10px; font-weight: 700;
          color: rgba(244, 213, 133, 0.65);
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-top: 2px;
        }
        .bb-pdp-award-arrow {
          width: 12px; height: 12px;
          color: rgba(244, 213, 133, 0.6);
          margin-left: 4px;
        }
        .bb-pdp-award:hover .bb-pdp-award-arrow { color: #f4d585; }
      `}</style>
    </div>
  );
}
