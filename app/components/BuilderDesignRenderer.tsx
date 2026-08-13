import {Fragment, useEffect, useRef, useState} from 'react';
import {Link} from 'react-router';
import {entries, headingPairs, isOn, listItems, number, text} from '~/lib/builder-settings';
import {readMarker, renderMarker, type SectionData} from '~/components/home/SectionRegistry';
import {renderPageSection} from '~/components/PageSectionRegistry';
import {ProductCard} from '~/components/ProductCard';
import {BannerSlider} from '~/components/home/HeroBannerSlider';
import {BlogCards} from '~/components/home/BlogHighlights';
import {FaqAccordion} from '~/components/home/FAQ';
import {Marquee} from '~/components/home/Marquee';
import {Reviews} from '~/components/home/Reviews';
import {ProductRail} from '~/components/home/ProductRail';
import {BundlePrice} from '~/components/home/BundleFeature';
import {
  carouselSlides,
  showcaseProducts,
  EMPTY_BUILDER_DATA,
  type BuilderData,
} from '~/lib/builder-data';

/**
 * Renders CloudCart's page-builder tree into React markup.
 *
 * A page built in the panel returns `content: null` and puts everything in
 * `builderDesign`. The Storefront API hands the same tree back as a JSON string
 * in `page.body`, so this needs no admin token and works on any storefront.
 *
 *   { children: Row[] }
 *   Row    = { children: Column[], options?: { padding_top, … } }
 *   Column = { children: Block[], width?: '1'..'12' }
 *   Block  = { map: 'text' | 'banner' | …, settings: {…} }
 *
 * Blocks that need nothing but their own settings:
 *
 *   text · title · banner · button · code · video · separator
 *
 * There is deliberately no `image` block: the panel has no such widget, and a
 * design containing one makes the builder refuse to open the whole page with
 * "Widget Not Found: image". A single picture is a `banner` with one entry.
 *
 * Blocks that need catalogue data (`product-showcase`, `bundle-products`,
 * `carousel`, `recent-articles`) get it from the loader via `builder-data`; a
 * block whose products have gone missing renders nothing rather than an empty
 * frame.
 *
 * An unknown block is skipped silently — a new widget in the panel must never
 * blank out a page.
 */

type BuilderNode = {
  children?: BuilderNode[];
  options?: Record<string, unknown>;
  width?: string;
  id?: string;
  map?: string;
  settings?: Record<string, unknown>;
};

interface Props {
  design: BuilderNode | null | undefined;
  /** Loader data for the marker-driven homepage sections. */
  sections?: SectionData;
  /** Catalogue data the route loaded for the showcase and article blocks. */
  data?: BuilderData;
  /**
   * Вдига първото заглавие до H1. Включва се на началната, защото тя няма
   * друго заглавие от първо ниво; целевите страници си имат свое.
   */
  firstHeadingIsH1?: boolean;
}

/** Blocks that are recognised but wait on data we do not load yet. */
const DATA_BLOCKS = new Set([
  'showcase',
  'product',
  'add-to-cart',
  'text-carousel',
  'request_review',
  'order-details',
  'store_locations',
  'cc_form',
]);

/**
 * A row's own settings, as the panel stores them.
 *
 * The builder lets the merchant set a class per row (`class_name`) plus
 * padding, a background colour or image, full-width and desktop/mobile
 * visibility. Honouring all of it is what makes the panel enough to lay a page
 * out — the class is the hook their CSS attaches to.
 */
