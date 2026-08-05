import {useLoaderData, data, Link} from 'react-router';
import type {Route} from './+types/page.$handle';
import {getContext} from '~/lib/context';
import {getSeoMeta} from '@cloudcart/nitro';
import {RichText} from '@cloudcart/nitro-react';
import {PageShell, PageBackLink} from '~/components/PageShell';
import {
  getPageContentOverride,
  PAGES_WITH_CUSTOM_LAYOUT,
  PAGES_WITH_AUTHORED_BODY,
} from '~/lib/pages-content';

export const meta: Route.MetaFunction = ({data: d}) => {
  const page = d?.page as any;
  if (!page) return getSeoMeta({title: 'Страница | Bactology'});
  return getSeoMeta({
    title: `${page.title} | Bactology`,
    description: (page as any).seoDescription || undefined,
  });
};

/** Title fallback used when the Storefront API can't fetch a page that has
 *  a hand-authored content override. */
const HANDLE_TITLES: Record<string, string> = {
  'chesto-zadavani-vaprosi': 'Често задавани въпроси',
  'naukata-zad-bulgar-biotic': 'Науката зад Bulgar Biotic',
  'probiotik-za-bremenni': 'Пробиотик за бременни',
  'kosa-koja-i-nokti': 'Блестяща коса, кожа и нокти',
  'probiotik-ot-bactology': 'За Bulgar Biotic и Bactology',
  'abomanmet-za-byuletin': 'Абонирай се за бюлетин',
  'pateshestvie': 'Семейна екскурзия до Дисниленд в Париж',
  'mediite-za-nas': 'Медиите за нас',
};

