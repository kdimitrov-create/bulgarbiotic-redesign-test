import {Link} from 'react-router';
import type {ReactNode} from 'react';

/**
 * Premium 4-column mega-menu inspired by seed.com / Mejuri / Glossier patterns.
 *
 * Surface columns:
 *   1. По цел        — health goal categories (digestion, immunity, etc.)
 *   2. По аудитория  — audience (women, men, kids, babies, pets)
 *   3. По форма      — product form (capsules, pearls, sachets, chewables)
 *   4. Featured      — visual product card + quiz CTA
 *
 * Rendered as a full-width panel under the Header (positioned by parent).
 * Animation handled in app.css (.bb-megamenu fade + slide).
 *
 * `onNav` callback fires when any link is clicked — Header uses it to close
 * the menu after navigation.
 */

interface MenuLink {
  label: string;
  to: string;
  /** Optional muted line under label. */
  hint?: string;
  /** Optional monoline SVG icon (24×24). */
  icon?: ReactNode;
}

interface ColumnSpec {
  heading: string;
  links: MenuLink[];
}

// CloudCart product tags are Bulgarian uppercase strings (e.g. "СИЛЕН ИМУНИТЕТ").
// We URL-encode them so the storefront API filter accepts the exact tag value
// that exists on real products — passing English slugs like "digestion" yields
// a server-side 500 because the tag doesn't exist in the catalogue.
const tagLink = (tag: string) => `/category/all-products?tag=${encodeURIComponent(tag)}`;

const COLUMN_GOAL: ColumnSpec = {
  heading: 'По цел',
  links: [
    {label: 'Храносмилане', to: tagLink('ПРОТИВ ГАЗОВЕ И ПОДУТ СТОМАХ'), hint: 'Газове, подуване, нередовност'},
    {label: 'Имунитет', to: tagLink('СИЛЕН ИМУНИТЕТ'), hint: 'По-малко настинки'},
    {label: 'Женско здраве', to: '/category/probiotik-za-jeni', hint: 'Интимно здраве'},
    {label: 'Стрес и сън', to: '/product/bactology-anti-stress', hint: 'Anti Stress'},
    {label: 'За отслабване', to: '/category/probiotik-za-otslabvane', hint: 'Микробиом и метаболизъм'},
    {/* „Отслабване" беше дубликат на „За отслабване" (същата категория) — махнат 2026-08-04. */}
  ],
};

const COLUMN_AUDIENCE: ColumnSpec = {
  heading: 'За кого',
  links: [
    {label: 'За жени', to: '/category/probiotik-za-jeni'},
    {label: 'За мъже', to: '/za-maje'},
    {label: 'За бременни', to: '/page/probiotik-za-bremenni'},
    {label: 'За деца (3+)', to: '/category/probiotik-za-deca'},
    {label: 'За бебета', to: '/product/probiotik-za-bebe-deca-i-podrastvashti-babies-and-kids'},
    {label: 'За домашни любимци', to: '/product/bactology-pets'},
  ],
};

const COLUMN_FORM: ColumnSpec = {
  heading: 'По форма',
  links: [
    {label: 'DR-Caps™ капсули', to: '/category/all-products?form=capsule', hint: 'Класиката'},
    {label: 'Пробиотични перли', to: '/category/perli', hint: 'С натурален или млечен шоколад'},
    {label: 'Дъвчащи таблетки', to: '/product/probiotik-za-bebe-deca-i-podrastvashti-babies-and-kids', hint: 'Smart Start серия'},
    {label: 'Сашета за бебета', to: '/product/probiotik-za-bebe-deca-i-podrastvashti-babies-and-kids', hint: 'Чувствителна формула'},
    {label: 'Пакети с отстъпка', to: '/category/packages', hint: 'Family, Travel'},
  ],
};

/** Featured product card — manually curated bestseller of the moment. */
const FEATURED_PRODUCT = {
  handle: 'bactology-probiotik-za-jeni-femin',
  title: 'Bactology Femin',
  tag: 'Бестселър №1',
  blurb: 'Пробиотик за женско интимно здраве — препоръчван от гинеколози.',
  image: '/images/generated-v2/p-femin.png',
};

interface Props {
  open: boolean;
  onNav?: () => void;
}

export function MegaMenu({open, onNav}: Props) {
  return (
    <div
      className={`bb-megamenu${open ? ' bb-megamenu--open' : ''}`}
      role="region"
      aria-label="Категории продукти"
      aria-hidden={!open}
    >
      <div className="bb-megamenu-grid">
        <Column spec={COLUMN_GOAL} onNav={onNav} accent="pink" />
        <Column spec={COLUMN_AUDIENCE} onNav={onNav} accent="blue" />
        <Column spec={COLUMN_FORM} onNav={onNav} accent="cream" />
        <Featured onNav={onNav} />
      </div>

      <div className="bb-megamenu-foot">
        <Link to="/category/all-products" className="bb-megamenu-foot-link bb-megamenu-foot-link--primary" onClick={onNav} prefetch="intent">
          Виж всички продукти
          <Arrow />
        </Link>
        <Link to="/selection/sale" className="bb-megamenu-foot-link" onClick={onNav} prefetch="intent">
          <span className="bb-megamenu-foot-tag">Промо</span>
          Активни промоции
          <Arrow />
        </Link>
        <Link to="/category/packages" className="bb-megamenu-foot-link" onClick={onNav} prefetch="intent">
          Пакети с отстъпка
          <Arrow />
        </Link>
        <a href="#bb-finder-fab" className="bb-megamenu-foot-link bb-megamenu-foot-link--ghost" onClick={onNav}>
          ✦ Не знаеш кой? Намери за 30 сек
          <Arrow />
        </a>
      </div>
    </div>
  );
}

function Column({spec, onNav, accent}: {spec: ColumnSpec; onNav?: () => void; accent: 'pink' | 'blue' | 'cream'}) {
  return (
    <div className={`bb-megamenu-col bb-megamenu-col--${accent}`}>
      <h3 className="bb-megamenu-col-h">{spec.heading}</h3>
      <ul className="bb-megamenu-col-list">
        {spec.links.map((l) => (
          <li key={l.to + l.label}>
            <Link to={l.to} onClick={onNav} prefetch="intent" className="bb-megamenu-link">
              <span className="bb-megamenu-link-label">{l.label}</span>
              {l.hint && <span className="bb-megamenu-link-hint">{l.hint}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Featured({onNav}: {onNav?: () => void}) {
  return (
    <div className="bb-megamenu-col bb-megamenu-feat">
      <h3 className="bb-megamenu-col-h">Препоръчано</h3>
      <Link to={`/product/${FEATURED_PRODUCT.handle}`} onClick={onNav} prefetch="intent" className="bb-megamenu-feat-card">
        <div className="bb-megamenu-feat-img">
          <img src={FEATURED_PRODUCT.image} alt={FEATURED_PRODUCT.title} loading="lazy" />
          <span className="bb-megamenu-feat-tag">{FEATURED_PRODUCT.tag}</span>
        </div>
        <div className="bb-megamenu-feat-body">
          <div className="bb-megamenu-feat-title">{FEATURED_PRODUCT.title}</div>
          <p className="bb-megamenu-feat-blurb">{FEATURED_PRODUCT.blurb}</p>
          <span className="bb-megamenu-feat-cta">
            Виж продукта
            <Arrow />
          </span>
        </div>
      </Link>
    </div>
  );
}

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="bb-megamenu-arrow">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
