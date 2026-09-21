import { cn } from '@/utils/cn';

export function ProgressBar({
  value,
  tone = 'accent',
  className,
  height = 3,
}: {
  /** 0–100 */
  value: number;
  /** Width comes from `className` — the bar has no intrinsic width. */
  tone?: 'accent' | 'pos' | 'warn' | 'neg' | 'neutral';
  className?: string;
  height?: number;
}) {
  const tones: Record<string, string> = {
    accent: 'bg-accent',
    pos: 'bg-pos',
    warn: 'bg-warn',
    neg: 'bg-neg',
    neutral: 'bg-ink-4',
  };
  return (
    <div
      className={cn('overflow-hidden rounded-full bg-panel-4', className)}
      style={{ height }}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-300', tones[tone])}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
