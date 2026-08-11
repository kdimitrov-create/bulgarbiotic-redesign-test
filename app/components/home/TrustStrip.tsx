/**
 * Trust strip — 4 USP cards in a row, sits directly under Hero, above Marquee.
 * Each card: icon (in pastel-tinted square) + title + sub.
 */
export function TrustStrip() {
  const items: Array<{
    title: string;
    sub?: string;
    accent: 'pink' | 'blue' | 'cream' | 'pinkDark';
    icon: JSX.Element;
  }> = [
    {
      title: 'Произведено в България',
      accent: 'pink',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2l9 4v6c0 5.5-3.5 9.5-9 10-5.5-.5-9-4.5-9-10V6l9-4z" />
          <path d="M9 12.5l2 2 4.5-4.5" />
        </svg>
      ),
    },
    {
      title: 'Безплатна доставка над 50 €',
      accent: 'blue',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="6" width="14" height="12" rx="2" />
          <path d="M17 10h3l1.5 3v5h-4.5" />
          <circle cx="7" cy="20" r="2" />
          <circle cx="17.5" cy="20" r="2" />
        </svg>
      ),
    },
    {
      title: 'Лабораторно тестван',
      accent: 'cream',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 4h6l-1 4h-4z" />
          <path d="M14 8c2.5 1.5 4 4 4 7v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4c0-3 1.5-5.5 4-7" />
          <path d="M10 14h4M10 17h4" />
        </svg>
      ),
    },
    {
      title: '30-дневна гаранция',
      accent: 'pinkDark',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          <path d="M3.5 9h17M3.5 15h17" />
          <path d="M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z" />
        </svg>
      ),
    },
  ];

  return (
    <section className="bb-trust-strip">
      <div className="bb-container">
        <div className="bb-trust-grid">
          {items.map((item) => (
            <div key={item.title} className={`bb-trust-card bb-trust-card--${item.accent}`}>
              <div className="bb-trust-icon">{item.icon}</div>
              <div className="bb-trust-text">
                <div className="bb-trust-title">{item.title}</div>
                {item.sub ? <div className="bb-trust-sub">{item.sub}</div> : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
