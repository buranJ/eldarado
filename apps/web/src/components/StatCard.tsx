import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { formatPercent } from '@/utils/format';
import { cn } from '@/utils/cn';

export function StatCard({
  label,
  value,
  hint,
  delta,
  deltaCaption,
  icon: Icon,
  tone = 'default',
  disabled = false,
  invertDelta = false,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  delta?: number;
  deltaCaption?: string;
  icon?: LucideIcon;
  tone?: 'default' | 'accent' | 'pos';
  disabled?: boolean;
  /** For metrics where a lower value is better. */
  invertDelta?: boolean;
  className?: string;
}) {
  const positive = delta !== undefined && (invertDelta ? delta < 0 : delta > 0);
  const negative = delta !== undefined && (invertDelta ? delta > 0 : delta < 0);
  const DeltaIcon = delta === undefined || delta === 0 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <div
      className={cn(
        'rounded-lg border border-line bg-panel px-4 py-3.5 transition-colors',
        !disabled && 'hover:border-line-2',
        disabled && 'opacity-45',
        className,
      )}
    >
      <div className="flex items-center gap-1.5">
        {Icon ? <Icon size={13} className="text-ink-4" strokeWidth={2} /> : null}
        <span className="text-[11.5px] font-medium text-ink-3">{label}</span>
      </div>
      <div className="mt-2.5 flex items-baseline gap-2">
        <span
          className={cn(
            'num text-[24px] font-semibold leading-none tracking-[-0.02em]',
            tone === 'accent' ? 'text-[#93a8ff]' : tone === 'pos' ? 'text-[#59c96c]' : 'text-ink',
          )}
        >
          {value}
        </span>
        {hint ? <span className="text-[12px] text-ink-3">{hint}</span> : null}
      </div>
      {delta !== undefined ? (
        <div className="mt-2.5 flex items-center gap-1.5">
          <span
            className={cn(
              'num inline-flex items-center gap-0.5 text-[11.5px] font-medium',
              positive ? 'text-pos' : negative ? 'text-neg' : 'text-ink-4',
            )}
          >
            <DeltaIcon size={12} strokeWidth={2.4} />
            {delta === 0 ? 'без изменений' : formatPercent(Math.abs(delta))}
          </span>
          {deltaCaption ? <span className="text-[11px] text-ink-4">{deltaCaption}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
