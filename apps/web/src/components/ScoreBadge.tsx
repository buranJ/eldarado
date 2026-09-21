import { dealScoreTone, qualityScoreTone } from '@/config/scoring';
import { cn } from '@/utils/cn';

const COLOR_CLASSES: Record<string, { text: string; bg: string; border: string; bar: string }> = {
  pos: { text: 'text-[#59c96c]', bg: 'bg-[#11291a]', border: 'border-[#22492e]', bar: 'bg-pos' },
  accent: {
    text: 'text-[#93a8ff]',
    bg: 'bg-[#161b33]',
    border: 'border-[#2b3566]',
    bar: 'bg-accent',
  },
  warn: { text: 'text-[#e0a83a]', bg: 'bg-[#2a2011]', border: 'border-[#4d3b1a]', bar: 'bg-warn' },
  neg: { text: 'text-[#f0666a]', bg: 'bg-[#2a1518]', border: 'border-[#4d2429]', bar: 'bg-neg' },
};

/**
 * Deal Score is the product's headline metric — the `deal` variant is
 * deliberately the loudest score in every table.
 */
export function ScoreBadge({
  score,
  kind = 'deal',
  showLabel = false,
  size = 'md',
  className,
}: {
  score: number;
  kind?: 'deal' | 'quality';
  showLabel?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const tone = kind === 'deal' ? dealScoreTone(score) : qualityScoreTone(score);
  const colors = COLOR_CLASSES[tone.color];

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span
        className={cn(
          'num inline-flex items-center justify-center rounded border font-semibold tabular-nums',
          colors.bg,
          colors.border,
          colors.text,
          kind === 'deal'
            ? size === 'md'
              ? 'h-[22px] min-w-[34px] px-1.5 text-[13px]'
              : 'h-5 min-w-[30px] px-1 text-[12px]'
            : 'h-5 min-w-[28px] border-transparent bg-transparent px-0 text-[12.5px]',
        )}
      >
        {Math.round(score)}
      </span>
      {showLabel ? (
        <span className={cn('text-[11.5px]', colors.text)}>{tone.label}</span>
      ) : null}
    </span>
  );
}

/** Compact score with an inline meter — used in detail panels. */
export function ScoreMeter({
  score,
  kind = 'deal',
  label,
  className,
}: {
  score: number;
  kind?: 'deal' | 'quality';
  label: string;
  className?: string;
}) {
  const tone = kind === 'deal' ? dealScoreTone(score) : qualityScoreTone(score);
  const colors = COLOR_CLASSES[tone.color];

  return (
    <div className={cn('rounded-md border border-line bg-panel-2 p-3', className)}>
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.05em] text-ink-3">
          {label}
        </span>
        <span className={cn('num text-[18px] font-semibold leading-none', colors.text)}>
          {Math.round(score)}
        </span>
      </div>
      <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-panel-4">
        <div
          className={cn('h-full rounded-full', colors.bar)}
          style={{ width: `${Math.max(2, Math.min(100, score))}%` }}
        />
      </div>
      <p className="mt-2 text-[11.5px] text-ink-3">{tone.label}</p>
    </div>
  );
}
