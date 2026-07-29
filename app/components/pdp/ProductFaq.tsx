/**
 * Product FAQ — standalone accordion, rendered near the bottom of the PDP.
 *
 * Extracted from the old ProductTabs "ЧЗВ" tab so that questions live in a
 * single accordion that behaves identically on desktop AND mobile (client 5c:
 * unify tab behaviour — no more "tabs on desktop, reveal-on-click on mobile").
 * Native <details>/<summary> = same expand/collapse everywhere.
 */
const FAQ_ITEMS: Array<{q: string; a: string}> = [
  {
    q: 'Безопасно ли е за дълъг прием?',
    a: 'Да — пробиотиците на Bactology са натурални и подходящи за непрекъснат прием. В първите 2-3 дни може да усетиш леко подуване, докато микрофлората се адаптира. Това е нормално и преминава бързо.',
  },
  {
    q: 'Може ли да го приемам с антибиотик?',
    a: 'Препоръчваме да приемаш пробиотика 2-3 часа след антибиотика. Това гарантира, че пробиотичните бактерии остават живи и активни.',
  },
  {
    q: 'Веганско ли е?',
    a: 'Капсулите ни са изцяло растителни (DR-Caps™). Самите пробиотични щамове са получени от вегетариански култури.',
  },
  {
    q: 'Подходящ ли е при непоносимост към лактоза?',
    a: 'Формулите ни не съдържат лактоза, глутен или соя. Идеален избор за хора с хранителни чувствителности.',
  },
  {
    q: 'Как се съхранява?',
    a: 'На сухо и хладно място, под 25°C. Не е необходимо да се пази в хладилник — нашите щамове са стабилни при стайна температура.',
  },
];

export function ProductFaq() {
  return (
    <section id="faq" className="max-w-3xl mx-auto px-5 py-12 md:py-16" aria-labelledby="bb-pdp-faq-title">
      <div className="text-center mb-8">
        <span className="inline-block text-[11px] font-bold uppercase tracking-[1.4px] text-[var(--color-brand-pink)] mb-3">
          Често задавани въпроси
        </span>
        <h2 id="bb-pdp-faq-title" className="text-2xl md:text-3xl font-extrabold text-[var(--color-ink)] tracking-tight">
          Имаш въпрос? Имаме отговор.
        </h2>
      </div>
      <div className="flex flex-col gap-3">
        {FAQ_ITEMS.map((item) => (
          <details
            key={item.q}
            className="group border border-gray-200 rounded-xl p-4 bg-white transition-colors hover:border-gray-300 open:border-[var(--color-pink-2)]"
          >
            <summary className="cursor-pointer list-none flex items-start justify-between gap-3 font-semibold text-[15px] text-[var(--color-ink)]">
              <span>{item.q}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-5 mt-0.5 text-gray-400 shrink-0 transition-transform group-open:rotate-180">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </summary>
            <div className="mt-3 text-[14px] leading-relaxed text-gray-600">{item.a}</div>
          </details>
        ))}
      </div>
    </section>
  );
}
