import type {ProductReviewSummary, ProductReviewNode} from '@cloudcart/nitro';
import {StarRating} from './StarRating';
import {StarIcon} from '@heroicons/react/20/solid';

interface ReviewListProps {
  reviews: ProductReviewNode[];
  summary: ProductReviewSummary | null;
  totalCount: number;
}

/**
 * Customer reviews block on PDP — full BG, with rating distribution sidebar,
 * verified badge per review, and graceful replies rendering.
 *
 * Real review data ships from CloudCart Storefront API; we don't have customer
 * profile photos so we render initials in a brand pink avatar circle. Each
 * review title (when present) is bold; comment body is below.
 */
export function ReviewList({reviews, summary, totalCount}: ReviewListProps) {
  if (!summary || totalCount === 0) return null;

  return (
    <section className="bb-reviews-pdp" aria-labelledby="bb-reviews-pdp-title">
      <div className="bb-reviews-pdp-head">
        <span className="bb-reviews-pdp-tag">Отзиви от истински клиенти</span>
        <h2 id="bb-reviews-pdp-title">Какво казват те за продукта</h2>
      </div>

      <div className="bb-reviews-pdp-layout">
        <ReviewSummary summary={summary} totalCount={totalCount} reviews={reviews} />
        <div className="bb-reviews-pdp-list">
          {reviews.map((review) => (
            <ReviewItem key={review.id} review={review} />
          ))}
        </div>
      </div>

      <style>{`
        .bb-reviews-pdp {
          margin: 56px 0;
          padding: 48px 36px;
          background: white;
          border-radius: 24px;
          border: 1px solid rgba(10, 37, 64, 0.06);
        }
        @media (max-width: 720px) {
          .bb-reviews-pdp { padding: 32px 22px; border-radius: 18px; margin: 40px 0; }
        }
        .bb-reviews-pdp-head {
          margin-bottom: 32px;
          text-align: center;
        }
        .bb-reviews-pdp-tag {
          display: inline-block;
          font-size: 11px; font-weight: 800;
          letter-spacing: 1.4px;
          text-transform: uppercase;
          color: var(--color-brand-pink);
          padding: 5px 12px;
          background: var(--color-pink-1);
          border-radius: 999px;
          margin-bottom: 12px;
        }
        .bb-reviews-pdp-head h2 {
          font-size: clamp(24px, 3.4vw, 32px);
          font-weight: 800;
          letter-spacing: -0.6px;
          line-height: 1.1;
          color: var(--color-ink);
          margin: 0;
        }

        .bb-reviews-pdp-layout {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 48px;
          align-items: flex-start;
        }
        @media (max-width: 880px) {
          .bb-reviews-pdp-layout { grid-template-columns: 1fr; gap: 32px; }
        }

        /* ─── Summary sidebar ─── */
        .bb-review-summary {
          padding: 24px;
          background: var(--color-cream-2);
          border-radius: 18px;
        }
        @media (max-width: 880px) {
          .bb-review-summary { padding: 22px; }
        }
        .bb-review-summary-top {
          display: flex; align-items: baseline; gap: 14px;
          padding-bottom: 18px;
          border-bottom: 1px solid rgba(10, 37, 64, 0.08);
          margin-bottom: 18px;
        }
        .bb-review-summary-num {
          font-family: var(--font-serif);
          font-style: italic;
          font-weight: 500;
          font-size: 56px;
          letter-spacing: -2px;
          line-height: 1;
          color: var(--color-ink);
        }
        .bb-review-summary-count {
          font-size: 13px;
          color: rgba(10, 37, 64, 0.6);
          margin-top: 6px;
        }
        .bb-review-dist {
          display: flex; flex-direction: column; gap: 6px;
        }
        .bb-review-dist-row {
          display: flex; align-items: center; gap: 8px;
          font-size: 12px;
        }
        .bb-review-dist-label {
          color: rgba(10, 37, 64, 0.6);
          width: 28px; text-align: right;
        }
        .bb-review-dist-bar {
          flex: 1; height: 6px;
          background: white;
          border-radius: 999px;
          overflow: hidden;
        }
        .bb-review-dist-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--color-brand-pink), #f5a623);
          border-radius: 999px;
          transition: width 0.4s ease;
        }
        .bb-review-dist-count {
          width: 32px; text-align: right;
          color: rgba(10, 37, 64, 0.45);
          font-weight: 600;
        }

        /* ─── Individual review item ─── */
        .bb-review-list {
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .bb-review-item {
          padding: 22px 0;
          border-bottom: 1px solid rgba(10, 37, 64, 0.08);
        }
        .bb-review-item:first-child { padding-top: 0; }
        .bb-review-item:last-child { border-bottom: 0; padding-bottom: 0; }
        .bb-review-row {
          display: flex; align-items: flex-start; gap: 14px;
        }
        .bb-review-avatar {
          width: 44px; height: 44px;
          border-radius: 999px;
          background: linear-gradient(135deg, var(--color-pink-1), var(--color-pink-2));
          color: var(--color-brand-pink);
          display: flex; align-items: center; justify-content: center;
          font-weight: 800;
          font-size: 14px;
          flex-shrink: 0;
          font-family: var(--font-serif);
          font-style: italic;
        }
        .bb-review-body { flex: 1; min-width: 0; }
        .bb-review-meta {
          display: flex; align-items: center; gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 4px;
        }
        .bb-review-name {
          font-size: 14px;
          font-weight: 800;
          color: var(--color-ink);
        }
        .bb-review-verified {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.3px;
          color: #15803d;
          padding: 2px 8px;
          background: rgba(34, 197, 94, 0.1);
          border-radius: 999px;
        }
        .bb-review-verified svg { width: 10px; height: 10px; }
        .bb-review-date {
          font-size: 11.5px;
          color: rgba(10, 37, 64, 0.45);
          font-weight: 500;
          margin-left: auto;
        }
        .bb-review-stars {
          margin: 4px 0 8px;
        }
        .bb-review-title {
          font-size: 14.5px;
          font-weight: 800;
          color: var(--color-ink);
          margin: 0 0 6px;
          letter-spacing: -0.2px;
        }
        .bb-review-comment {
          font-size: 13.5px;
          line-height: 1.65;
          color: rgba(10, 37, 64, 0.78);
          margin: 0;
        }

        /* ─── Reply ─── */
        .bb-review-replies {
          margin-top: 14px;
          padding: 14px 16px;
          background: var(--color-cream-2);
          border-radius: 12px;
          border-left: 3px solid var(--color-brand-pink);
        }
        .bb-review-reply { display: flex; gap: 10px; }
        .bb-review-reply + .bb-review-reply { margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(10, 37, 64, 0.08); }
        .bb-review-reply-av {
          width: 28px; height: 28px;
          border-radius: 999px;
          background: var(--color-brand-pink);
          color: white;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 800;
          flex-shrink: 0;
        }
        .bb-review-reply-meta {
          font-size: 12px;
          font-weight: 700;
          color: var(--color-ink);
          margin-bottom: 4px;
        }
        .bb-review-reply-meta time {
          font-weight: 500;
          color: rgba(10, 37, 64, 0.45);
          margin-left: 6px;
          font-size: 11px;
        }
        .bb-review-reply-text {
          font-size: 12.5px;
          line-height: 1.55;
          color: rgba(10, 37, 64, 0.72);
          margin: 0;
        }
      `}</style>
    </section>
  );
}

