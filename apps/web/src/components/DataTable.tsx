import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import type { SortState } from '@/hooks/useTableSort';
import { TableSkeleton } from './ui/Skeleton';
import { cn } from '@/utils/cn';

export interface Column<T> {
  key: string;
  header: ReactNode;
  /** Tooltip for abbreviated headers. */
  title?: string;
  align?: 'left' | 'right' | 'center';
  width?: number;
  sortable?: boolean;
  render: (row: T, index: number) => ReactNode;
  /** Pins the column while the table scrolls horizontally. */
  stickyLeft?: number;
  /** Draws the separator between the pinned block and the rest. */
  stickyEdge?: boolean;
  className?: string;
  headerClassName?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  sort?: SortState;
  onSortToggle?: (key: string) => void;
  onRowClick?: (row: T) => void;
  selectedKey?: string | null;
  loading?: boolean;
  empty?: ReactNode;
  /** Minimum table width — enables horizontal scrolling for wide tables. */
  minWidth?: number;
  maxHeight?: number;
}

const ALIGN: Record<string, string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  sort,
  onSortToggle,
  onRowClick,
  selectedKey,
  loading = false,
  empty,
  minWidth,
  maxHeight,
}: DataTableProps<T>) {
  if (loading) {
    return <TableSkeleton rows={8} columns={Math.min(columns.length, 7)} />;
  }

  if (rows.length === 0 && empty) {
    return <>{empty}</>;
  }

  return (
    <div
      className="overflow-auto"
      style={maxHeight ? { maxHeight } : undefined}
    >
      <table
        className="w-full border-separate border-spacing-0"
        style={minWidth ? { minWidth } : undefined}
      >
        <thead className="sticky top-0 z-20">
          <tr>
            {columns.map((column) => {
              const sorted = sort?.key === column.key;
              const SortIcon = !sorted
                ? ChevronsUpDown
                : sort?.direction === 'asc'
                  ? ArrowUp
                  : ArrowDown;
              return (
                <th
                  key={column.key}
                  title={column.title}
                  scope="col"
                  style={{
                    width: column.width,
                    minWidth: column.width,
                    left: column.stickyLeft,
                    zIndex: column.stickyLeft !== undefined ? 3 : undefined,
                  }}
                  className={cn(
                    'border-b border-line bg-panel-2 px-3 py-2 text-[10.5px] font-semibold uppercase tracking-[0.05em] text-ink-3 whitespace-nowrap',
                    ALIGN[column.align ?? 'left'],
                    column.stickyLeft !== undefined && 'dt-head-sticky',
                    column.stickyEdge && 'dt-edge',
                    column.headerClassName,
                  )}
                >
                  {column.sortable && onSortToggle ? (
                    <button
                      type="button"
                      onClick={() => onSortToggle(column.key)}
                      className={cn(
                        'inline-flex items-center gap-1 transition-colors hover:text-ink',
                        sorted && 'text-ink',
                        column.align === 'right' && 'flex-row-reverse',
                      )}
                    >
                      {column.header}
                      <SortIcon
                        size={11}
                        strokeWidth={2.2}
                        className={cn(sorted ? 'text-accent' : 'text-ink-4')}
                      />
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const key = rowKey(row);
            return (
              <tr
                key={key}
                data-selected={selectedKey === key}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'dt-row group transition-colors',
                  onRowClick && 'cursor-pointer',
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    style={{
                      left: column.stickyLeft,
                      zIndex: column.stickyLeft !== undefined ? 1 : undefined,
                    }}
                    className={cn(
                      'border-b border-line px-3 py-[9px] align-middle text-[12.5px] text-ink-2',
                      'whitespace-nowrap bg-[var(--row-bg)]',
                      ALIGN[column.align ?? 'left'],
                      column.stickyLeft !== undefined && 'dt-cell-sticky',
                      column.stickyEdge && 'dt-edge',
                      column.className,
                    )}
                  >
                    {column.render(row, index)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
