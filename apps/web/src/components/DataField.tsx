import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

/** Label/value pair used across detail panels. */
export function DataField({
  label,
  value,
  mono = false,
  className,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex items-baseline justify-between gap-3 py-[5px]', className)}>
      <span className="shrink-0 text-[12px] text-ink-3">{label}</span>
      <span className="min-w-0 h-px flex-1 translate-y-[-3px] border-b border-dotted border-line-2" />
      <span className={cn('shrink-0 text-right text-[12.5px] text-ink', mono && 'num')}>
        {value}
      </span>
    </div>
  );
}

export function FieldGroup({
  title,
  children,
  columns = 2,
  className,
}: {
  title: string;
  children: ReactNode;
  columns?: 1 | 2;
  className?: string;
}) {
  return (
    <section className={cn('px-5 py-4', className)}>
      <h3 className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-ink-3">
        {title}
      </h3>
      <div className={cn('gap-x-8', columns === 2 ? 'grid grid-cols-2' : 'block')}>{children}</div>
    </section>
  );
}
