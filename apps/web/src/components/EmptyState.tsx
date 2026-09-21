import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'px-6 py-10' : 'px-6 py-16',
        className,
      )}
    >
      {Icon ? (
        <div className="mb-3 flex size-9 items-center justify-center rounded-lg border border-line bg-panel-2">
          <Icon size={16} className="text-ink-4" strokeWidth={1.8} />
        </div>
      ) : null}
      <p className="text-[13px] font-medium text-ink-2">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-[380px] text-[12px] leading-relaxed text-ink-4">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
