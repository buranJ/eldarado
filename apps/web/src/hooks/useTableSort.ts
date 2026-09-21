import { useCallback, useMemo, useState } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  key: string;
  direction: SortDirection;
}

export type SortAccessor<T> = (row: T) => number | string | null;

export const useTableSort = <T,>(
  rows: T[],
  accessors: Record<string, SortAccessor<T>>,
  initial: SortState,
) => {
  const [sort, setSort] = useState<SortState>(initial);

  const toggle = useCallback((key: string) => {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'desc' },
    );
  }, []);

  const sorted = useMemo(() => {
    const accessor = accessors[sort.key];
    if (!accessor) return rows;
    const factor = sort.direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      if (typeof av === 'string' || typeof bv === 'string') {
        return String(av).localeCompare(String(bv), 'ru') * factor;
      }
      return (av - bv) * factor;
    });
  }, [rows, accessors, sort]);

  return { sort, setSort, toggle, sorted };
};
