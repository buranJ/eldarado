import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IconButton } from './ui/Button';
import { formatNumber } from '@/utils/format';
import { cn } from '@/utils/cn';

export function Pagination({
  page,
  pageCount,
  from,
  to,
  total,
  onPageChange,
  pageSize,
  onPageSizeChange,
  pageSizes = [15, 25, 50],
}: {
  page: number;
  pageCount: number;
  from: number;
  to: number;
  total: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  pageSizes?: number[];
}) {
  const pages = buildPageList(page, pageCount);

  return (
    <div className="flex items-center justify-between border-t border-line px-4 py-2.5">
      <p className="num text-[11.5px] text-ink-3">
        {formatNumber(from)}–{formatNumber(to)} из {formatNumber(total)}
      </p>
      <div className="flex items-center gap-3">
        {pageSize !== undefined && onPageSizeChange ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[11.5px] text-ink-4">Строк:</span>
            {pageSizes.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => onPageSizeChange(size)}
                className={cn(
                  'num rounded px-1.5 py-0.5 text-[11.5px] transition-colors',
                  size === pageSize
                    ? 'bg-panel-3 text-ink'
                    : 'text-ink-4 hover:bg-panel-2 hover:text-ink-2',
                )}
              >
                {size}
              </button>
            ))}
          </div>
        ) : null}
        <div className="flex items-center gap-1">
          <IconButton
            icon={ChevronLeft}
            size="xs"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Предыдущая страница"
          />
          {pages.map((item, index) =>
            item === null ? (
              <span key={`gap-${index}`} className="px-1 text-[11.5px] text-ink-4">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                className={cn(
                  'num h-6 min-w-6 rounded px-1.5 text-[11.5px] transition-colors',
                  item === page
                    ? 'bg-panel-3 text-ink'
                    : 'text-ink-3 hover:bg-panel-2 hover:text-ink',
                )}
              >
                {item}
              </button>
            ),
          )}
          <IconButton
            icon={ChevronRight}
            size="xs"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
            aria-label="Следующая страница"
          />
        </div>
      </div>
    </div>
  );
}

const buildPageList = (page: number, pageCount: number): (number | null)[] => {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);
  const pages: (number | null)[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);
  if (start > 2) pages.push(null);
  for (let index = start; index <= end; index += 1) pages.push(index);
  if (end < pageCount - 1) pages.push(null);
  pages.push(pageCount);
  return pages;
};
