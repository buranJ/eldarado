import { useMemo, useState } from 'react';

export const usePagination = <T,>(rows: T[], pageSize: number) => {
  const [requestedPage, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  /* Clamp during render so filtering never leaves the view on an empty page. */
  const page = Math.min(requestedPage, pageCount);

  const pageRows = useMemo(
    () => rows.slice((page - 1) * pageSize, page * pageSize),
    [rows, page, pageSize],
  );

  return {
    page,
    setPage,
    pageCount,
    pageRows,
    total: rows.length,
    from: rows.length === 0 ? 0 : (page - 1) * pageSize + 1,
    to: Math.min(page * pageSize, rows.length),
  };
};
