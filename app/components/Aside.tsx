import {createContext, useContext, useState, useEffect, type ReactNode} from 'react';
import {XMarkIcon} from '@heroicons/react/24/outline';

type AsideType = 'cart' | 'search' | 'mobile' | 'closed';

interface AsideContextValue {
  type: AsideType;
  open: (type: AsideType) => void;
  close: () => void;
}

const AsideContext = createContext<AsideContextValue>({
  type: 'closed',
  open: () => {},
  close: () => {},
});

export function useAside() {
  return useContext(AsideContext);
}

export function AsideProvider({children}: {children: ReactNode}) {
  const [type, setType] = useState<AsideType>('closed');

  return (
    <AsideContext.Provider
      value={{
        type,
        open: setType,
        close: () => setType('closed'),
      }}
    >
      {children}
    </AsideContext.Provider>
  );
}

export function Aside({
  children,
  heading,
  type,
  bare = false,
}: {
  children?: ReactNode;
  heading: ReactNode;
  type: AsideType;
  /**
   * Панелът не рисува своята заглавна лента.
   *
   * Количката си има собствена („Твоята кошница · N"), а отгоре стоеше и тази
   * на панела („КОШНИЦА") - две ленти една под друга, които изяждаха 64 пиксела
   * тъкмо там, където най-липсват: на телефон списъкът с продуктите получаваше
   * 208 пиксела от 844. Съдържанието поема и бутона за затваряне.
   */
  bare?: boolean;
}) {
  const {type: activeType, close} = useAside();
  const expanded = type === activeType;

  useEffect(() => {
    if (!expanded) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [close, expanded]);

  return (
    <div
      aria-modal
      className={`fixed inset-0 bg-black/30 z-[100] transition-[opacity,visibility] duration-300 ${expanded ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
      role="dialog"
    >
      <button
        className="bb-aside-scrim absolute inset-0 bg-transparent border-none cursor-default"
        onClick={close}
        aria-label="Затвори"
      />
      {/* Ширината живее в CSS-а (`.bb-aside-panel`, app.css), а не в класове тук:
          същото число трябваше на панела и на затъмнението, а в един момент
          стоеше на четири места и се разминаваше. */}
      <aside className={`bb-aside-panel fixed top-0 right-0 h-screen bg-light shadow-[-4px_0_24px_rgba(0,0,0,0.12)] transition-transform duration-300 flex flex-col ${expanded ? 'translate-x-0' : 'translate-x-full'}`}>
        {bare ? null : (
          <header className="flex items-center justify-between px-5 h-16 border-b border-gray-200 shrink-0">
            <h3 className="text-[0.85rem] font-bold tracking-widest">{heading}</h3>
            <button
              type="button"
              onClick={close}
              className="rounded-md p-2 -mr-2 text-gray-400 hover:text-dark transition-colors duration-150 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Затвори"
            >
              <XMarkIcon className="size-6" />
            </button>
          </header>
        )}
        {/* Скролерът е един и е вътре в количката (`.bb-cd-scroll`). Тук стоеше
            втори и двата се препокриваха. */}
        <main className="flex-1 min-h-0 overflow-hidden p-0">{children}</main>
      </aside>
    </div>
  );
}