function ReviewSummary({summary, totalCount, reviews}: {summary: ProductReviewSummary; totalCount: number; reviews: ProductReviewNode[]}) {
  // Calculate rating distribution
  const distribution = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((r) => r.rating === star).length;
    return {star, count, percentage: totalCount > 0 ? (count / totalCount) * 100 : 0};
  });

  return (
    <div className="bb-review-summary">
      <div className="bb-review-summary-top">
        <span className="bb-review-summary-num">{summary.averageRating.toFixed(1)}</span>
        <div>
          <StarRating rating={summary.averageRating} size="md" showEmpty />
          <div className="bb-review-summary-count">
            {totalCount} {totalCount === 1 ? 'отзив' : 'отзива'}
          </div>
        </div>
      </div>

      <div className="bb-review-dist">
        {distribution.map(({star, count, percentage}) => (
          <div key={star} className="bb-review-dist-row">
            <span className="bb-review-dist-label">{star}</span>
            <StarIcon className="size-3.5 text-amber-400 shrink-0" />
            <div className="bb-review-dist-bar">
              <div className="bb-review-dist-fill" style={{width: `${percentage}%`}} />
            </div>
            <span className="bb-review-dist-count">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewItem({review}: {review: ProductReviewNode}) {
  return (
    <div className="bb-review-item">
      <div className="bb-review-row">
        <div className="bb-review-avatar" aria-hidden="true">{review.author.initials}</div>
        <div className="bb-review-body">
          <div className="bb-review-meta">
            <span className="bb-review-name">{review.author.name}</span>
            <span className="bb-review-verified" title="Проверен клиент">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Проверен
            </span>
            <span className="bb-review-date">{formatDate(review.createdAt)}</span>
          </div>

          <div className="bb-review-stars">
            <StarRating rating={review.rating} showEmpty />
          </div>

          {review.title && <h4 className="bb-review-title">{review.title}</h4>}
          <p className="bb-review-comment">{review.comment}</p>

          {review.answers && review.answers.length > 0 && (
            <div className="bb-review-replies">
              {review.answers.map((reply) => (
                <div key={reply.id} className="bb-review-reply">
                  <div className="bb-review-reply-av">{reply.author.initials}</div>
                  <div>
                    <div className="bb-review-reply-meta">
                      {reply.author.name}
                      <time>{formatDate(reply.createdAt)}</time>
                    </div>
                    <p className="bb-review-reply-text">{reply.comment}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('bg-BG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}
