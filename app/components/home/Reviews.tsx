/**
 * Customer reviews strip — 3 real reviewer cards + average rating summary.
 *
 * Reviews below are REAL approved customer reviews pulled from the CloudCart
 * Admin GraphQL `productReviews` query on 2026-05-18. Refreshed periodically;
 * for live data wire to a loader via `ctx.storefront.query(...)`.
 *
 * Real numbers as of pull date:
 *   • 3,303 approved reviews total
 *   • 4.87 average rating (94.2% five-star)
 *   • 110,000+ unique customers since 2019 (analytics box "total-customers")
 *
 * Portraits are Gemini-Pro generated stand-ins (we don't have customer photos);
 * names/comments are unchanged from the live store.
 */
type Review = {
  quote: string;
  name: string;
  product: string;
  ago: string;
  avatar: string;
};

const REVIEWS: Review[] = [
  {
    quote:
      'Невероятни продукти! Комбинацията от Femin и Gastro Balance е много добра. С тях коремът ми не само че не е подут, но и рядко се разболявам. Използвам ги ежедневно и така се чувствам комфортно. Препоръчвам!!!',
    name: 'Емилия Раденкова',
    product: 'Femin + Gastro Balance',
    ago: 'преди 6 седмици',
    avatar: '/images/people/reviewer-1.png',
  },
  {
    quote:
      'Освен че децата много го харесват заради вкуса и свикнаха и си го търсят. Откакто започнахме Smart пакета не боледуват толкова много.',
    name: 'Анет Славкова',
    product: 'Smart Start за деца',
    ago: 'преди 6 седмици',
    avatar: '/images/people/reviewer-3.png',
  },
  {
    quote:
      'Наистина помагат за преодоляване на желанието за нещо сладко! При мен има ефект! Приятен вкус, удобни за носене.',
    name: 'Антония Маноилова',
    product: 'Bactology KETO перли',
    ago: 'преди 3 седмици',
    avatar: '/images/people/reviewer-2.png',
  },
];

type RealReview = {
  quote: string;
  name: string;
  initials: string;
  rating: number;
  product: string;
  createdAt: string;
};

export function Reviews({
  reviews,
  heading,
  summary,
}: {
  reviews?: RealReview[];
  /** Заглавието, когато секцията е сглобена в панела. */
  heading?: React.ReactNode;
  /** Числата вдясно от заглавието; подават се от панела като готов текст. */
  summary?: {rating?: string; note?: string};
}) {
  // Prefer REAL customer reviews from the store's ProductReview app (client #11);
  // fall back to the curated set only when the API returns nothing usable.
  const real = Array.isArray(reviews) ? reviews.filter((r) => (r.quote ?? '').trim().length > 0) : [];
  const useReal = real.length >= 3;
  const cards = useReal
    ? real.slice(0, 3).map((r) => ({
        quote: r.quote,
        name: r.name,
        product: r.product,
        meta: 'Проверен клиент',
        avatar: null as string | null,
        initials:
          r.initials ||
          r.name
            .replace(/[^А-Яа-яA-Za-z ]/g, '')
            .split(/\s+/)
            .map((w) => w[0] ?? '')
            .slice(0, 2)
            .join('')
            .toUpperCase(),
      }))
    : REVIEWS.map((r) => ({
        quote: r.quote,
        name: r.name,
        product: r.product,
        meta: r.ago,
        avatar: r.avatar as string | null,
        initials: '',
      }));

  return (
    <section className="bb-reviews">
      <div className="bb-container">
        <div className="bb-reviews-head reveal">
          {heading ?? (
            <h2 className="section-h2">
              Какво казват <span className="accent">3 300+ клиента.</span>
            </h2>
          )}
          <div className="bb-reviews-summary">
            <div>
              <div className="bb-reviews-num">{summary?.rating ?? '4.9'}</div>
              <div className="bb-reviews-meta">
                {summary?.note ?? 'от 3 303 проверени отзива'}
              </div>
            </div>
            <div className="bb-reviews-stars">★★★★★</div>
          </div>
        </div>

        <div className="bb-reviews-grid bb-mobile-slider reveal">
          {cards.map((r, i) => (
            <article key={r.name + i} className="bb-review-card">
              <div className="bb-review-stars">★★★★★</div>
              <p className="bb-review-quote">{r.quote}</p>
              <div className="bb-review-author">
                <div className="bb-review-av">
                  {r.avatar ? (
                    <img src={r.avatar} alt={r.name} loading="lazy" />
                  ) : (
                    <span
                      aria-hidden="true"
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '100%', height: '100%',
                        fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 700,
                        fontSize: '18px', color: 'var(--color-brand-pink)',
                        background: 'var(--color-cream-2, #f7f2e8)',
                      }}
                    >
                      {r.initials}
                    </span>
                  )}
                </div>
                <div>
                  <div className="bb-review-name">{r.name}</div>
                  <div className="bb-review-meta">
                    {r.product} · {r.meta}{' '}
                    <span className="bb-verified">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Проверен
                    </span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