function rowStyle(node: BuilderNode): React.CSSProperties {
  const o = node.options ?? {};
  const style: React.CSSProperties = {
    paddingTop: number(o.padding_top),
    paddingBottom: number(o.padding_bottom),
    marginTop: number(o.margin_top),
    marginBottom: number(o.margin_bottom),
  };

  const side = number(o.padding_side);
  if (side) {
    style.paddingLeft = side;
    style.paddingRight = side;
  }
  const sideMargin = number(o.margin_side);
  if (sideMargin) {
    style.marginLeft = sideMargin;
    style.marginRight = sideMargin;
  }

  // `type: "color"` means the colour field is the background; `type: "image"`
  // means `src` is.
  const kind = (text(o.type) || '').toLowerCase();
  const colour = text(o.color);
  if (colour && kind !== 'image') style.background = colour;

  const image = text(o.src);
  if (image) {
    style.backgroundImage = `url("${image.replace('{storage_url}', 'https://cdncloudcart.com/')}")`;
    style.backgroundSize = text(o.background_size) || 'cover';
    style.backgroundRepeat = 'no-repeat';
    style.backgroundAttachment = text(o.background_attachment) || 'scroll';
    style.backgroundPosition =
      `${text(o.background_position_x) || 'center'} ${text(o.background_position_y) || 'center'}`;
  }

  return style;
}

/** Classes a row carries: the merchant's own, plus the layout switches. */
function rowClasses(node: BuilderNode): string {
  const o = node.options ?? {};
  const classes = ['bb-bd-row'];
  if (isOn(o.full_width)) classes.push('bb-bd-row--full');
  if (isOn(o.reverse_column_order)) classes.push('bb-bd-row--reverse');

  const visibility = (text(o.show_mobile_or_desktop) || '').toLowerCase();
  if (visibility === 'desktop') classes.push('bb-bd-desktop-only');
  if (visibility === 'mobile') classes.push('bb-bd-mobile-only');

  const align = text(o.vertical_align_class);
  if (align) classes.push(`bb-bd-${align.replace(/^_/, '')}`);

  const own = text(o.class_name);
  if (own) classes.push(own.trim());

  return classes.join(' ');
}

/**
 * Does the row carry exactly this class?
 *
 * `includes` would be enough today and wrong tomorrow: `bb-row-bloghead`
 * contains `bb-row-blog`, so a substring test makes the head row answer for the
 * cards row.
 */
/** Само текстът на един елемент - за полета, които не са HTML. */
function stripTagsPlain(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function rowHasClass(rowClass: string, name: string): boolean {
  return rowClass.split(/\s+/).includes(name);
}

function colSpan(width: string | undefined): string {
  const w = number(width) ?? 6;
  const twelfths = Math.round(w * 2);
  return `bb-bd-col-${Math.max(1, Math.min(12, twelfths))}`;
}

/**
 * Raw HTML from the "Код" block, with its <script> tags actually executed.
 *
 * React does not run scripts that arrive through dangerouslySetInnerHTML, so a
 * merchant pasting a working snippet would see the markup and none of the
 * behaviour. Re-creating each script node after mount is what makes the block
 * behave the way it does in the panel's preview.
 */
function CodeBlock({html}: {html: string}) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = host.current;
    if (!root) return;
    const added: HTMLScriptElement[] = [];
    for (const old of Array.from(root.querySelectorAll('script'))) {
      const script = document.createElement('script');
      for (const attr of Array.from(old.attributes)) {
        script.setAttribute(attr.name, attr.value);
      }
      script.text = old.textContent ?? '';
      old.replaceWith(script);
      added.push(script);
    }
    return () => {
      for (const s of added) s.remove();
    };
  }, [html]);

  return <div ref={host} className="bb-bd-code" dangerouslySetInnerHTML={{__html: html}} />;
}

/**
 * Дълъг текст, който се разгъва - съдържанието идва от панела, поведението от
 * тук.
 *
 * Правилото е видимо в редактора: каквото е между **двете хоризонтални черти**
 * стои скрито зад „Прочети повече". Една черта означава „оттук нататък скрий".
 * Без черта блокът е обикновен текст.
 */
