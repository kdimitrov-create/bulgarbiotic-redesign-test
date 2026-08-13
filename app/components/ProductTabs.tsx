import {useState, type ReactNode} from 'react';
import {RichText} from '@cloudcart/nitro-react';

interface Props {
  descriptionHtml?: string;
  properties?: Array<{name: string; values: string[]}>;
  files?: Array<{id: string; name: string; filename: string; url: string; fileSize: number}>;
  /** Optional editorial hero image rendered above the CMS description.
   *  Pass the product's enhanced lifestyle photo for a magazine-style
   *  intro. Falls back to no hero if omitted. */
  heroImageUrl?: string;
  /** Optional caption shown over the hero. Usually the product title. */
  heroTitle?: string;
}

type Tab = {key: string; label: string; render: () => ReactNode};

/**
 * Tabbed product information panel for the PDP — replaces a long flat scroll
 * of description + specs + downloads with a focused tab strip.
 *
 * Tabs:
 *   1. Описание   — full product description (RichText from CloudCart)
 *   2. Употреба   — dosage / usage guide (static brand copy by default)
 *   3. Специф.    — properties table (from product.properties)
 *   4. Доставка   — shipping + returns info (static brand copy)
 *   5. Файлове    — downloadable PDFs / docs (when product has files)
 *   6. ЧЗВ        — frequently asked questions
 *
 * Empty tabs are auto-hidden so we don't show "Специф." for products with
 * no properties.
 */
