import { cn } from '@/utils/cn';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded', className)} />;
}

export function TableSkeleton({ rows = 8, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <div className="divide-y divide-line">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-6 px-4 py-[11px]">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              className={cn('h-3', colIndex === 0 ? 'w-40' : colIndex % 3 === 0 ? 'w-16' : 'w-10')}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardsSkeleton({
  count = 6,
  columns = 6,
}: {
  count?: number;
  columns?: number;
}) {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-lg border border-line bg-panel p-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-4 h-6 w-16" />
          <Skeleton className="mt-3 h-2.5 w-20" />
        </div>
      ))}
    </div>
  );
}
