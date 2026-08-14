import {useEffect, useRef} from 'react';
import {useAside} from '~/components/Aside';

/**
 * Отваря чекмеджето, щом добавянето приключи - веднъж и само при успех.
 *
 * Същите десетина реда стояха преписани на три места (бутонът на продуктовата
 * страница, бутонът в картата и въртележката на началната) и трите бяха с един
 * и същ пропуск: гледаха само дали има отговор, не и дали в него има грешка.
 * Тоест чекмеджето изскачаше и когато продуктът изобщо не е влязъл в количката.
 *
 * Пази се и кой отговор вече е обработен: `fetcher.data` остава след успешното
 * добавяне, а ефектът се изпълнява наново при всяка промяна на зависимостите
 * (например брояча за количество) - от това чекмеджето се отваряше повторно,
 * без нищо да се е случило.
 */
export function useOpenCartOnAdd(fetcher: {state: string; data: unknown}): void {
  const {open} = useAside();
  const handled = useRef<unknown>(null);

  useEffect(() => {
    if (fetcher.state !== 'idle' || !fetcher.data) return;
    if (handled.current === fetcher.data) return;
    handled.current = fetcher.data;

    const errors = ((fetcher.data as any)?.errors ?? []) as unknown[];
    if (errors.length) return;
    open('cart');
  }, [fetcher.state, fetcher.data, open]);
}