export function ProductTabs({descriptionHtml, properties, files, heroImageUrl, heroTitle}: Props) {
  const tabs: Tab[] = [];

  // "Описание" tab removed — the description now renders as a standalone
  // <ProductDescription /> section high on the PDP (client reorder). FAQ likewise
  // extracted to <ProductFaq />. Remaining tabs: Употреба / Спец. / Доставка / Файлове.

  tabs.push({
    key: 'usage',
    label: 'Употреба',
    render: () => <UsageTabContent />,
  });

  if (properties && properties.length > 0) {
    tabs.push({
      key: 'specs',
      label: 'Спецификация',
      render: () => (
        <table className="w-full border-collapse text-sm">
          <tbody>
            {properties.map((prop) => (
              <tr key={prop.name}>
                <td className="py-2.5 px-0 text-gray-500 border-b border-gray-100 w-[40%] font-medium">{prop.name}</td>
                <td className="py-2.5 px-0 text-dark border-b border-gray-100">{prop.values.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ),
    });
  }

  tabs.push({
    key: 'shipping',
    label: 'Доставка',
    render: () => <ShippingTabContent />,
  });

  if (files && files.length > 0) {
    tabs.push({
      key: 'files',
      label: `Файлове (${files.length})`,
      render: () => (
        <ul className="list-none flex flex-col gap-2 m-0 p-0">
          {files.map((file) => (
            <li key={file.id}>
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 py-2.5 px-3.5 bg-gray-50 border border-gray-200 rounded-lg text-[0.85rem] text-dark transition-all duration-150 hover:bg-gray-100 hover:border-gray-400 hover:no-underline"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-4 shrink-0 text-gray-400">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {file.name || file.filename}
                {file.fileSize > 0 && (
                  <span className="text-gray-400 text-xs ml-auto">{formatFileSize(file.fileSize)}</span>
                )}
              </a>
            </li>
          ))}
        </ul>
      ),
    });
  }

  // FAQ ("ЧЗВ") moved OUT of the tabs into a standalone <ProductFaq /> accordion
  // near the bottom of the PDP (client 5c reorder) — consistent desktop/mobile.

  const [active, setActive] = useState(tabs[0]?.key ?? 'description');
  if (tabs.length === 0) return null;

  return (
    <div className="bb-pdp-tabs">
      <div role="tablist" aria-label="Информация за продукта" className="bb-pdp-tab-strip">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={active === tab.key}
            aria-controls={`tab-panel-${tab.key}`}
            id={`tab-${tab.key}`}
            type="button"
            className="bb-pdp-tab"
            onClick={() => setActive(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.key}
          role="tabpanel"
          id={`tab-panel-${tab.key}`}
          aria-labelledby={`tab-${tab.key}`}
          hidden={active !== tab.key}
          className="bb-pdp-tab-panel"
        >
          {active === tab.key && tab.render()}
        </div>
      ))}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}


/**
 * Editorial paired image+text row used by the Употреба / Доставка tabs.
 *
 * The static instruction tabs were a flat wall of text — boring and
 * generic next to the rich CMS description above. This row pairs each
 * instruction block with a wide editorial lifestyle photo so the page
 * acquires visual rhythm: image on one side, text on the other, with
 * a soft cream card behind. Alternates `reverse` per row so the eye
 * zig-zags down the page.
 *
 * Images come from `public/images/pdp-lifestyle/` (generated by
 * `scripts/gen-pdp-lifestyle-images.py`). They are intentionally
 * brand-neutral — no product packaging, no faces, no logos — so the
 * same set works across every SKU without retouching.
 */
function EditorialRow({
  image,
  alt,
  eyebrow,
  title,
  children,
  reverse = false,
}: {
  image: string;
  alt: string;
  eyebrow?: string;
  title: string;
  children: ReactNode;
  reverse?: boolean;
}) {
  return (
    <div className={`bb-edit-row${reverse ? ' bb-edit-row--reverse' : ''}`}>
      <div className="bb-edit-media">
        <img src={image} alt={alt} loading="lazy" />
      </div>
      <div className="bb-edit-body">
        {eyebrow && <span className="bb-edit-eyebrow">{eyebrow}</span>}
        <h3 className="bb-edit-title">{title}</h3>
        <div className="bb-edit-text">{children}</div>
      </div>
    </div>
  );
}

/**
 * Употреба tab — three editorial rows (dose / timing / duration) then a
 * compact "important notes" card. Each row is a 2-column image+text on
 * desktop; stacks on mobile.
 */
function UsageTabContent() {
  return (
    <div className="bb-tab-editorial">
      <EditorialRow
        image="/images/pdp-lifestyle/usage-dose.png"
        alt="Капсула в дланта до чаша вода - препоръчителна дневна доза"
        eyebrow="Дневна доза"
        title="1-2 капсули с чаша вода"
      >
        <p>Приеми <strong>1-2 капсули дневно</strong> по време на хранене с пълна чаша вода. При остри оплаквания - една капсула сутрин и една вечер.</p>
      </EditorialRow>

      <EditorialRow
        reverse
        image="/images/pdp-lifestyle/usage-timing.png"
        alt="Утринна сцена с агенда, кафе и капсула - кога да приемаш"
        eyebrow="Най-доброто време"
        title="Сутрин, с първото хранене"
      >
        <p>Пробиотиците работят най-добре <strong>сутрин с първото хранене</strong>, когато стомашната киселинност е по-ниска. Това дава максимална преживяемост на щамовете в червата.</p>
      </EditorialRow>

      <EditorialRow
        image="/images/pdp-lifestyle/usage-duration.png"
        alt="Седмичен трекер с отметки - продължителност на приема"
        eyebrow="Продължителност"
        title="Минимум 4 седмици"
      >
        <p>За първи резултати - <strong>минимум 4 седмици</strong> редовен прием. За устойчив дългосрочен ефект - <strong>3 месеца</strong>. Формулата е безопасна за непрекъснат прием.</p>
      </EditorialRow>

      <div className="bb-edit-notes">
        <div className="bb-edit-notes-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div className="bb-edit-notes-body">
          <h4 className="bb-edit-notes-title">Важно да знаеш</h4>
          <ul>
            <li>Съхранявай на сухо и хладно място (под 25°C)</li>
            <li>Не превишавай препоръчителната дневна доза</li>
            <li>Не е заместител на разнообразна и балансирана диета</li>
            <li>При бременност и кърмене - консултирай се с лекар</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * Доставка tab — two editorial rows (arrival / fast send) + a return-
 * policy card. Same EditorialRow pattern as UsageTabContent.
 */
function ShippingTabContent() {
  return (
    <div className="bb-tab-editorial">
      <EditorialRow
        image="/images/pdp-lifestyle/shipping-arrival.png"
        alt="Пакет на дървен праг - бърза доставка до дома"
        eyebrow="Безплатна доставка"
        title="При поръчка над 50 €"
      >
        <p>Получи поръчката си <strong>безплатно</strong> в цяла България при стойност над <strong>50 €</strong>. Доставяме чрез <strong>Еконт</strong> или <strong>Спиди</strong> - до офис, до адрес или до автомат.</p>
      </EditorialRow>

      <EditorialRow
        reverse
        image="/images/pdp-lifestyle/shipping-fast.png"
        alt="Ръчно връчване на пакет - бърза доставка"
        eyebrow="Бързо изпращане"
        title="24-48 часа в България"
      >
        <p>Поръчай <strong>до 14:00</strong> в работен ден и изпращаме същия ден. Възможно е плащане при доставка (наложен платеж). За поръчки под 50 € - куриерска такса <strong>3,06 €</strong>.</p>
      </EditorialRow>

      <EditorialRow
        image="/images/pdp-lifestyle/shipping-return.png"
        alt="Подготовка за връщане с ръчно написана картичка - лесно връщане"
        eyebrow="Връщане"
        title="30 дни без въпроси"
      >
        <p>Ако продуктът не отговаря на очакванията ти - <strong>върни го в рамките на 30 дни</strong> и получаваш парите си обратно. Без обяснения, без формуляри, без неудобни въпроси.</p>
      </EditorialRow>
    </div>
  );
}
