/**
 * Анимираната визия от началото на „Науката зад Bulgar Biotic" - пръстените
 * около щама и трите плаващи етикета - като самостоятелна кодова секция.
 *
 * Страницата вече се сглобява в конструктора, а анимация не може да бъде
 * панелен блок. Затова визията се поставя с блок Код `<!-- bb:sci-manifesto -->`
 * в дясната колона на първия ред: текстът наоколо е на търговеца, поведението
 * е тук. Класовете и правилата са същите като в `SciencePageContent`, за да
 * изглежда еднакво, независимо коя от двете версии рисува страницата.
 */

const BULGARICUS_IMG =
  'https://cdncloudcart.com/26377/files/image/babies-lactobacillus-bulgaricus.png';

export function ScienceManifestoOrb() {
  return (
    <div className="bb-sci-manifesto-vis" aria-hidden="true">
      <div className="bb-sci-manifesto-orb">
        <span className="bb-sci-orb-ring bb-sci-orb-ring--1" />
        <span className="bb-sci-orb-ring bb-sci-orb-ring--2" />
        <span className="bb-sci-orb-ring bb-sci-orb-ring--3" />
        <span className="bb-sci-orb-backdrop" />
        <img src={BULGARICUS_IMG} alt="" loading="lazy" />
      </div>
      <div className="bb-sci-orb-chip bb-sci-orb-chip--strain">
        <span className="bb-sci-orb-chip-label">FLAGSHIP STRAIN</span>
        <strong>L. bulgaricus</strong>
        <span className="bb-sci-orb-chip-sub">Открит 1905</span>
      </div>
      <div className="bb-sci-orb-chip bb-sci-orb-chip--cfu">
        <span className="bb-sci-orb-chip-label">КОНЦЕНТРАЦИЯ</span>
        <strong>50<em>млрд</em></strong>
        <span className="bb-sci-orb-chip-sub">CFU на доза</span>
      </div>
      <div className="bb-sci-orb-chip bb-sci-orb-chip--cert">
        <span className="bb-sci-orb-chip-label">Сертифицирано</span>
        <strong>HACCP <em>·</em> GMP <em>·</em> ISO</strong>
        <span className="bb-sci-orb-chip-sub">Made in EU</span>
      </div>

      <style>{`
        .bb-sci-manifesto-vis {
          position: relative;
          aspect-ratio: 1 / 1;
          max-width: 500px;
          margin: 0 auto;
          min-height: 320px;
        }
        .bb-sci-manifesto-orb {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .bb-sci-orb-backdrop {
          position: absolute;
          inset: 22%;
          background: white;
          border-radius: 50%;
          box-shadow:
            0 30px 60px -16px rgba(227, 22, 108, 0.28),
            0 0 0 1px rgba(227, 22, 108, 0.08) inset;
          z-index: 0;
        }
        .bb-sci-orb-ring {
          position: absolute;
          border-radius: 50%;
          border: 1.5px dashed rgba(227, 22, 108, 0.55);
          animation: bb-sci-orb-spin 60s linear infinite;
          pointer-events: none;
        }
        .bb-sci-orb-ring--1 { inset: 0;   animation-duration: 90s; border-color: rgba(227, 22, 108, 0.32); }
        .bb-sci-orb-ring--2 { inset: 10%; animation-duration: 60s; animation-direction: reverse; border-color: rgba(227, 22, 108, 0.45); }
        .bb-sci-orb-ring--3 { inset: 22%; animation-duration: 30s; border-style: solid; border-color: rgba(227, 22, 108, 0.18); border-width: 1px; }
        @keyframes bb-sci-orb-spin { to { transform: rotate(360deg); } }
        .bb-sci-manifesto-orb img {
          position: relative;
          z-index: 1;
          max-width: 52%; height: auto;
          filter: drop-shadow(0 24px 40px rgba(227, 22, 108, 0.32));
          animation: bb-sci-orb-float 6s ease-in-out infinite;
        }
        @keyframes bb-sci-orb-float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-10px); }
        }
        .bb-sci-orb-chip {
          position: absolute;
          background: white;
          border: 1px solid rgba(10, 37, 64, 0.08);
          padding: 10px 14px 12px;
          border-radius: 14px;
          box-shadow: 0 16px 32px -10px rgba(10, 37, 64, 0.18);
          display: flex; flex-direction: column;
          min-width: 0;
          animation: bb-sci-chip-float 7s ease-in-out infinite;
          z-index: 2;
        }
        @keyframes bb-sci-chip-float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }
        .bb-sci-orb-chip--strain {
          top: 4%; left: -4%;
          animation-delay: -1s;
        }
        .bb-sci-orb-chip--cfu {
          top: 38%; right: -6%;
          animation-delay: -3s;
        }
        .bb-sci-orb-chip--cert {
          bottom: 4%; left: 8%;
          animation-delay: -5s;
        }
        .bb-sci-orb-chip-label {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          color: rgba(10, 37, 64, 0.5);
          margin-bottom: 4px;
          white-space: nowrap;
        }
        .bb-sci-orb-chip strong {
          font-family: var(--font-serif);
          font-style: italic;
          font-weight: 500;
          font-size: 22px;
          letter-spacing: -0.4px;
          line-height: 1;
          color: var(--color-brand-pink);
          white-space: nowrap;
        }
        .bb-sci-orb-chip strong em {
          font-style: italic;
          font-size: 14px;
          color: rgba(227, 22, 108, 0.7);
          margin-left: 3px;
          letter-spacing: 0;
        }
        .bb-sci-orb-chip-sub {
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.2px;
          color: rgba(10, 37, 64, 0.55);
          margin-top: 6px;
          white-space: nowrap;
        }
        @media (max-width: 880px) {
          .bb-sci-manifesto-vis { min-height: 280px; max-width: 380px; }
          .bb-sci-orb-chip { padding: 8px 12px 10px; }
          .bb-sci-orb-chip strong { font-size: 18px; }
          .bb-sci-orb-chip-label { font-size: 8.5px; }
          .bb-sci-orb-chip-sub { font-size: 10px; }
        }
        @media (max-width: 540px) {
          .bb-sci-manifesto-vis { max-width: 320px; min-height: 260px; }
          .bb-sci-orb-chip strong { font-size: 16px; }
          .bb-sci-orb-chip strong em { font-size: 12px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .bb-sci-orb-ring,
          .bb-sci-orb-chip,
          .bb-sci-manifesto-orb img { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
