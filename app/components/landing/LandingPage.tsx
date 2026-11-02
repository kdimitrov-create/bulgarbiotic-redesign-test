import {Fragment, type CSSProperties, type ReactNode} from 'react';
import {Link} from 'react-router';
import type {LandingEntry, LandingPageData} from '~/lib/landing-page.server';
import {PageShell, PageBackLink} from '~/components/PageShell';
import {RichBlocks, RichInline, localHref} from './RichTextValue';
// Отделен файл, а не вграден текст: така стиловете не тежат в кода на всяка
// /page/* страница, а се зареждат (и кешират) само на страниците от метаобекти.
import landingCssUrl from './landing.css?url';

/**
 * Целева страница от метаобекти: съдържанието е от записите в админа
 * (`app/lib/landing-page.server.ts`), видът - от `landing.css`.
 *
 * Разметката и класовете повтарят блока „Код“, от който страницата е
 * пренесена (/page/longevity-bactology, 27.10.2026), за да е 1:1 със старата.
 * Каквото търговецът не пише - номерата 01/02/03, наклона на снимките,
 * петната на фона, реда „снимка вляво/вдясно“ - се решава тук, по реда на
 * секциите и по избрания цвят.
 */

/** Какво значи всеки избор в поле „Цвят“. Класът на секцията носи фона ѝ. */
const COLORS: Record<
  string,
  {theme: string; accent: string; button: string; blob: {className: string; style: CSSProperties}}
> = {
  маслинено: {
    theme: 'hepato',
    accent: 'var(--sage)',
    button: 'var(--sage-deep)',
    blob: {className: 'blob blob-sage float', style: {width: 260, height: 260, top: '-6%', right: '6%'}},
  },
  розово: {
    theme: 'menopause',
    accent: 'var(--rose)',
    button: 'var(--rose)',
    // Без `float`: в стария блок класът беше написан два пъти и браузърът
    // взимаше първия, тоест това петно никога не е плувало.
    blob: {
      className: 'blob',
      style: {
        width: 260,
        height: 260,
        bottom: '-8%',
        left: '4%',
        background: 'radial-gradient(circle, var(--rose-pop), transparent 70%)',
      },
    },
  },
  лилаво: {
    theme: 'cellular',
    accent: 'var(--lilac)',
    button: 'var(--lilac-deep)',
    blob: {className: 'blob blob-lilac float', style: {width: 280, height: 280, top: '-4%', right: '2%'}},
  },
};
const DEFAULT_COLOR = COLORS['маслинено'];

// Наклоните се редуват по реда на продуктите, както бяха в дизайна.
const FRAME_TILTS = ['-4deg', '4deg', '-3deg'];
const STICKER_TURNS = ['9deg', '-8deg', '7deg'];
const STEP_TURNS = ['-2.5deg', '1.6deg', '-1deg'];

const pick = <T,>(list: T[], i: number) => list[i % list.length];
const delay = (i: number, step: number): CSSProperties | undefined =>
  i > 0 ? {transitionDelay: `${+(i * step).toFixed(2)}s`} : undefined;

function list(value: string | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string' && v) : [];
  } catch {
    return [];
  }
}

function lines(value: string | undefined): string[] {
  return (value ?? '').split('\n').filter((l) => l.trim());
}

function link(value: string | undefined): {text: string; url: string} | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed?.url ? {text: parsed.text ?? '', url: localHref(parsed.url)} : null;
  } catch {
    return null;
  }
}

/** Текстът на rich text поле без форматиране - за менюто на страницата. */
function plain(value: string | undefined): string {
  if (!value) return '';
  try {
    const walk = (node: any): string =>
      node?.type === 'text' ? node.value ?? '' : (node?.children ?? []).map(walk).join('');
    // Абзаците се отделят с интервал, иначе „…възраст.То е…“ се слепва.
    const root = JSON.parse(value);
    return (root?.children ?? []).map(walk).join(' ').replace(/\s+/g, ' ').trim();
  } catch {
    return '';
  }
}

