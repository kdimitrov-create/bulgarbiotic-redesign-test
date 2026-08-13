import {Form, NavLink} from 'react-router';
import {UserIcon, ShoppingBagIcon, MapPinIcon, BuildingOfficeIcon, HeartIcon, ArrowDownTrayIcon, CreditCardIcon, ArrowLeftStartOnRectangleIcon} from '@heroicons/react/24/outline';

const links = [
  {to: '/account/profile', label: 'Профил', icon: UserIcon, end: true},
  {to: '/account/orders', label: 'Поръчки', icon: ShoppingBagIcon, end: false},
  {to: '/account/payments', label: 'Плащания', icon: CreditCardIcon, end: true},
  {to: '/account/downloads', label: 'Файлове', icon: ArrowDownTrayIcon, end: true},
  {to: '/account/wishlist', label: 'Любими', icon: HeartIcon, end: true},
  {to: '/account/addresses/shipping', label: 'Адреси за доставка', icon: MapPinIcon, end: true},
  {to: '/account/addresses/billing', label: 'Адреси за фактура', icon: BuildingOfficeIcon, end: true},
];

export function AccountSidebar() {
  return (
    <nav className="flex flex-col gap-1 text-sm">
      {links.map(({to, label, icon: Icon, end}) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({isActive}) =>
            `flex items-center gap-2 py-2 px-3 rounded-lg transition-colors hover:no-underline ${
              isActive
                ? 'bg-gray-100 text-dark font-medium'
                : 'text-gray-600 hover:bg-gray-50 hover:text-dark'
            }`
          }
        >
          <Icon className="size-4 shrink-0" />
          {label}
        </NavLink>
      ))}
      <Form method="POST" action="/account/logout" className="mt-2">
        <button
          type="submit"
          className="flex w-full items-center gap-2 py-2 px-3 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-dark"
        >
          <ArrowLeftStartOnRectangleIcon className="size-4 shrink-0" />
          Изход
        </button>
      </Form>
    </nav>
  );
}
