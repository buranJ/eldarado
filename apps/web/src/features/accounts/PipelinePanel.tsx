import { ChevronDown } from 'lucide-react';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { Skeleton } from '@/components/ui/Skeleton';

/** Funnel counts as reported by the API — every stage over the same cohort. */
export interface PipelineCounts {
  collected: number;
  analyzed: number;
  top: number;
  approved: number;
  purchased: number;
  published: number;
  sold: number;
}
import { formatNumber } from '@/utils/format';
import { cn } from '@/utils/cn';

interface Step {
  key: keyof PipelineCounts;
  label: string;
}

const STEPS: Step[] = [
  { key: 'collected', label: 'Собрано' },
  { key: 'top', label: 'Top 100' },
  { key: 'approved', label: 'Одобрено' },
  { key: 'purchased', label: 'Куплено' },
  { key: 'published', label: 'Опубликовано' },
  { key: 'sold', label: 'Продано' },
];

export function PipelinePanel({
  counts,
  loading = false,
}: {
  counts: PipelineCounts;
  loading?: boolean;
}) {
  const max = Math.max(...STEPS.map((step) => counts[step.key]), 1);

  return (
    <Panel className="sticky top-0">
      <PanelHeader title="Pipeline" subtitle="Прохождение аккаунтов по этапам" />
      <div className="px-4 py-3">
        {loading ? (
          <div className="space-y-3">
            {STEPS.map((step) => (
              <Skeleton key={step.key} className="h-8 w-full" />
            ))}
          </div>
        ) : (
          <ol>
            {STEPS.map((step, index) => {
              const value = counts[step.key];
              const share = (value / max) * 100;
              /* Conversion into the next stage, rendered on the connector below. */
              const conversion =
                index === STEPS.length - 1 || value === 0
                  ? null
                  : Math.round((counts[STEPS[index + 1].key] / value) * 100);
              return (
                <li key={step.key}>
                  <div className="group relative rounded-md px-2 py-2 transition-colors hover:bg-panel-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[12.5px] text-ink-2">{step.label}</span>
                      <span className="num text-[13px] font-semibold text-ink">
                        {formatNumber(value)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full bg-panel-3">
                      <div
                        className={cn(
                          'h-full rounded-full transition-[width] duration-500',
                          step.key === 'published' || step.key === 'sold'
                            ? 'bg-pos'
                            : step.key === 'collected'
                              ? 'bg-ink-4'
                              : 'bg-accent',
                        )}
                        style={{ width: `${Math.max(2, share)}%` }}
                      />
                    </div>
                  </div>
                  {index < STEPS.length - 1 ? (
                    <div className="flex items-center gap-2 pl-4">
                      <ChevronDown size={11} className="text-ink-4" strokeWidth={2.4} />
                      {conversion !== null ? (
                        <span className="num text-[10.5px] text-ink-4">{conversion}%</span>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </div>
      <div className="border-t border-line px-4 py-2.5">
        <p className="text-[11px] leading-relaxed text-ink-4">
          Конверсия из собранных в проданные:{' '}
          <span className="num text-ink-3">
            {counts.collected === 0
              ? '—'
              : `${((counts.sold / counts.collected) * 100).toFixed(1).replace('.', ',')}%`}
          </span>
        </p>
      </div>
    </Panel>
  );
}
