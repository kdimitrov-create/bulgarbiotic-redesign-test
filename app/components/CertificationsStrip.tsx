/**
 * Certifications trust strip — mirrors the real bulgarbiotic.bg PDP badges:
 * HACCP (food safety), Pharmaceutical Grade, GMP (Good Manufacturing Practice),
 * ISO Certified, Made in EU.
 *
 * Rendered on every PDP under the product details to reassure on quality.
 * Pure typographic SVG badges (no third-party logos) — readable and copy-safe.
 */
type Cert = {
  key: string;
  acronym: string;
  meta: string;
  caption: string;
  variant: 'ring' | 'shield' | 'stars' | 'frame';
};

const CERTS: Cert[] = [
  {key: 'haccp',  acronym: 'HACCP', meta: 'CERTIFIED',           caption: 'Food safety',           variant: 'ring'},
  {key: 'pharma', acronym: 'PHARMA', meta: 'GRADE',              caption: 'Pharmaceutical',        variant: 'shield'},
  {key: 'gmp',    acronym: 'GMP',   meta: 'GOOD MFG PRACTICE',   caption: 'Production standard',   variant: 'ring'},
  {key: 'iso',    acronym: 'ISO',   meta: 'CERTIFIED',           caption: 'Quality management',    variant: 'stars'},
  {key: 'eu',     acronym: 'EU',    meta: 'MADE IN',             caption: 'Произведено в ЕС',      variant: 'frame'},
];

// Client (2026-07): show the REAL certification badge image on PDPs (matches
// bulgarbiotic.bg) instead of the typographic SVG badges below. The SVG version
// is kept intact as a backup — flip this flag to `false` to restore it.
const USE_REAL_CERT_IMAGE = true;
const CERT_IMAGE = 'https://cdncloudcart.com/26377/files/image/logos_certificates_cut.webp?1769152740';

export function CertificationsStrip() {
  if (USE_REAL_CERT_IMAGE) {
    return (
      <section className="bb-certs" aria-label="Сертификати и стандарти">
        <img
          className="bb-certs-real"
          src={CERT_IMAGE}
          alt="Сертификати: HACCP · Pharmaceutical Grade · GMP · ISO · Made in EU"
          loading="lazy"
        />
        <style>{`
          .bb-certs { margin-top: 28px; padding-top: 24px; border-top: 1px solid rgba(10, 37, 64, 0.08); }
          .bb-certs-real { display: block; width: 100%; max-width: 620px; height: auto; margin: 0 auto; }
        `}</style>
      </section>
    );
  }
  return (
    <section className="bb-certs" aria-label="Сертификати и стандарти">
      <div className="bb-certs-row">
        {CERTS.map((c) => (
          <div key={c.key} className={`bb-cert bb-cert--${c.variant}`}>
            <svg className="bb-cert-frame" viewBox="0 0 100 100" aria-hidden="true">
              <defs>
                <radialGradient id={`bb-cert-grad-${c.key}`} cx="40%" cy="35%" r="70%">
                  <stop offset="0%" stopColor="#f9f6ed" />
                  <stop offset="100%" stopColor="#e8e3d4" />
                </radialGradient>
              </defs>
              {c.variant === 'ring' && (
                <>
                  <circle cx="50" cy="50" r="46" fill="url(#bb-cert-grad-haccp)" stroke="#0a2540" strokeWidth="1.5" />
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#0a2540" strokeWidth="0.6" />
                  {Array.from({length: 24}).map((_, i) => {
                    const a = (i * Math.PI * 2) / 24;
                    const x1 = 50 + Math.cos(a) * 40;
                    const y1 = 50 + Math.sin(a) * 40;
                    const x2 = 50 + Math.cos(a) * 45;
                    const y2 = 50 + Math.sin(a) * 45;
                    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#0a2540" strokeWidth="0.5" />;
                  })}
                </>
              )}
              {c.variant === 'shield' && (
                <>
                  <path
                    d="M50 6 L86 18 L86 50 Q86 78 50 94 Q14 78 14 50 L14 18 Z"
                    fill="url(#bb-cert-grad-haccp)"
                    stroke="#0a2540"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M50 14 L80 23 L80 50 Q80 73 50 86 Q20 73 20 50 L20 23 Z"
                    fill="none"
                    stroke="#0a2540"
                    strokeWidth="0.6"
                  />
                </>
              )}
              {c.variant === 'stars' && (
                <>
                  <circle cx="50" cy="50" r="46" fill="url(#bb-cert-grad-haccp)" stroke="#0a2540" strokeWidth="1.5" />
                  {Array.from({length: 5}).map((_, i) => {
                    const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
                    const cx = 50 + Math.cos(a) * 32;
                    const cy = 50 + Math.sin(a) * 32;
                    return (
                      <text
                        key={i}
                        x={cx}
                        y={cy + 3}
                        textAnchor="middle"
                        fontSize="8"
                        fill="#0a2540"
                      >★</text>
                    );
                  })}
                  <circle cx="50" cy="50" r="22" fill="none" stroke="#0a2540" strokeWidth="0.4" />
                </>
              )}
              {c.variant === 'frame' && (
                <>
                  <circle cx="50" cy="50" r="46" fill="url(#bb-cert-grad-haccp)" stroke="#0a2540" strokeWidth="1.5" />
                  {/* 12 EU stars around the rim */}
                  {Array.from({length: 12}).map((_, i) => {
                    const a = (i * Math.PI * 2) / 12 - Math.PI / 2;
                    const cx = 50 + Math.cos(a) * 36;
                    const cy = 50 + Math.sin(a) * 36;
                    return (
                      <text
                        key={i}
                        x={cx}
                        y={cy + 2}
                        textAnchor="middle"
                        fontSize="6"
                        fill="#0a2540"
                      >★</text>
                    );
                  })}
                </>
              )}
            </svg>
            <div className="bb-cert-content">
              <div className="bb-cert-meta-top">{c.meta}</div>
              <div className="bb-cert-acronym">{c.acronym}</div>
              <div className="bb-cert-meta-bot">{c.caption}</div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .bb-certs {
          margin-top: 28px;
          padding-top: 24px;
          border-top: 1px solid rgba(10, 37, 64, 0.08);
        }
        .bb-certs-row {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 14px;
        }
        @media (max-width: 720px) {
          .bb-certs-row { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 480px) {
          .bb-certs-row { grid-template-columns: repeat(2, 1fr); gap: 10px; }
        }

        .bb-cert {
          position: relative;
          aspect-ratio: 1 / 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .bb-cert-frame {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }
        .bb-cert-content {
          position: relative;
          z-index: 1;
          text-align: center;
          line-height: 1;
        }
        .bb-cert-meta-top,
        .bb-cert-meta-bot {
          font-size: 7px;
          font-weight: 800;
          letter-spacing: 1px;
          color: rgba(10, 37, 64, 0.7);
          text-transform: uppercase;
        }
        .bb-cert-meta-top { margin-bottom: 3px; }
        .bb-cert-meta-bot { margin-top: 3px; }
        .bb-cert-acronym {
          font-size: 16px;
          font-weight: 900;
          letter-spacing: 0.5px;
          color: #0a2540;
          font-family: var(--font-sans);
        }

        @media (max-width: 480px) {
          .bb-cert-acronym { font-size: 14px; }
          .bb-cert-meta-top, .bb-cert-meta-bot { font-size: 6.5px; }
        }
      `}</style>
    </section>
  );
}
