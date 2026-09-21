import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export function PageHeader({
  title,
  subtitle,
  meta,
  actions,
  className,
}: {
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-6', className)}>
      <div className="min-w-0">
        <h1 className="text-[19px] font-semibold tracking-[-0.02em] text-ink">{title}</h1>
        {subtitle ? <p className="mt-1 text-[13px] text-ink-2">{subtitle}</p> : null}
        {meta ? <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">{meta}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function MetaItem({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: ReactNode;
  tone?: 'default' | 'pos' | 'warn';
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px]">
      <span className="text-ink-4">{label}</span>
      <span
        className={cn(
          'font-medium',
          tone === 'pos' ? 'text-pos' : tone === 'warn' ? 'text-warn' : 'text-ink-2',
        )}
      >
        {value}
      </span>
    </span>
  );
}