export async function loader({params, context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  // Storefront API has intermittent 500s on some builder-built pages; if we
  // have a hand-authored override for the handle, gracefully fall back.
  const override = getPageContentOverride(params.handle);
  const page = await ctx.storefront.getPage(params.handle).catch((err: Error) => {
    if (override) {
      console.warn(`Storefront getPage(${params.handle}) failed — using override:`, err.message);
      return {
        id: '',
        title: HANDLE_TITLES[params.handle] || params.handle,
        handle: params.handle,
        body: '',
      } as const;
    }
    throw err;
  });
  if (!page) throw data('Страницата не е намерена', {status: 404});
  return {page};
}

export default function PageRoute() {
  const {page} = useLoaderData<typeof loader>();
  const handle = page.handle;

  // Route to custom layouts for the high-traffic special pages first.
  if (handle === 'pateshestvie') {
    return <DisneylandGiveawayPage page={page} />;
  }
  if (handle === 'mediite-za-nas') {
    return <MediaPressPage page={page} />;
  }
  if (handle === 'naukata-zad-bulgar-biotic') {
    return <SciencePage page={page} />;
  }

  // Default: PageShell with rich-text body content.
  return <DefaultPage page={page} />;
}

/* ============================================================ */
/*  Default page — PageShell + RichText OR pages-content override */
/* ============================================================ */

/** Detect whether `body` is real HTML (from a classic page) vs the
 *  builder-design JSON tree serialized as a string (from Page Builder).
 *  Storefront API returns the JSON tree as a string for builder-built pages —
 *  we treat that as "no real body" and prefer the override. */
function bodyIsHtml(body: string): boolean {
  if (!body) return false;
  const trimmed = body.trim();
  if (!trimmed) return false;
  // Builder-design pages start with `{"children"` (JSON tree)
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return false;
  return true;
}

/** Pages where the JSX override has its own custom hero/manifesto and the
 *  default PageShell hero would be a duplicate "two heroes" experience. */
const PAGES_WITH_OWN_HERO = new Set([
  'kosa-koja-i-nokti',
  'naukata-zad-bulgar-biotic',
  'abomanmet-za-byuletin',
]);

function DefaultPage({page}: {page: any}) {
  const body = (page.body || '').trim();
  const override = getPageContentOverride(page.handle);
  // Normally the merchant's CMS body wins and the override is only a fallback.
  // For a handful of pages the client dictated the exact copy, so there the
  // override comes first — see PAGES_WITH_AUTHORED_BODY.
  const authored = override && PAGES_WITH_AUTHORED_BODY.has(page.handle);
  const hasRealHtml = !authored && bodyIsHtml(body);
  // When the override component provides its own hero, render the shell
  // barebones (just breadcrumbs + content, full width).
  const useBarebones = override && PAGES_WITH_OWN_HERO.has(page.handle);

  return (
    <PageShell
      title={page.title}
      tag={useBarebones ? undefined : 'Страница'}
      breadcrumbs={[]}
      variant={useBarebones ? 'barebones' : 'narrow'}
    >
      {hasRealHtml ? (
        <RichText data={page.body} />
      ) : override ? (
        override()
      ) : (
        <p className="text-gray-500">
          Съдържанието на тази страница е в процес на подготовка.{' '}
          <Link to="/" className="text-[var(--color-brand-pink)] underline">
            Върни се към началото.
          </Link>
        </p>
      )}
      <PageBackLink />
    </PageShell>
  );
}

/* ============================================================ */
/*  /pages/pateshestvie — Disneyland family-trip giveaway        */
/* ============================================================ */

function DisneylandGiveawayPage({page}: {page: any}) {
  return (
    <PageShell
      title="Спечели семейна екскурзия до Дисниленд в Париж"
      tag="✦ Кампания · Декември 2025"
      lead="Купи продукти на стойност над 50 лв и автоматично участваш в томболата за семейна екскурзия до Дисниленд Париж — Bactology × Happy Family Travel."
      breadcrumbs={[]}
      variant="wide"
    >
      <div className="bb-giveaway">
        <div className="bb-giveaway-grid">
          <div className="bb-giveaway-card">
            <div className="bb-giveaway-num">1</div>
            <h3>Поръчай за 50+ лв</h3>
            <p>Сложи всичко, което те вълнува, в кошницата. Над 50 лв — поръчката участва.</p>
          </div>
          <div className="bb-giveaway-card">
            <div className="bb-giveaway-num">2</div>
            <h3>Регистрирай се</h3>
            <p>Получаваш автоматичен код за томболата на имейла си с потвърждението.</p>
          </div>
          <div className="bb-giveaway-card">
            <div className="bb-giveaway-num">3</div>
            <h3>Очаквай тегленето</h3>
            <p>Победителят се обявява в края на месеца. Свързваме се с теб по имейл.</p>
          </div>
        </div>

        <div className="bb-giveaway-prize">
          <span className="bb-giveaway-prize-tag">Голямата награда</span>
          <h2>Семейна екскурзия до Дисниленд Париж</h2>
          <ul>
            <li>Самолетни билети за 4 души</li>
            <li>4 нощувки в избран хотел до парка</li>
            <li>3-дневен пас за Disneyland Park + Walt Disney Studios</li>
            <li>Трансфер летище ↔ хотел</li>
          </ul>
          <Link to="/category/all-products" className="bb-giveaway-cta" prefetch="intent">
            Започни поръчката си
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>

        {page.body && (
          <details className="bb-giveaway-rules">
            <summary>Пълни правила и условия</summary>
            <div className="bb-prose">
              <RichText data={page.body} />
            </div>
          </details>
        )}
      </div>

      <style>{`
        .bb-giveaway { display: flex; flex-direction: column; gap: 36px; }
        .bb-giveaway-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        @media (max-width: 720px) {
          .bb-giveaway-grid { grid-template-columns: 1fr; }
        }
        .bb-giveaway-card {
          background: white;
          border: 1px solid rgba(10, 37, 64, 0.08);
          border-radius: 16px;
          padding: 26px 22px;
          text-align: center;
        }
        .bb-giveaway-num {
          width: 38px; height: 38px;
          border-radius: 999px;
          background: var(--color-brand-pink);
          color: white;
          font-weight: 800;
          font-size: 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 14px;
        }
        .bb-giveaway-card h3 {
          font-size: 17px;
          font-weight: 800;
          color: var(--color-ink);
          margin: 0 0 8px;
        }
        .bb-giveaway-card p {
          font-size: 13.5px;
          line-height: 1.55;
          color: rgba(10, 37, 64, 0.7);
          margin: 0;
        }
        .bb-giveaway-prize {
          background: linear-gradient(135deg, #0a2540 0%, #112c4d 100%);
          color: white;
          padding: 48px 40px;
          border-radius: 22px;
          text-align: center;
        }
        @media (max-width: 720px) {
          .bb-giveaway-prize { padding: 32px 24px; }
        }
        .bb-giveaway-prize-tag {
          display: inline-block;
          font-size: 11px; font-weight: 800;
          letter-spacing: 1.6px; text-transform: uppercase;
          color: #f4d585;
          padding: 5px 14px;
          background: rgba(244, 213, 133, 0.16);
          border: 1px solid rgba(244, 213, 133, 0.3);
          border-radius: 999px;
          margin-bottom: 16px;
        }
        .bb-giveaway-prize h2 {
          font-size: clamp(26px, 4vw, 38px);
          font-weight: 800;
          letter-spacing: -0.8px;
          line-height: 1.1;
          margin: 0 0 24px;
        }
        .bb-giveaway-prize ul {
          list-style: none;
          padding: 0; margin: 0 auto 28px;
          max-width: 360px;
          text-align: left;
        }
        .bb-giveaway-prize li {
          font-size: 14.5px;
          padding: 8px 0 8px 28px;
          position: relative;
          opacity: 0.88;
        }
        .bb-giveaway-prize li::before {
          content: "✓";
          position: absolute; left: 0; top: 8px;
          color: #f4d585;
          font-weight: 800;
        }
        .bb-giveaway-cta {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 14px 28px;
          background: #f4d585;
          color: #0a2540;
          border-radius: 999px;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.3px;
          text-decoration: none;
          transition: all 0.2s;
        }
        .bb-giveaway-cta:hover {
          background: white;
          color: #0a2540;
          text-decoration: none;
          transform: translateY(-2px);
          box-shadow: 0 10px 28px -8px rgba(244, 213, 133, 0.5);
        }
        .bb-giveaway-cta svg { width: 14px; height: 14px; }
        .bb-giveaway-rules {
          background: var(--color-cream-2);
          border-radius: 14px;
          padding: 18px 22px;
        }
        .bb-giveaway-rules summary {
          font-size: 13px;
          font-weight: 800;
          color: var(--color-ink);
          cursor: pointer;
          letter-spacing: 0.2px;
          list-style: none;
        }
        .bb-giveaway-rules summary::before {
          content: "▸";
          display: inline-block;
          margin-right: 8px;
          transition: transform 0.18s;
          color: var(--color-brand-pink);
        }
        .bb-giveaway-rules[open] summary::before { transform: rotate(90deg); }
        .bb-giveaway-rules > div { margin-top: 16px; }
      `}</style>
    </PageShell>
  );
}

/* ============================================================ */
/*  /pages/mediite-za-nas — Real press mentions list             */
/* ============================================================ */

// Real outlets pulled from /pages/mediite-za-nas builderDesign tree
// (CMS page id=36). Client 2026-08-05: these rows must NOT be links — only the
// four outlets on the home strip are clickable, and those go to our own
// articles. The `url` of each row is kept as the source reference behind the
// headline, deliberately not rendered.
const PRESS_LIST = [
  {outlet: 'ELLE', region: 'България', headline: '10 успели жени празнуват живота с Bulgar Biotic', url: 'https://www.elle.bg/a/10-uspeli-zheni-praznuvat-zhivota-s-bulgar-biotik'},
  {outlet: 'Cosmopolitan', region: 'България', headline: 'Bulgar Biotic — вдъхновение от традициите и природата', url: 'https://www.cosmopolitan.bg/a/bulgar-biotik-vdxnovenie-ot-tradiciite-i-prirodata'},
  {outlet: '24 часа', region: 'Daily', headline: 'Българска фирма впечатли германците с пробиотици с шоколад', url: 'https://www.24chasa.bg/bulgaria/article/17511201'},
  {outlet: 'Mediapool', region: 'News', headline: 'Изсушено кисело мляко под формата на перли в нов шоколадов пробиотик', url: 'https://www.mediapool.bg/izsusheno-kiselo-mlyako-pod-formata-na-perli-v-nov-shokoladov-probiotik-news302802.html'},
  {outlet: 'Manager', region: 'Бизнес', headline: 'Bulgar Biotic: вдъхновение от традициите и природата', url: 'https://manager.bg/общество/bulgar-biotik-vdahnovenie-ot-tradiciite-i-prirodata'},
  {outlet: 'az-жената', region: 'Здраве и красота', headline: 'Bulgar Biotic — здраве и красота', url: 'https://www.az-jenata.bg/a/5-zdrave-i-krasota/69992-bulgar-biotik'},
  {outlet: 'Mila', region: 'Lifestyle', headline: 'Bulgar Biotic и нашите традиции', url: 'https://www.mila.bg/Article/17511480'},
  {outlet: 'Mama 24', region: 'За майки', headline: 'Bulgar Biotic за цялото семейство', url: 'https://www.mama24.bg/Article/17512059'},
  {outlet: 'Cosmopolitan', region: 'България', headline: 'Празникът на майката събра 10 инфлуенсърки около обредния хляб', url: 'https://www.jenatadnes.com/hrana-za-tialoto-i-dushata/bulgar-biotik-vdahnovenie-ot-traditsiite-i-prirodata/'},
  {outlet: 'BG днес', region: 'Шоу', headline: 'Bulgar Biotic ни връща при обичаните ни празници', url: 'https://www.bgdnes.bg/shou/article/17511571'},
  {outlet: 'Bulgaria News', region: 'Новини', headline: 'Българска компания представя пробиотици в Истанбул', url: 'https://bulgarianews.bg/2024/03/27/булгар-биотик-вдъхновение-от-традици/'},
  {outlet: 'Skandal', region: 'News', headline: 'Българска компания представя пробиотици в Истанбул', url: 'https://skandal.bg/news/16553899311558/balgarska-kompaniya-predstavya-probiotitsi-v-istanbul'},
  {outlet: 'Грaнd News', region: 'EU', headline: 'Bulgar Biotic — вдъхновение от традициите и природата', url: 'https://grand-news.eu/булгар-биотик-вдъхновение-от-традици/'},
  {outlet: 'Rozali', region: 'Любопитно', headline: 'Благовещение с Bulgar Biotic', url: 'https://m.rozali.com/novini/lyubopitno/blagoveshtenie-s-bulgar-biotik.html'},
  {outlet: 'Жената днес', region: 'Здраве', headline: 'Bulgar Biotic — вдъхновение от традициите и природата', url: 'https://www.jenatadnes.com/hrana-za-tialoto-i-dushata/bulgar-biotik-vdahnovenie-ot-traditsiite-i-prirodata/'},
  {outlet: 'Actualno', region: 'News', headline: 'Bulgar Biotic — събрани публикации', url: 'https://www.actualno.com/tagnews/булгар-биотик.html'},
];

function MediaPressPage({page}: {page: any}) {
  return (
    <PageShell
      title="Медиите за нас"
      tag="Press kit · 16+ публикации"
      lead="Bulgar Biotic в медиите — реални публикации от ELLE, Cosmopolitan, 24 часа, Mediapool, Manager и още водещи български издания."
      breadcrumbs={[]}
      variant="wide"
    >
      <div className="bb-press-list">
        {PRESS_LIST.map((item, i) => (
          <div key={i} className="bb-press-list-item">
            <div className="bb-press-list-outlet">
              <span className="bb-press-list-name">{item.outlet}</span>
              <span className="bb-press-list-region">{item.region}</span>
            </div>
            <div className="bb-press-list-headline">{item.headline}</div>
          </div>
        ))}
      </div>

      <p className="bb-press-list-note">
        Журналисти и редактори — за интервюта, мостри или въпроси относно Bulgar Biotic / Bactology,
        свържи се с нас на{' '}
        <a href="mailto:bulgarbiotic.eu@gmail.com">bulgarbiotic.eu@gmail.com</a>.
      </p>

      <style>{`
        .bb-press-list {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        @media (max-width: 720px) {
          .bb-press-list { grid-template-columns: 1fr; }
        }
        /* Not a link any more (client 2026-08-05) — two columns, and no hover
           lift/invert, because those read as "click me". */
        .bb-press-list-item {
          display: grid;
          grid-template-columns: 200px 1fr;
          gap: 18px;
          align-items: center;
          padding: 18px 22px;
          background: white;
          border: 1px solid rgba(10, 37, 64, 0.08);
          border-radius: 14px;
          color: var(--color-ink);
        }
        @media (max-width: 540px) {
          .bb-press-list-item {
            grid-template-columns: 1fr;
            gap: 8px;
            padding: 16px 18px;
          }
        }
        .bb-press-list-outlet {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .bb-press-list-name {
          font-family: var(--font-serif);
          font-style: italic;
          font-weight: 500;
          font-size: 18px;
          letter-spacing: -0.4px;
          line-height: 1;
        }
        .bb-press-list-region {
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          opacity: 0.55;
        }
        .bb-press-list-headline {
          font-size: 13.5px;
          font-weight: 600;
          line-height: 1.45;
          opacity: 0.85;
        }
        .bb-press-list-note {
          margin-top: 36px;
          padding: 24px 28px;
          background: var(--color-cream-2);
          border-radius: 14px;
          font-size: 13.5px;
          line-height: 1.65;
          color: rgba(10, 37, 64, 0.75);
          text-align: center;
        }
        .bb-press-list-note a {
          color: var(--color-brand-pink);
          font-weight: 700;
          text-decoration: underline;
        }
      `}</style>
    </PageShell>
  );
}

/* ============================================================ */
/*  /pages/naukata-zad-bulgar-biotic — Science page              */
/* ============================================================ */

function SciencePage({page}: {page: any}) {
  const override = getPageContentOverride('naukata-zad-bulgar-biotic');
  const hasRealHtml = bodyIsHtml(page.body ?? '');
  // "barebones" → no built-in PageShell hero (SciencePageContent has its own
  // designer manifesto) + full container width matching the homepage.
  return (
    <PageShell
      title="Науката зад Bulgar Biotic"
      breadcrumbs={[]}
      variant="barebones"
    >
      {hasRealHtml ? <RichText data={page.body} /> : override ? override() : null}
    </PageShell>
  );
}