function FoldedText({html}: {html: string}) {
  const [open, setOpen] = useState(false);
  const parts = html.split(/<hr\s*\/?>/i);
  if (parts.length < 2) {
    return <div className="bb-bd-text bb-prose" dangerouslySetInnerHTML={{__html: html}} />;
  }
  const [head, folded, ...rest] = parts;
  const tail = rest.join('');

  return (
    <div className="bb-bd-text bb-prose">
      <div dangerouslySetInnerHTML={{__html: head}} />
      <button
        type="button"
        className="bb-bd-readmore"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? 'Скрий' : 'Прочети повече'}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
      {open && <div className="bb-bd-folded" dangerouslySetInnerHTML={{__html: folded}} />}
      {tail && <div dangerouslySetInnerHTML={{__html: tail}} />}
    </div>
  );
}

function Banner({block}: {block: BuilderNode}) {
  const settings = block.settings ?? {};
  const list = entries(settings.banners);
  if (!list.length) return null;
  const perRow = Math.max(1, Math.min(6, number(settings.per_row) ?? 1));
  const title = text(settings.title);

  return (
    <div className="bb-bd-banners" style={{'--bb-bd-per-row': perRow} as React.CSSProperties}>
      {title && <h3 className="bb-bd-banners-title">{title}</h3>}
      {list.map((banner, i) => {
        const src = banner.src || banner.image;
        if (!src) return null;
        const img = (
          <img
            src={src}
            alt={banner.alt || banner.title || ''}
            loading="lazy"
            className="bb-bd-banner-img"
          />
        );
        // The panel writes the link as `link_value`; `link`/`url` are what a
        // hand-written block uses.
        const href = banner.link || banner.url || banner.link_value;
        return (
          <div key={i} className="bb-bd-banner">
            {href ? (
              <LinkOrAnchor href={href} className="bb-bd-banner-link">
                {img}
              </LinkOrAnchor>
            ) : (
              img
            )}
          </div>
        );
      })}
    </div>
  );
}

function Buttons({block}: {block: BuilderNode}) {
  const settings = block.settings ?? {};
  const list = entries(settings.buttons);
  if (!list.length) return null;
  const position = text(settings.position) || 'text-center';

  return (
    <div className={`bb-bd-buttons bb-bd-${position}`}>
      {list.map((button, i) => {
        const label = button.text || button.title;
        const href = button.link || button.url;
        if (!label || !href) return null;
        return (
          <LinkOrAnchor key={i} href={href} className="bb-bd-button">
            {label}
          </LinkOrAnchor>
        );
      })}
    </div>
  );
}

