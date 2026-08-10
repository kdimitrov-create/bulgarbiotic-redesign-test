import type {ReactNode} from 'react';
import type {Shop, Menu, CartData} from '@cloudcart/nitro';
import {Header} from './Header';
import {Footer} from './Footer';
import type {NavMenu} from '~/lib/navigation';
import {PromoBar} from './PromoBar';
import {ProbioticFinderFAB} from './ProbioticFinderFAB';
import {CookieBanner} from './overlays/CookieBanner';
import {Analytics} from './Analytics';
import {LuckyWheel} from './overlays/LuckyWheel';
import {PendingPromo} from './PendingPromo';

interface PageLayoutProps {
  shop: Shop;
  headerMenu: Menu | null;
  footerMenu: Menu | null;
  /** Дизайн → Навигация, group "footer": one group per column. */
  adminFooter?: NavMenu | null;
  cart: Promise<CartData | null>;
  children: ReactNode;
  /** When true (default), renders <main> full-bleed so sections control their own widths. */
  fullBleed?: boolean;
}

export function PageLayout({shop, headerMenu, footerMenu, adminFooter, cart, children, fullBleed = true}: PageLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="page-progress" id="bb-page-progress"></div>
      <PromoBar />
      <Header shop={shop} menu={headerMenu} cart={cart} />
      <main className={fullBleed ? 'flex-1 w-full' : 'flex-1 w-full max-w-7xl mx-auto px-6 py-8 md:px-8 md:py-10'}>
        {children}
      </main>
      <Footer shop={shop} menu={footerMenu} adminFooter={adminFooter ?? null} />
      <ProbioticFinderFAB />
      <CookieBanner />
      <Analytics />
      {/* Слага спечеления промо код, щом количката получи първия си продукт.
          Стои в layout-а, защото колелото може отдавна да е затворено. */}
      <PendingPromo />
      {/* Пали се при добавяне в количката — затова стои в layout-а, не в отделна страница. */}
      <LuckyWheel />
    </div>
  );
}