function SmartLink({to, className, style, children}: {to: string; className?: string; style?: CSSProperties; children: ReactNode}) {
  return to.startsWith('/') ? (
    <Link to={to} className={className} style={style} prefetch="intent">
      {children}
    </Link>
  ) : (
    <a href={to} className={className} style={style}>
      {children}
    </a>
  );
}

/* ---------------- иконки (същите като в дизайна) ---------------- */

function Logo({size}: {size: 20 | 17}) {
  const dots: Array<[number, number, number]> = [
    [11, 5, 1.7], [7, 7, 1.7], [15, 7, 1.7], [6, 11, 1.8], [11, 11, 1.9],
    [16, 11, 1.8], [8, 15, 1.6], [14, 15, 1.6], [11, 16.5, 1.4], [18.5, 17.5, 1.1],
  ];
  return (
    <>
      bact
      <svg
        width={size}
        height={size}
        viewBox="0 0 22 22"
        style={{display: 'inline-block', verticalAlign: size === 20 ? -5 : -4}}
      >
        {dots.map(([cx, cy, r]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="#8B9B4F" />
        ))}
      </svg>
      logy
    </>
  );
}

function Arrow({small, hidden}: {small?: boolean; hidden?: boolean}) {
  return (
    <svg
      width={small ? 14 : 16}
      height={small ? 10 : 12}
      viewBox="0 0 16 12"
      fill="none"
      aria-hidden={hidden || undefined}
    >
      <path d="M1 6H15M15 6L10 1M15 6L10 11" stroke="currentColor" strokeWidth={small ? 1.6 : 1.5} />
    </svg>
  );
}

function RingIcon() {
  return (
    <svg className="ring-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.1" opacity="0.55" />
      <circle cx="10" cy="10" r="5" stroke="currentColor" strokeWidth="1.1" opacity="0.8" />
      <circle cx="10" cy="10" r="1.6" fill="currentColor" />
    </svg>
  );
}

/** Бутонът „Купи“: формата на количката на магазина, с варианта на продукта. */
function BuyForm({variantId, className, style, children}: {variantId: string | null; className: string; style?: CSSProperties; children: ReactNode}) {
  if (!variantId) return null;
  return (
    <form className="cc-buy" method="post" action="/cart-actions">
      <input type="hidden" name="action" value="ADD_TO_CART" />
      <input type="hidden" name="merchandiseId" value={variantId} />
      <input type="hidden" name="quantity" value="1" />
      <input type="hidden" name="redirectTo" value="/cart" />
      <button type="submit" className={className} style={style}>
        {children} <Arrow hidden />
      </button>
    </form>
  );
}

/* ---------------- секциите ---------------- */

function Hero({entry, first}: {entry: LandingEntry; first: boolean}) {
  const v = entry.values;
  const image = entry.images.image;
  const mobile = entry.images.image_mobile;
  const button = link(v.button);
  const img = image ? (
    <img
      className="hero-img"
      src={image.url}
      alt={image.alt ?? lines(v.title).join(' ')}
      fetchPriority={first ? 'high' : undefined}
    />
  ) : null;
  return (
    <header className="hero">
      {mobile && img ? (
        <picture>
          <source media="(max-width: 720px)" srcSet={mobile.url} />
          {img}
        </picture>
      ) : (
        img
      )}
      <div className="hero-scrim" />
      <div className="blob hero-blob float" />
      <div className="blob hero-blob2 float-rev" />
      <div className="hero-content">
        <div className="hero-plate">
          <h1 className="hero-title">
            {lines(v.title).map((line, i) => (
              <span key={i} className="line">
                <span className="shine">{line}</span>
              </span>
            ))}
          </h1>
          {v.subtitle && (
            <p className="hero-sub">
              {lines(v.subtitle).map((line, i) => (
                <Fragment key={i}>
                  {i > 0 && <br />}
                  {line}
                </Fragment>
              ))}
            </p>
          )}
        </div>
        {button && (
          <div className="hero-cta">
            <SmartLink
              to={button.url}
              className="btn btn-solid"
              style={{background: '#fff', color: 'var(--ink)', borderColor: '#fff'}}
            >
              {button.text} <Arrow />
            </SmartLink>
          </div>
        )}
        {v.scroll_label && (
          <div className="hero-scroll">
            <span>{v.scroll_label}</span>
            <svg width="14" height="20" viewBox="0 0 14 20" fill="none">
              <path d="M7 1V19M7 19L1 13M7 19L13 13" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </div>
        )}
      </div>
    </header>
  );
}

