import { Badge } from './ui/Badge';
import type { BadgeTone } from './ui/Badge';
import { RISK_LABELS, riskLevel } from '@/config/scoring';
import { cn } from '@/utils/cn';

const TONES: Record<string, BadgeTone> = {
  low: 'pos',
  medium: 'warn',
  high: 'neg',
};

export function RiskBadge({
  score,
  withValue = true,
  className,
}: {
  score: number;
  withValue?: boolean;
  className?: string;
}) {
  const level = riskLevel(score);
  return (
    <Badge tone={TONES[level]} dot className={cn('num', className)}>
      {withValue ? `${Math.round(score)} · ` : ''}
      {RISK_LABELS[level]}
    </Badge>
  );
}

export function RiskMeter({ score, className }: { score: number; className?: string }) {
  const level = riskLevel(score);
  const barTone =
    level === 'low' ? 'bg-pos' : level === 'medium' ? 'bg-warn' : 'bg-neg';
  const textTone =
    level === 'low' ? 'text-[#59c96c]' : level === 'medium' ? 'text-[#e0a83a]' : 'text-[#f0666a]';

  return (
    <div className={cn('rounded-md border border-line bg-panel-2 p-3', className)}>
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.05em] text-ink-3">
          Risk Score
        </span>
        <span className={cn('num text-[18px] font-semibold leading-none', textTone)}>
          {Math.round(score)}
        </span>
      </div>
      <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-panel-4">
        <div
          className={cn('h-full rounded-full', barTone)}
          style={{ width: `${Math.max(2, Math.min(100, score))}%` }}
        />
      </div>
      <p className="mt-2 text-[11.5px] text-ink-3">Риск {RISK_LABELS[level]}</p>
    </div>
  );
}
