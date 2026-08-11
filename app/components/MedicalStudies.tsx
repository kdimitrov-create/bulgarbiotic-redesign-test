/**
 * Beautiful renderer for the "Какво казва медицината?" research card grid
 * embedded by CloudCart's CMS inside many product descriptions.
 *
 * CMS-shipped layout: 8 illegible PDF thumbnail screenshots on a harsh pink
 * background — almost impossible to read. This component throws that out and
 * replaces it with a brand-aligned 3-column grid of human-readable study cards
 * (ingredient name + PDF download icon + "Прочети →").
 *
 * Filenames map to human ingredient names via INGREDIENT_LABELS — extend
 * the dictionary when new product PDFs are added.
 */

export interface Study {
  pdfUrl: string;
  imageUrl?: string;
  /** Inferred human-friendly title (e.g. "Lactobacillus rhamnosus"). */
  title: string;
  /** Optional subtitle / latin name when title is in Bulgarian. */
  subtitle?: string;
}

interface Props {
  title?: string;
  subtitle?: string;
  studies: Study[];
}

export function MedicalStudies({title, subtitle, studies}: Props) {
  if (studies.length === 0) return null;

  return (
    <section className="bb-studies">
      <div className="bb-studies-head">
        <span className="bb-studies-tag">Научни проучвания</span>
        <h3 className="bb-studies-title">
          {title || 'Какво казва науката?'}
        </h3>
        {subtitle && <p className="bb-studies-sub">{subtitle}</p>}
      </div>

      <div className="bb-studies-grid">
        {studies.map((s, i) => (
          <a
            key={i}
            href={s.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bb-study-card"
          >
            <div className="bb-study-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="9" y1="13" x2="15" y2="13" />
                <line x1="9" y1="17" x2="13" y2="17" />
              </svg>
            </div>
            <div className="bb-study-body">
              <h4 className="bb-study-name">{s.title}</h4>
              {s.subtitle && <div className="bb-study-sub">{s.subtitle}</div>}
              <span className="bb-study-cta">
                Прочети PDF
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M7 17L17 7M9 7h8v8" />
                </svg>
              </span>
            </div>
          </a>
        ))}
      </div>

      <p className="bb-studies-foot">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5l3 2" />
        </svg>
        Независими световни проучвания за всяка съставка от формулата
      </p>

      <style>{`
        .bb-studies {
          background: linear-gradient(135deg, var(--color-cream-2) 0%, var(--color-pink-1) 100%);
          border-radius: 22px;
          padding: 44px 32px 36px;
          margin: 40px 0;
          position: relative;
          overflow: hidden;
        }
        @media (max-width: 720px) {
          .bb-studies { padding: 32px 22px 28px; border-radius: 18px; margin: 28px 0; }
        }
        .bb-studies::before {
          content: "";
          position: absolute;
          top: -80px; right: -60px;
          width: 220px; height: 220px;
          background: radial-gradient(circle, rgba(227, 22, 108, 0.14), transparent 70%);
          filter: blur(20px);
          pointer-events: none;
        }
        .bb-studies-head {
          position: relative;
          text-align: center;
          margin-bottom: 28px;
        }
        .bb-studies-tag {
          display: inline-block;
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: 1.4px;
          text-transform: uppercase;
          color: var(--color-brand-pink);
          padding: 5px 12px;
          background: white;
          border-radius: 999px;
          margin-bottom: 12px;
        }
        .bb-studies-title {
          font-size: clamp(22px, 3vw, 28px);
          font-weight: 800;
          letter-spacing: -0.6px;
          line-height: 1.15;
          color: var(--color-ink);
          margin: 0;
        }
        .bb-studies-sub {
          font-size: 14px;
          color: rgba(10, 37, 64, 0.7);
          margin: 10px auto 0;
          max-width: 460px;
          line-height: 1.5;
        }

        .bb-studies-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          max-width: 920px;
          margin: 0 auto;
        }
        @media (max-width: 720px) {
          .bb-studies-grid { grid-template-columns: 1fr; gap: 10px; }
        }
        @media (min-width: 721px) and (max-width: 980px) {
          .bb-studies-grid { grid-template-columns: repeat(2, 1fr); }
        }

        /* Card layout — two columns: icon + body. The "Прочети PDF" CTA
         * stacks BELOW the title rather than competing for the same row.
         * Old grid was 44px / 1fr / auto which left only ~137px for the
         * title column in a 299px card, forcing long names like
         * "Streptococcus thermophilus" or "Арабиногалактан" to overflow
         * into the CTA's space (visible overlap). New layout gives the
         * title the full content row; CTA becomes a small footer pill. */
        .bb-study-card {
          display: grid;
          grid-template-columns: 44px 1fr;
          align-items: start;
          gap: 14px;
          padding: 14px 16px;
          background: white;
          border-radius: 14px;
          border: 1px solid rgba(10, 37, 64, 0.06);
          color: var(--color-ink);
          text-decoration: none;
          transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .bb-study-card:hover {
          transform: translateY(-2px);
          border-color: var(--color-brand-pink);
          box-shadow: 0 12px 24px -8px rgba(227, 22, 108, 0.22);
          text-decoration: none;
        }
        .bb-study-icon {
          width: 44px; height: 44px;
          border-radius: 11px;
          background: var(--color-pink-1);
          color: var(--color-brand-pink);
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .bb-study-card:hover .bb-study-icon {
          background: var(--color-brand-pink);
          color: white;
        }
        .bb-study-icon svg { width: 22px; height: 22px; }

        .bb-study-body { min-width: 0; }
        /* Title — long compound names (Streptococcus thermophilus,
         * Арабиногалактан, Bifidobacterium infantis) need to be allowed
         * to break mid-word when the column is narrow. Without
         * overflow-wrap the word renders at intrinsic width and pushes
         * past the column boundary, visually overlapping the CTA. */
        .bb-study-name {
          font-size: 13.5px;
          font-weight: 700;
          line-height: 1.25;
          color: var(--color-ink);
          margin: 0;
          letter-spacing: -0.1px;
          overflow-wrap: anywhere;
          word-break: break-word;
          /* Explicit resets in case CMS-side rules leak in */
          text-transform: none;
          max-width: none;
          padding-bottom: 0;
          border-bottom: 0;
        }
        .bb-study-sub {
          font-size: 11px;
          font-weight: 500;
          font-style: italic;
          color: rgba(10, 37, 64, 0.55);
          margin-top: 2px;
          overflow-wrap: anywhere;
        }

        /* CTA — sits as a small footer chip below the title, no longer
         * competing for the title row. Hover lifts opacity. */
        .bb-study-cta {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-top: 8px;
          padding: 4px 10px;
          font-size: 10.5px;
          font-weight: 700;
          color: var(--color-brand-pink);
          letter-spacing: 0.4px;
          text-transform: uppercase;
          white-space: nowrap;
          background: var(--color-pink-1);
          border-radius: 999px;
          opacity: 0.75;
          transition: opacity 0.18s, background 0.18s, color 0.18s;
          align-self: flex-start;
        }
        .bb-study-card:hover .bb-study-cta {
          opacity: 1;
          background: var(--color-brand-pink);
          color: white;
        }
        .bb-study-cta svg { width: 10px; height: 10px; }

        .bb-studies-foot {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin: 24px auto 0;
          font-size: 11.5px;
          font-weight: 600;
          color: rgba(10, 37, 64, 0.55);
          letter-spacing: 0.2px;
        }
        .bb-studies-foot svg {
          width: 13px; height: 13px;
          color: var(--color-brand-pink);
        }
      `}</style>
    </section>
  );
}

/**
 * Mapping from filename slug to a human-readable ingredient name (and a
 * latin / scientific subtitle when helpful).
 */
const INGREDIENT_LABELS: Record<string, {title: string; subtitle?: string}> = {
  // Probiotic strains
  'lactobacillus-acidophilus':   {title: 'Lactobacillus acidophilus', subtitle: 'Имунитет и баланс'},
  'lactobacillus-rhamnosus':     {title: 'Lactobacillus rhamnosus',   subtitle: 'Чревна флора'},
  'lactobacillus-helveticus':    {title: 'Lactobacillus helveticus',  subtitle: 'Млечнокисели бактерии'},
  'lactobacillus-fermentum':     {title: 'Lactobacillus fermentum',   subtitle: 'Антиоксидантно действие'},
  'lactobacillus-bulgaricus':    {title: 'Lactobacillus bulgaricus',  subtitle: 'Българското злато'},
  'lactobacillus-plantarum':     {title: 'Lactobacillus plantarum',   subtitle: 'Стабилност в червата'},
  'lactobacillus-casei':         {title: 'Lactobacillus casei',       subtitle: 'Подкрепа на имунитета'},
  'lactobacillus-paracasei':     {title: 'Lactobacillus paracasei',   subtitle: 'Чревен баланс'},
  'bifidobacterium-lactis':      {title: 'Bifidobacterium lactis',    subtitle: 'Дебело черво'},
  'bifidobacterium-bifidum':     {title: 'Bifidobacterium bifidum',   subtitle: 'Бебешка флора'},
  'bifidobacterium-longum':      {title: 'Bifidobacterium longum',    subtitle: 'Дълголетие'},
  'streptococcus-thermophilus':  {title: 'Streptococcus thermophilus', subtitle: 'Ферментация'},
  'saccharomyces-boulardii':     {title: 'Saccharomyces boulardii',   subtitle: 'Пробиотична мая'},
  // Adjunct ingredients
  'royal-jelly':                 {title: 'Кралско млечице',           subtitle: 'Royal Jelly'},
  'colostrum':                   {title: 'Коластра',                  subtitle: 'Colostrum'},
  'arabinogalactan':             {title: 'Арабиногалактан',           subtitle: 'Пребиотик'},
  'inulin':                      {title: 'Инулин',                    subtitle: 'Пребиотично влакно'},
  'fos':                         {title: 'FOS',                       subtitle: 'Фруктоолигозахариди'},
  'gos':                         {title: 'GOS',                       subtitle: 'Галактоолигозахариди'},
  'biotin':                      {title: 'Биотин',                    subtitle: 'Витамин B7'},
  'vitamin-d3':                  {title: 'Витамин D3',                subtitle: 'Имунитет и кости'},
  'vitamin-c':                   {title: 'Витамин C',                 subtitle: 'Антиоксидант'},
  'zinc':                        {title: 'Цинк',                      subtitle: 'Кожа и имунитет'},
  'iron':                        {title: 'Желязо',                    subtitle: 'Енергия и кръвотворене'},
  'collagen':                    {title: 'Колаген',                   subtitle: 'Кожа и стави'},
  'hyaluronic-acid':             {title: 'Хиалуронова киселина',      subtitle: 'Хидратация'},
  'q10':                         {title: 'Коензим Q10',               subtitle: 'Антистареене'},
};

/**
 * Try to derive a human-readable ingredient label from a PDF URL or image filename.
 * Strips known product prefixes (e.g. "colongic-", "femin-") and looks up the
 * remainder in INGREDIENT_LABELS. Falls back to a humanised slug if unknown.
 */
export function deriveStudyTitle(pdfUrl: string, imageUrl?: string, alt?: string): {title: string; subtitle?: string} {
  const source = pdfUrl || imageUrl || '';
  // Extract the filename (last segment before any query string)
  const filename = source.split('/').pop()?.split('?')[0]?.toLowerCase() ?? '';
  // Strip extension
  const slug = filename.replace(/\.(pdf|png|jpe?g|webp|svg)$/i, '');
  // Strip common product prefixes (colongic-, femin-, gastro-, anti-stress-, etc.)
  const stripped = slug.replace(
    /^(colongic|femin|gastro(?:-balance)?|anti-stress|babies(?:-and-kids)?|kids|smart-start|pets|beauty|tablets|pearls|hair|nails|skin|pack)[-_]/,
    '',
  );
  // Lookup direct
  if (INGREDIENT_LABELS[stripped]) return INGREDIENT_LABELS[stripped];
  // Lookup compact (no dashes)
  const compact = stripped.replace(/[-_]/g, '');
  for (const [key, label] of Object.entries(INGREDIENT_LABELS)) {
    if (key.replace(/[-_]/g, '') === compact) return label;
    // Partial match — does the stripped slug contain the key as a substring?
    if (stripped.includes(key) || compact.includes(key.replace(/-/g, ''))) {
      return label;
    }
  }
  // Fallback: humanise the slug
  const humanised = stripped
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return {title: alt || humanised || 'Научно проучване'};
}