function Marquee({entry}: {entry: LandingEntry}) {
  const items = list(entry.values.items);
  if (!items.length) return null;
  // Редовете се повтарят два пъти, за да тече лентата без прекъсване.
  return (
    <div className="marquee">
      <div className="marquee-track">
        {[...items, ...items].map((item, i) => (
          <span key={i} className="dot">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function Stat({item, index}: {item: LandingEntry; index: number}) {
  const value = item.values.value ?? '';
  const numeric = /^\d+$/.test(value);
  return (
    <div className="stat lng-rv-scale" style={delay(index, 0.08)}>
      <div className="num" style={numeric ? ({'--to': value} as CSSProperties) : undefined}>
        <span className="num-v">{value}</span>
      </div>
      <div className="lbl">{item.values.label}</div>
    </div>
  );
}

function TextMedia({entry}: {entry: LandingEntry}) {
  const v = entry.values;
  const image = entry.images.image;
  const stats = entry.lists.stats ?? [];
  return (
    <section className="intro">
      <div className="blob blob-sage float" style={{width: 280, height: 280, top: '10%', left: '-8%'}} />
      <div className="blob blob-gold float-rev" style={{width: 200, height: 200, bottom: '8%', right: '2%'}} />
      <div className={`wrap intro-grid${v.image_side === 'ляво' ? ' is-image-left' : ''}`}>
        <div className="lng-rv">
          {v.eyebrow && <div className="eyebrow">{v.eyebrow}</div>}
          {v.heading && (
            <h2>
              <RichInline value={v.heading} />
            </h2>
          )}
          <RichBlocks value={v.text} />
          {stats.length > 0 && (
            <div className="intro-stats">
              {stats.map((item, i) => (
                <Stat key={item.handle} item={item} index={i} />
              ))}
            </div>
          )}
        </div>
        {image && (
          <div className="intro-figure lng-rv">
            <div className="intro-photo-frame">
              <img src={image.url} alt={image.alt ?? plain(v.heading)} loading="lazy" decoding="async" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function ProductSection({entry, index, anchor}: {entry: LandingEntry; index: number; anchor: string}) {
  const v = entry.values;
  const product = entry.products.product;
  const color = COLORS[v.color ?? ''] ?? DEFAULT_COLOR;
  const number = String(index + 1).padStart(2, '0');
  const image = entry.images.image;
  const video = entry.videos.video;
  const benefits = list(v.benefits);
  const pills = list(v.pills);
  const sticker = lines(v.sticker);
  return (
    <section className={`product ${color.theme}${index % 2 ? ' rev' : ''}`} id={anchor}>
      <div className="bignum">{number}</div>
      <div className={color.blob.className} style={color.blob.style} />
      <div className="wrap product-grid">
        <div className="p-media lng-rv">
          {image && (
            <div className="p-frame" style={{'--tilt': pick(FRAME_TILTS, index)} as CSSProperties}>
              <SmartLink to={product ? `/product/${product.handle}` : '#'} className="p-frame-link">
                <div className="p-frame-tilt">
                  <img src={image.url} alt={image.alt ?? product?.title ?? ''} loading="lazy" decoding="async" />
                </div>
              </SmartLink>
            </div>
          )}
          {(v.badge_value || v.badge_label) && (
            <div className="p-badge-float">
              <div className="n">{v.badge_value}</div>
              <div className="t">{v.badge_label}</div>
            </div>
          )}
          {sticker.length > 0 && (
            <div
              className="p-sticker"
              style={{
                background: color.accent,
                color: '#fff',
                transform: `rotate(${pick(STICKER_TURNS, index)})`,
                // По-дългият надпис е с по-дребен шрифт, за да се побере в кръга.
                ...((v.sticker ?? '').length > 22 ? {fontSize: '11.5px'} : null),
              }}
            >
              {sticker.map((line, i) => (
                <Fragment key={i}>
                  {i > 0 && <br />}
                  {line}
                </Fragment>
              ))}
            </div>
          )}
        </div>
        <div className="p-copy lng-rv">
          {v.eyebrow && (
            <div className="p-eyebrow">{`${number} / ${v.eyebrow}`}</div>
          )}
          <h3 className="p-title">
            <RichInline value={v.heading} />
          </h3>
          {v.tagline && <div className="p-tag">{v.tagline}</div>}
          <RichBlocks value={v.text} className="p-desc" />
          {benefits.length > 0 && (
            <ul className="p-list">
              {benefits.map((benefit, i) => (
                <li key={i}>
                  <RingIcon /> {benefit}
                </li>
              ))}
            </ul>
          )}
          {pills.length > 0 && (
            <div className="p-pills">
              {pills.map((pill, i) => (
                <span key={i} className="pill">
                  {pill}
                </span>
              ))}
            </div>
          )}
          {product && (
            <BuyForm
              variantId={product.variantId}
              className="btn btn-solid p-buy"
              style={{background: color.button, borderColor: color.button, color: '#fff'}}
            >
              {v.button_label || `Купи ${product.title}`}
            </BuyForm>
          )}
        </div>
      </div>
      {video && (
        <div className="p-video-block">
          <div className="p-video-frame lng-rv-scale">
            <video
              id={`${anchor}-video`}
              poster={entry.images.video_poster?.url}
              src={video}
              autoPlay
              muted
              loop
              playsInline
              controls
            />
          </div>
          {v.video_caption && <div className="p-video-caption">{v.video_caption}</div>}
        </div>
      )}
    </section>
  );
}

function SectionHead({entry}: {entry: LandingEntry}) {
  const v = entry.values;
  if (!v.eyebrow && !v.heading && !v.text) return null;
  return (
    <div className="routine-head lng-rv">
      {v.eyebrow && <div className="eyebrow">{v.eyebrow}</div>}
      {v.heading && (
        <h2>
          <RichInline value={v.heading} />
        </h2>
      )}
      <RichBlocks value={v.text} />
    </div>
  );
}

function Cards({entry}: {entry: LandingEntry}) {
  const items = entry.lists.items ?? [];
  const layout = entry.values.layout;

  if (layout === 'предимства') {
    return (
      <section className="trust">
        {(entry.values.eyebrow || entry.values.heading) && (
          <div className="wrap">
            <SectionHead entry={entry} />
          </div>
        )}
        <div className="wrap trust-row">
          {items.map((item, i) => (
            <div key={item.handle} className="trust-item lng-rv" style={delay(i, 0.08)}>
              {/* Засега всяка иконка е кръгчето от дизайна - другите избори
                  в полето „Иконка“ още нямат рисунка. */}
              <RingIcon />
              <div>
                <h4>{item.values.title}</h4>
                <p>{item.values.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (layout === 'числа') {
    return (
      <section className="intro">
        <div className="wrap">
          <SectionHead entry={entry} />
          <div className="intro-stats">
            {items.map((item, i) => (
              <Stat key={item.handle} item={item} index={i} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // „стъпки“ - и по подразбиране.
  return (
    <section className="routine">
      <div className="blob blob-sage float" style={{width: 220, height: 220, top: 0, left: '6%'}} />
      <div className="blob blob-lilac float-rev" style={{width: 240, height: 240, bottom: 0, right: '6%'}} />
      <div className="wrap">
        <SectionHead entry={entry} />
        <div className="routine-row">
          {items.map((item, i) => (
            <div
              key={item.handle}
              className="r-step lng-rv-rot"
              style={{'--r': pick(STEP_TURNS, i), ...delay(i, 0.12)} as CSSProperties}
            >
              <div className="r-dot" style={{background: (COLORS[item.values.color ?? ''] ?? DEFAULT_COLOR).accent}} />
              {item.values.label && <div className="r-time">{item.values.label}</div>}
              {item.values.title && <h3>{item.values.title}</h3>}
              {item.values.text && <p>{item.values.text}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Offers({entry, anchor}: {entry: LandingEntry; anchor?: string}) {
  const v = entry.values;
  const offers = (entry.lists.offers ?? []).filter((o) => o.products.product);
  return (
    <section className="cta" id={anchor}>
      <div className="blob blob-lilac float" style={{width: 320, height: 320, top: '-10%', left: '-6%'}} />
      <div className="blob blob-sage float-rev" style={{width: 280, height: 280, bottom: '-10%', right: '-4%'}} />
      <div className="wrap lng-rv" style={{position: 'relative', zIndex: 1}}>
        {v.eyebrow && <div className="eyebrow">{v.eyebrow}</div>}
        {v.heading && (
          <h2 style={{marginTop: 18}}>
            <RichInline value={v.heading} />
          </h2>
        )}
        <RichBlocks value={v.text} />
        <div className="bundle-cards">
          {offers.map((offer, i) => {
            const o = offer.values;
            const product = offer.products.product!;
            const image = offer.images.image;
            return (
              <div key={offer.handle} className={`bundle-card${i % 2 ? ' rev' : ''}`}>
                <div className="bundle-card-copy">
                  {o.eyebrow && <div className="bundle-card-eyebrow">{o.eyebrow}</div>}
                  <h3 className="bundle-card-title">
                    {o.heading ? <RichInline value={o.heading} /> : product.title}
                  </h3>
                  {o.subtitle && <div className="bundle-card-sub">{o.subtitle}</div>}
                  {o.tagline && <div className="bundle-card-tagline">{o.tagline}</div>}
                  <RichBlocks value={o.text} className="bundle-card-desc" />
                  <div className="bundle-card-foot">
                    {product.price && <div className="bundle-card-price">{product.price}</div>}
                    <BuyForm variantId={product.variantId} className="btn btn-coral">
                      {o.button_label || 'Купи'}
                    </BuyForm>
                  </div>
                </div>
                {image && (
                  <SmartLink to={`/product/${product.handle}`} className="bundle-card-img">
                    <img src={image.url} alt={image.alt ?? product.title} loading="lazy" decoding="async" />
                  </SmartLink>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------------- страницата ---------------- */

/**
 * Котвата на продуктова секция: адресът на записа без общото начало със
 * страницата - `longevity-hepato` на `longevity-bactology` дава `#hepato`,
 * както беше в стария блок, за да работят и досегашните връзки.
 */
function anchorOf(entry: LandingEntry, pageHandle: string): string {
  const prefix = `${pageHandle.split('-')[0]}-`;
  return entry.handle.startsWith(prefix) ? entry.handle.slice(prefix.length) : entry.handle;
}

type Part =
  | {kind: 'hero'; entry: LandingEntry}
  | {kind: 'products'; entries: LandingEntry[]}
  | {kind: 'section'; entry: LandingEntry};

export function LandingPage({page, title}: {page: LandingPageData; title: string}) {
  const v = page.values;
  const sticky = link(v.sticky_button);

  // Началните банери стоят преди `lng-after`; поредните продукти - в обща
  // `product-stack`, както в дизайна.
  const parts: Part[] = [];
  for (const entry of page.sections) {
    const last = parts[parts.length - 1];
    if (entry.type === 'section_hero') parts.push({kind: 'hero', entry});
    else if (entry.type === 'product_block' && entry.products.product) {
      if (last?.kind === 'products') last.entries.push(entry);
      else parts.push({kind: 'products', entries: [entry]});
    } else parts.push({kind: 'section', entry});
  }
  const leading = [];
  while (parts[0]?.kind === 'hero') leading.push(parts.shift() as Extract<Part, {kind: 'hero'}>);

  const productEntries = page.sections.filter(
    (s) => s.type === 'product_block' && s.products.product,
  );
  const menu = productEntries.map((entry) => ({
    anchor: anchorOf(entry, page.handle),
    label: plain(entry.values.heading) || entry.products.product!.title,
  }));
  let productIndex = 0;
  let offersSeen = false;

  const renderPart = (part: Part, key: number): ReactNode => {
    if (part.kind === 'hero') return <Hero key={key} entry={part.entry} first={false} />;
    if (part.kind === 'products') {
      return (
        <div key={key} className="product-stack">
          {part.entries.map((entry) => (
            <ProductSection
              key={entry.handle}
              entry={entry}
              index={productIndex++}
              anchor={anchorOf(entry, page.handle)}
            />
          ))}
        </div>
      );
    }
    const {entry} = part;
    switch (entry.type) {
      case 'section_marquee':
        return <Marquee key={key} entry={entry} />;
      case 'section_text_media':
        return <TextMedia key={key} entry={entry} />;
      case 'section_cards':
        return <Cards key={key} entry={entry} />;
      case 'section_offers': {
        const anchor = offersSeen ? undefined : 'oferta';
        offersSeen = true;
        return <Offers key={key} entry={entry} anchor={anchor} />;
      }
      default:
        return null;
    }
  };

  const navLinks = (
    <>
      {menu.map((item) => (
        <li key={item.anchor}>
          <a href={`#${item.anchor}`}>{item.label}</a>
        </li>
      ))}
    </>
  );

  return (
    <PageShell title={title} breadcrumbs={[]} variant="barebones">
      {/* Същите обвивки като на блок „Код“ в конструктора - по тях се
          подреждат ширината и отстъпите на страницата. */}
      <div className="bb-bd">
        <div
          className="bb-bd-row bb-bd-row--full bb-bd-vtop"
          style={{paddingTop: 0, paddingBottom: 0, marginTop: 0, marginBottom: 0}}
        >
          <div className="bb-bd-col bb-bd-col-12">
            <div className="bb-bd-code">
              <div className="lng">
                <nav className="nav">
                  <div className="nav-logo">
                    <Logo size={20} />
                  </div>
                  <ul className="nav-links">{navLinks}</ul>
                </nav>

                <div className="story-bar" id="storyBar">
                  {Array.from({length: 5}, (_, i) => (
                    <div key={i} className="story-seg">
                      <i />
                    </div>
                  ))}
                </div>

                {leading.map((part, i) => (
                  <Hero key={part.entry.handle} entry={part.entry} first={i === 0} />
                ))}

                <div className="lng-after">
                  {parts.map(renderPart)}

                  <footer>
                    <div className="wrap">
                      <div className="foot-row">
                        <div className="foot-logo">
                          <Logo size={17} />
                        </div>
                        <ul className="foot-links">{navLinks}</ul>
                      </div>
                      {v.footnote && <div className="foot-note">{v.footnote}</div>}
                    </div>
                  </footer>

                  {sticky && (
                    <div className="lng-sticky-anchor">
                      <div className="sticky-bar" id="stickyBar">
                        <div className="sb-text">
                          <RichInline value={v.sticky_text} />
                        </div>
                        <SmartLink
                          to={sticky.url}
                          className="btn btn-coral"
                          style={{padding: '11px 22px', fontSize: '12.5px'}}
                        >
                          {sticky.text}
                          <Arrow small />
                        </SmartLink>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* React го слага в <head> и рисува страницата едва когато
                  стиловете са заредени - без миг неоформен текст. */}
              <link rel="stylesheet" href={landingCssUrl} precedence="default" />
            </div>
          </div>
        </div>
      </div>
      <PageBackLink />
    </PageShell>
  );
}
