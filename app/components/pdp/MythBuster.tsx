interface Props {
  question?: string;
  answer?: React.ReactNode;
}

/**
 * Educational "myth-buster" Q&A callout — mirrors NL Beauty's pattern of
 * surfacing the most common objection BEFORE the customer reaches the tabs
 * or FAQ. Defaults to the most common probiotic myth: "isn't yoghurt enough?"
 *
 * Position: between the buy box and the deep content (tabs / reviews).
 * Visually: pink card with a quote mark, question as headline, answer as
 * flowing paragraph with key facts bolded.
 */
export function MythBuster({
  question = 'Чувал си, че пробиотиците в киселото мляко са достатъчни?',
  answer = (
    <>
      Класическото българско кисело мляко съдържа{' '}
      <strong>1–10 милиарда живи бактерии</strong> на доза — стойност, която варира силно
      според производителя, фермента и срока на годност. А концентрираните пробиотични формули
      на Bactology съдържат <strong>50 милиарда активни щама</strong> в специални{' '}
      <em>DR-Caps™ растителни капсули</em>, които издържат на стомашната киселина и доставят
      живи бактерии директно в червата.
      <br />
      <br />
      Не става дума за избор „кисело мляко срещу капсула" — става дума за{' '}
      <strong>контролирана терапевтична доза</strong>, която реално променя микробиома при
      конкретно оплакване (газове, имунитет, женско здраве, стрес).
    </>
  ),
}: Props = {}) {
  return (
    <section className="bb-myth" aria-label="Често задаван въпрос">
      <div className="bb-myth-inner">
        <span className="bb-myth-tag">Често задаван въпрос</span>
        <svg className="bb-myth-quote" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M3 9c0-3.3 2.7-6 6-6v3c-1.7 0-3 1.3-3 3h3v6H3V9zm12 0c0-3.3 2.7-6 6-6v3c-1.7 0-3 1.3-3 3h3v6h-6V9z" />
        </svg>
        <h2 className="bb-myth-q">{question}</h2>
        <div className="bb-myth-a">{answer}</div>
      </div>

      <style>{`
        .bb-myth {
          margin: 56px 0;
          padding: 48px 40px;
          background: linear-gradient(135deg, var(--color-cream-2) 0%, var(--color-pink-1) 100%);
          border-radius: 24px;
          position: relative;
          overflow: hidden;
        }
        @media (max-width: 720px) {
          .bb-myth { padding: 36px 24px; border-radius: 18px; margin: 40px 0; }
        }
        .bb-myth::before {
          content: ""; position: absolute;
          top: -80px; left: -60px;
          width: 240px; height: 240px;
          background: radial-gradient(circle, rgba(227, 22, 108, 0.14), transparent 70%);
          pointer-events: none;
        }
        .bb-myth-inner {
          position: relative;
          max-width: 720px;
          margin: 0 auto;
        }
        .bb-myth-tag {
          display: inline-block;
          font-size: 11px; font-weight: 800;
          letter-spacing: 1.4px;
          text-transform: uppercase;
          color: var(--color-brand-pink);
          padding: 5px 12px;
          background: white;
          border-radius: 999px;
          margin-bottom: 16px;
        }
        .bb-myth-quote {
          width: 32px; height: 32px;
          color: var(--color-brand-pink);
          opacity: 0.35;
          margin-bottom: 8px;
        }
        .bb-myth-q {
          font-size: clamp(22px, 3vw, 30px);
          font-weight: 800;
          line-height: 1.2;
          letter-spacing: -0.6px;
          color: var(--color-ink);
          margin: 0 0 18px;
        }
        .bb-myth-a {
          font-size: 15px;
          line-height: 1.75;
          color: rgba(10, 37, 64, 0.82);
        }
        .bb-myth-a strong {
          font-weight: 800;
          color: var(--color-ink);
        }
        .bb-myth-a em {
          font-family: var(--font-serif);
          font-style: italic;
          color: var(--color-brand-pink);
          font-weight: 500;
        }
      `}</style>
    </section>
  );
}