/** Internal paths go through the router; anything else is a plain anchor. */
function LinkOrAnchor({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const internal = href.startsWith('/') && !href.startsWith('//');
  if (internal) {
    return (
      <Link to={href} className={className} prefetch="intent">
        {children}
      </Link>
    );
  }
  return (
    <a
      href={href}
      className={className}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
    >
      {children}
    </a>
  );
}


/**
 * A product showcase: the products the merchant picked, in our card design.
 *
 * "Слайдер" in the widget's settings switches between the homepage rail and a
 * plain grid — the same toggle the panel already shows.
 */
function Showcase({block, data}: {block: BuilderNode; data: BuilderData}) {
  const settings = block.settings ?? {};
  const products = showcaseProducts(settings, data);
  if (!products.length) return null;
  const title = text(settings.title);
  const perRow = Math.max(2, Math.min(5, number(settings.per_row) ?? 4));

  return (
    <div className="bb-bd-showcase">
      {title && <h2 className="bb-bd-showcase-title">{title}</h2>}
      {isOn(settings.enable_slider) ? (
        <ProductRail products={products} limit={products.length} />
      ) : (
        <div
          className="bb-bd-showcase-grid"
          style={{'--bb-bd-per-row': perRow} as React.CSSProperties}
        >
          {products.map((p: any) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * The live half of "Пакет на месеца": the price and the button, taken from
 * whichever product the merchant picked in the block.
 *
 * The copy around it (eyebrow, headline, bullets) is ordinary Текст blocks, so
 * the whole section can be reworked each month without touching the code.
 */
function BundlePick({block, data}: {block: BuilderNode; data: BuilderData}) {
  const product = showcaseProducts(block.settings ?? {}, data)[0];
  if (!product) return null;
  return <BundlePrice product={product} />;
}

/**
 * An image slider — the shop's own hero slider, driven by the slides the
 * merchant uploaded. Mobile gets its own file when they uploaded one.
 */
function Carousel({block}: {block: BuilderNode}) {
  const slides = carouselSlides(block.settings ?? {}).map((slide) => ({
    desktop: slide.src,
    mobile: slide.mobile,
    link: slide.link,
  }));
  if (!slides.length) return null;
  return <BannerSlider slides={slides} />;
}

/** Recent blog articles. */
function Articles({
  block,
  data,
  rowClass,
}: {
  block: BuilderNode;
  data: BuilderData;
  rowClass: string;
}) {
  const settings = block.settings ?? {};
  const count = Math.max(1, Math.min(12, number(settings.count) ?? 3));
  const list = data.articles.slice(0, count);
  if (!list.length) return null;
  const perRow = Math.max(1, Math.min(4, number(settings.per_row) ?? 3));
  const title = text(settings.title);

  // In a row the merchant marked as the blog section, the same cards the coded
  // homepage draws — cover, rubric, excerpt, „Прочети“ — instead of the plain
  // list a generic page gets.
  if (rowHasClass(rowClass, 'bb-row-blog')) {
    return <BlogCards articles={list as any} perRow={perRow} />;
  }

  return (
    <div className="bb-bd-articles">
      {title && <h2 className="bb-bd-showcase-title">{title}</h2>}
      <div
        className="bb-bd-articles-grid"
        style={{'--bb-bd-per-row': perRow} as React.CSSProperties}
      >
        {list.map((article: any) => (
          <Link
            key={article.id ?? article.handle}
            to={`/article/${article.handle}`}
            className="bb-bd-article"
            prefetch="intent"
          >
            {article.image?.url && (
              <img src={article.image.url} alt="" loading="lazy" />
            )}
            <span className="bb-bd-article-title">{article.title}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function renderBlock(
  block: BuilderNode,
  idx: number,
  sections?: SectionData,
  data: BuilderData = EMPTY_BUILDER_DATA,
  rowClass = '',
): React.ReactNode {
  const settings = block.settings ?? {};
  if (!isOn(settings.enabled, true)) return null;

  switch (block.map) {
    case 'title': {
      const value = text(settings.title);
      if (!value) return null;
      const tag = (text(settings.tag) || 'h2').toLowerCase();
      const Heading = (/^h[1-6]$/.test(tag) ? tag : 'h2') as 'h2';
      return (
        <Heading key={idx} className="bb-bd-title">
          {value}
        </Heading>
      );
    }
    case 'text': {
      const html = text(settings.text);
      if (!html) return null;
      // Бягащата лента е списък в панела и движение в кода: съдържанието се
      // пише като обикновен списък, а безкрайното въртене остава тук, защото
      // за него текстът се дублира - нещо, което CSS не може сам.
      if (rowHasClass(rowClass, 'bb-row-marquee')) {
        return <Marquee key={idx} items={listItems(html)} />;
      }
      // Отзивите: заглавието и числата се пишат в панела, а самите карти идват
      // от отзивите на магазина - те се обновяват сами и не се пишат на ръка.
      if (rowHasClass(rowClass, 'bb-row-reviews')) {
        // Класът се търси като отделна дума, за да не хване „note" вътре в
        // друг клас. ⚠️ Границата `\b` се пише тук, в редактора: през heredoc
        // тя се превръща в истински backspace и изразът тихо спира да лови.
        const rating = html.match(/<p[^>]*class="[^"]*\brating\b[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
        const note = html.match(/<p[^>]*class="[^"]*\bnote\b[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
        const head = html
          .replace(rating?.[0] ?? '', '')
          .replace(note?.[0] ?? '', '');
        return (
          <Reviews
            key={idx}
            reviews={sections?.homeReviews as any}
            heading={<div className="bb-prose" dangerouslySetInnerHTML={{__html: head}} />}
            summary={{
              rating: rating ? stripTagsPlain(rating[1]) : undefined,
              note: note ? stripTagsPlain(note[1]) : undefined,
            }}
          />
        );
      }
      // ЧЗВ: заглавията стават въпроси, текстът под тях - отговори. Списъкът с
      // въпроси се пише в панела, акордеонът остава в кода.
      if (rowHasClass(rowClass, 'bb-row-faq')) {
        const pairs = headingPairs(html);
        if (pairs.length) return <FaqAccordion key={idx} items={pairs} />;
      }
      // Текст с хоризонтална черта в него се разгъва - виж FoldedText.
      if (/<hr\s*\/?>/i.test(html)) return <FoldedText key={idx} html={html} />;
      return (
        <div key={idx} className="bb-bd-text bb-prose" dangerouslySetInnerHTML={{__html: html}} />
      );
    }
    case 'code': {
      const html = text(settings.code) || text(settings.html);
      if (!html) return null;
      // A block holding only `<!-- bb:name -->` is not markup to inject — it is
      // the merchant placing one of the shop's own sections here.
      const marker = readMarker(html);
      if (marker) {
        // `bb:page:<handle>` places a whole designed page; anything else is a
        // homepage section.
        const node = marker.startsWith('page:')
          ? renderPageSection(marker.slice('page:'.length))
          : renderMarker(marker, sections ?? {});
        return node ? <Fragment key={idx}>{node}</Fragment> : null;
      }
      return <CodeBlock key={idx} html={html} />;
    }
    case 'banner':
      return <Banner key={idx} block={block} />;
    case 'product-showcase':
    case 'bundle-products':
      // "Пакет на месеца" is one product shown as a feature, not as a card:
      // the row says so, the block only says which product.
      if (rowHasClass(rowClass, 'bb-row-bundle')) {
        return <BundlePick key={idx} block={block} data={data} />;
      }
      return <Showcase key={idx} block={block} data={data} />;
    case 'carousel':
      return <Carousel key={idx} block={block} />;
    // „Продуктови отзиви" от панела: рисува се секцията с отзивите на магазина.
    // Имената се приемат и в двата вида, защото панелът пише едните с долна
    // черта (`request_review`), а другите с тире.
    case 'product_review':
    case 'product-review':
    case 'product-reviews':
      return <Reviews key={idx} reviews={sections?.homeReviews as any} />;
    case 'recent-articles':
      return <Articles key={idx} block={block} data={data} rowClass={rowClass} />;
    case 'button':
      return <Buttons key={idx} block={block} />;
    case 'separator': {
      const height = number(settings.height) ?? 1;
      return (
        <hr
          key={idx}
          className="bb-bd-separator"
          style={{
            borderTopStyle: (text(settings.style) as React.CSSProperties['borderTopStyle']) || 'solid',
            borderTopColor: text(settings.color) || 'rgba(10,37,64,0.12)',
            borderTopWidth: height,
            width: `${number(settings.width) ?? 100}%`,
            marginTop: number(settings.margin_top) ?? 0,
            marginBottom: number(settings.margin_bottom) ?? 0,
          }}
        />
      );
    }
    case 'video': {
      const src = text(settings.src) || text(settings.url);
      if (!src) return null;
      // The panel stores either an uploaded file (type "html5") or an embed URL.
      if ((text(settings.type) || '').toLowerCase() === 'html5') {
        return (
          <video
            key={idx}
            className="bb-bd-video-el"
            src={src}
            controls={isOn(settings.controls, true)}
            autoPlay={isOn(settings.autoplay)}
            loop={isOn(settings.loop)}
            muted={isOn(settings.autoplay)}
            playsInline
          />
        );
      }
      return (
        <div key={idx} className="bb-bd-video">
          <iframe
            src={src}
            title="Видео"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }

    default:
      if (block.map && !DATA_BLOCKS.has(block.map) && process.env.NODE_ENV !== 'production') {
        console.warn('builder: no renderer for block "%s"', block.map);
      }
      return null;
  }
}

function renderColumn(
  col: BuilderNode,
  idx: number,
  sections?: SectionData,
  data?: BuilderData,
  rowClass = '',
): React.ReactNode {
  return (
    <div key={idx} className={`bb-bd-col ${colSpan(col.width)}`}>
      {(col.children ?? []).map((block, i) => renderBlock(block, i, sections, data, rowClass))}
    </div>
  );
}

function renderRow(
  row: BuilderNode,
  idx: number,
  sections?: SectionData,
  data?: BuilderData,
): React.ReactNode {
  const classes = rowClasses(row);
  return (
    <div key={idx} className={classes} style={rowStyle(row)}>
      {(row.children ?? []).map((col, i) => renderColumn(col, i, sections, data, classes))}
    </div>
  );
}

/** Does this tree contain anything we can actually draw? */
export function builderHasContent(design: BuilderNode | null | undefined): boolean {
  if (!design) return false;
  let found = false;
  const walk = (node: BuilderNode) => {
    if (found) return;
    if (node.map && !DATA_BLOCKS.has(node.map)) found = true;
    for (const child of node.children ?? []) walk(child);
  };
  walk(design);
  return found;
}

/** Parse the JSON string the Storefront API returns in `page.body`. */
export function parseBuilderDesign(body: string | null | undefined): BuilderNode | null {
  if (!body) return null;
  const raw = body.trim();
  if (!raw.startsWith('{') && !raw.startsWith('[')) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as BuilderNode) : null;
  } catch {
    return null;
  }
}

/**
 * Първото заглавие на сглобената страница става H1.
 *
 * ⚠️ Началната нямаше H1 - нито едно заглавие от първо ниво на най-важния
 * адрес на магазина. Причината не е в кода: заглавието „Здравето започва в
 * микробиома" се пише в панела, в текстов блок на конструктора, и мърчантът
 * съвсем естествено го е сложил като H2. Тоест колкото и да се пипа
 * компонентът, страницата пак излизаше без H1.
 *
 * Затова повишението става тук, върху дървото, преди рисуването - така H1-ът
 * е в HTML-а, който получава търсачката, а не се дописва после в браузъра.
 * Пипа се САМО първото срещнато заглавие и само нивото на тага: класът остава,
 * значи на екрана нищо не помръдва. Панелът може да се пренаписва свободно -
 * следващият текст пак ще получи своя H1.
 */
function promoteFirstHeadingToH1(node: BuilderNode, done: {yes: boolean}): BuilderNode {
  if (done.yes || !node) return node;

  if (node.settings) {
    for (const [key, value] of Object.entries(node.settings)) {
      if (done.yes || typeof value !== 'string') continue;
      const open = value.search(/<h2\b/i);
      if (open === -1) continue;
      const close = value.toLowerCase().indexOf('</h2>', open);
      if (close === -1) continue;
      done.yes = true;
      const patched =
        value.slice(0, open) +
        value.slice(open, close).replace(/^<h2\b/i, '<h1') +
        '</h1>' +
        value.slice(close + '</h2>'.length);
      node = {...node, settings: {...node.settings, [key]: patched}};
      break;
    }
  }

  if (node.children?.length) {
    node = {...node, children: node.children.map((c) => promoteFirstHeadingToH1(c, done))};
  }
  return node;
}

export function BuilderDesignRenderer({design, sections, data, firstHeadingIsH1}: Props) {
  if (!design || !design.children) return null;
  const tree = firstHeadingIsH1 ? promoteFirstHeadingToH1(design, {yes: false}) : design;
  if (!tree.children) return null;
  return (
    <div className="bb-bd">
      {tree.children.map((row, i) => renderRow(row, i, sections, data))}
    </div>
  );
}
