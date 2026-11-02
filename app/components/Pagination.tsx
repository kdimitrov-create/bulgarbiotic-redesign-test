import {Link, useSearchParams, useNavigation} from 'react-router';
import {useMemo, useRef} from 'react';
import type {ReactNode, FC} from 'react';

interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
}

interface Connection<T> {
  nodes: T[];
  pageInfo: PageInfo;
}

export interface PaginationRenderProps<T> {
  nodes: T[];
  NextLink: FC<{children: ReactNode; className?: string}>;
  PreviousLink: FC<{children: ReactNode; className?: string}>;
  isLoading: boolean;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Странициране по номер на страница, което НАТРУПВА.
 *
 * Адресът си остава `?page=N` (споделим, работи и с бутона „назад"), а
 * сървърът връща само тази страница. Дотук показвахме точно нея - тоест
 * „Зареди още продукти" всъщност беше „следваща страница": продуктите отпреди
 * изчезваха и на екрана оставаха само новите. Клиентът го докладва на
 * 20.08.2026 и е прав, че бутонът лъже за това, което прави.
 *
 * Затова страниците се пазят и се показват една след друга. Ключът е адресът
 * БЕЗ `page`: смени ли се филтър или подредба, натрупаното се изхвърля, защото
 * старите продукти вече не отговарят на въпроса.
 */
export function Pagination<T>({
  connection,
  children,
}: {
  connection: Connection<T>;
  children: (args: PaginationRenderProps<T>) => ReactNode;
}) {
  const [searchParams] = useSearchParams();
  const navigation = useNavigation();
  const isLoading = navigation.state === 'loading';
  const {nodes, pageInfo} = connection;

  const currentPage = parseInt(searchParams.get('page') ?? '1', 10) || 1;

  /* Натрупаните страници.
   *
   * Държат се в `useRef`, а не в състояние: записът е идемпотентен (една и съща
   * страница със същите възли), тоест не води до ново рисуване и не може да
   * влезе в цикъл. На сървъра ref-ът тръгва празен при всяка заявка, така че
   * SSR рисува точно поисканата страница - както и трябва. */
  const filterKey = useMemo(() => {
    const p = new URLSearchParams(searchParams);
    p.delete('page');
    return p.toString();
  }, [searchParams]);

  const store = useRef<{key: string; pages: Map<number, T[]>}>({
    key: filterKey,
    pages: new Map(),
  });
  // Смяна на филтър/подредба: натрупаното вече не важи.
  if (store.current.key !== filterKey) {
    store.current = {key: filterKey, pages: new Map()};
  }
  store.current.pages.set(currentPage, nodes);

  const shownNodes = useMemo(
    () =>
      [...store.current.pages.keys()]
        .sort((a, b) => a - b)
        .flatMap((p) => store.current.pages.get(p) ?? []),
    // Достатъчно е да се преизчисли при нова страница или нов филтър: това са
    // единствените два случая, в които съдържанието се мени.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentPage, filterKey, nodes],
  );

  const nextUrl = useMemo(() => {
    if (!pageInfo.hasNextPage) return null;
    const params = new URLSearchParams(searchParams);
    params.delete('cursor');
    params.delete('direction');
    params.set('page', String(currentPage + 1));
    return `?${params.toString()}`;
  }, [pageInfo.hasNextPage, searchParams, currentPage]);

  const prevUrl = useMemo(() => {
    if (currentPage <= 1) return null;
    const params = new URLSearchParams(searchParams);
    params.delete('cursor');
    params.delete('direction');
    if (currentPage - 1 <= 1) {
      params.delete('page');
    } else {
      params.set('page', String(currentPage - 1));
    }
    return `?${params.toString()}`;
  }, [searchParams, currentPage]);

  const NextLink: FC<{children: ReactNode; className?: string}> = ({children: label, className}) => {
    if (!nextUrl) return null;
    return (
      <Link to={nextUrl} preventScrollReset prefetch="intent" className={className}>
        {label}
      </Link>
    );
  };

  const PreviousLink: FC<{children: ReactNode; className?: string}> = ({children: label, className}) => {
    if (!prevUrl) return null;
    return (
      <Link to={prevUrl} preventScrollReset prefetch="intent" className={className}>
        {label}
      </Link>
    );
  };

  return (
    <>
      {children({
        nodes: shownNodes,
        NextLink,
        PreviousLink,
        isLoading,
        hasNextPage: pageInfo.hasNextPage,
        hasPreviousPage: currentPage > 1,
      })}
    </>
  );
}
