import type {ReactNode} from 'react';
import {useRouteLoaderData} from 'react-router';
import type {Shop, Menu, CartData} from '@cloudcart/nitro';
import {Header} from './Header';
import {Footer} from './Footer';
import type {NavMenu} from '~/lib/navigation';
import {PromoBar} from './PromoBar';
import {ProbioticFinderFAB} from './ProbioticFinderFAB';
import {Analytics} from './Analytics';
import {LuckyWheel} from './overlays/LuckyWheel';
import {LongevityPromo} from './overlays/LongevityPromo';
import {PendingPromo} from './PendingPromo';
import {PromoLinkNotice} from './PromoLinkNotice';
import {CartToast} from './CartToast';
import {CrossSellPopup} from './CrossSellPopup';

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
  /* Колелото угасва по СЪРВЪРНИЯ час (виж `wheel-schedule`), затова се пита
     root loader-ът, а не браузърът. Спира се само показването: спечелените
     кодове остават валидни, затова `PendingPromo` остава на мястото си. */
  const rootData = useRouteLoaderData<{wheelLive?: boolean}>('root');
  const wheelLive = rootData?.wheelLive !== false;

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
      <Analytics />
      {/* Слага спечеления промо код, щом количката получи първия си продукт.
          Стои в layout-а, защото колелото може отдавна да е затворено. */}
      <PendingPromo />
      {/* Потвърждението след QR линка `/promo/<КОД>`. */}
      <PromoLinkNotice />
      <CartToast />
      {/* Кръстосаната оферта от панела - излиза след добавяне в количката. */}
      <CrossSellPopup />
      {/* Кодът на Longevity за хората, които не са дошли от рекламите. */}
      <LongevityPromo />
      {/* Пали се при добавяне в количката - затова стои в layout-а, не в отделна страница. */}
      {/* Монтира се винаги, а само графикът решава дали да се покаже: така
          `?wheel=test` може да отвори колелото и когато е спряно, без да го
          пуска на всички. Спряно и без проба, компонентът връща null. */}
      <LuckyWheel live={wheelLive} />
    </div>
  );
}