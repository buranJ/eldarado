
import { Brain, CheckCircle2, Gauge, TriangleAlert } from 'lucide-react';
import { PageHeader, MetaItem } from '@/components/PageHeader';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { StatCard } from '@/components/StatCard';
import { Badge } from '@/components/ui/Badge';
import { CardsSkeleton } from '@/components/ui/Skeleton';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { DataTable } from '@/components/DataTable';
import type { Column } from '@/components/DataTable';
import { ScoreBadge } from '@/components/ScoreBadge';
import { RiskBadge } from '@/components/RiskBadge';
import { ScoringModelPanel } from '@/features/ai-analysis/ScoringModelPanel';
import { useAppState } from '@/app/providers/app-state-context';
import { useSimulatedLoading } from '@/hooks/useSimulatedLoading';
import { useQuery } from '@/hooks/useQuery';
import { api } from '@/api/client';
import { AI_RUNS_FIXTURE, AI_STATS } from '@/data/aiRuns';
import { formatNumber, formatPercent } from '@/utils/format';
import { formatRelative } from '@/utils/date';
import type { AIRun, AIRunResult } from '@gamestock/domain';

const RESULTS: Record<AIRunResult, { label: string; tone: 'pos' | 'warn' | 'neg' }> = {
  ok: { label: 'Успешно', tone: 'pos' },
  needs_review: { label: 'Требует проверки', tone: 'warn' },
  failed: { label: 'Ошибка', tone: 'neg' },
};

export function AiAnalysisPage() {
  const state = useAppState();
  const loading = useSimulatedLoading([state.gameId]);

  const status = useQuery(() => api.analysisStatus(), [state.gameId, state.dataVersion]);
  const avgDeal = status.data?.averages.deal ?? 0;
  const recognizedShare = (AI_STATS.recognized / AI_STATS.processed) * 100;

  const columns: Column<AIRun>[] = [
    {
      key: 'account',
      header: 'Аккаунт',
      width: 300,
      render: (row) => (
        <div className="min-w-0">
          <div className="num text-[12px] font-medium text-ink">{row.accountId}</div>
          <div className="truncate text-[11px] text-ink-4" title={row.title}>
            {row.title}
          </div>
        </div>
      ),
    },
    {
      key: 'quality',
      header: 'Quality',
      align: 'right',
      width: 90,
      render: (row) =>
        row.result === 'failed' ? (
          <span className="text-ink-4">—</span>
        ) : (
          <ScoreBadge score={row.qualityScore} kind="quality" />
        ),
    },
    {
      key: 'deal',
      header: 'Deal',
      align: 'right',
      width: 90,
      render: (row) =>
        row.result === 'failed' ? (
          <span className="text-ink-4">—</span>
        ) : (
          <ScoreBadge score={row.dealScore} />
        ),
    },
    {
      key: 'risk',
      header: 'Risk',
      width: 124,
      render: (row) =>
        row.result === 'failed' ? (
          <span className="text-ink-4">—</span>
        ) : (
          <RiskBadge score={row.riskScore} />
        ),
    },
    {
      key: 'confidence',
      header: 'Достоверность',
      width: 148,
      render: (row) => (
        <span className="flex items-center gap-2">
          <ProgressBar
            value={row.confidence}
            tone={row.confidence >= 85 ? 'pos' : row.confidence >= 70 ? 'warn' : 'neg'}
            className="w-14"
          />
          <span className="num text-[11.5px] text-ink-3">{row.confidence}%</span>
        </span>
      ),
    },
    {
      key: 'result',
      header: 'Результат',
      width: 170,
      render: (row) => (
        <Badge tone={RESULTS[row.result].tone} dot>
          {RESULTS[row.result].label}
        </Badge>
      ),
    },
    {
      key: 'at',
      header: 'Когда',
      align: 'right',
      width: 120,
      render: (row) => <span className="text-ink-3">{formatRelative(row.at)}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="AI-анализ"
        subtitle="Состояние модели оценки аккаунтов и результаты последних прогонов"
        meta={
          <>
            <MetaItem label="Модель:" value="не подключена · mock scoring" />
            <MetaItem label="Версия правил:" value="cr-scoring-v1.4" />
            <MetaItem label="Распознано:" value={formatPercent(recognizedShare)} tone="pos" />
          </>
        }
      />

      {loading ? (
        <CardsSkeleton count={4} columns={4} />
      ) : (
        <div className="grid grid-cols-4 gap-3">
          <StatCard
            label="Обработано аккаунтов"
            value={formatNumber(AI_STATS.processed)}
            icon={Brain}
          />
          <StatCard
            label="Успешно распознано"
            value={formatNumber(AI_STATS.recognized)}
            hint={formatPercent(recognizedShare)}
            icon={CheckCircle2}
            tone="pos"
          />
          <StatCard
            label="Требует проверки"
            value={formatNumber(AI_STATS.needsReview)}
            icon={TriangleAlert}
          />
          <StatCard
            label="Средний Deal Score"
            value={String(avgDeal)}
            icon={Gauge}
            tone="accent"
          />
        </div>
      )}

      <div>
        <h2 className="mb-3 text-[13px] font-semibold tracking-[-0.01em] text-ink">Scoring model</h2>
        <ScoringModelPanel gameId={state.gameId} />
      </div>

      <Panel className="overflow-hidden">
        <PanelHeader
          title="Последние AI-анализы"
          subtitle="Журнал прогонов модели по объявлениям источника"
        />
        <DataTable
          columns={columns}
          rows={AI_RUNS_FIXTURE}
          rowKey={(row) => row.id}
          loading={loading}
          minWidth={1120}
        />
      </Panel>
    </div>
  );
}
