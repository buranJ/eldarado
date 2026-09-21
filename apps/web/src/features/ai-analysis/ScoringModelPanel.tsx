import { Panel, PanelHeader } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { DEAL_SCORE_INPUTS, RISK_SCORE_INPUTS } from '@/config/scoring';
import { getGame } from '@/config/games';
import type { GameId } from '@gamestock/domain';

export function ScoringModelPanel({ gameId }: { gameId: GameId }) {
  const game = getGame(gameId);
  const model = game.scoringModel;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
      <Panel>
        <PanelHeader
          title="Account Quality Score"
          subtitle={`Оценка качества аккаунта независимо от цены · ${game.name}`}
          action={model ? <Badge tone="muted">{model.version}</Badge> : null}
        />
        <div className="divide-y divide-line">
          {model?.factors.map((factor) => (
            <div key={factor.key} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[12.5px] font-medium text-ink">{factor.label}</span>
                <span className="num text-[12.5px] font-semibold text-[#93a8ff]">
                  {Math.round(factor.weight * 100)}%
                </span>
              </div>
              <ProgressBar value={factor.weight * 100} className="mt-2 w-full" height={3} />
              <p className="mt-2 text-[11.5px] leading-relaxed text-ink-4">
                {factor.inputs.join(' · ')}
              </p>
            </div>
          ))}
        </div>
      </Panel>

      <div className="space-y-4">
        <Panel>
          <PanelHeader
            title="Deal Score"
            subtitle="Главный показатель выгодности сделки"
            action={<Badge tone="accent">основной</Badge>}
          />
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 px-4 py-3">
            {DEAL_SCORE_INPUTS.map((input) => (
              <div key={input.label} className="flex items-baseline gap-2 py-1">
                <span className="mt-[6px] size-1 shrink-0 rounded-full bg-accent" />
                <div className="min-w-0">
                  <p className="text-[12px] text-ink-2">{input.label}</p>
                  <p className="text-[11px] text-ink-4">{input.hint}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-line px-4 py-3">
            <p className="text-[11.5px] leading-relaxed text-ink-4">
              Высокий Quality Score не означает высокий Deal Score: аккаунт с оценкой качества 96 за
              $250 может уступать аккаунту с оценкой 82 за $18.
            </p>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Risk Score" subtitle="0–100, выше значение — выше риск сделки" />
          <div className="flex flex-wrap gap-1.5 px-4 py-3">
            {RISK_SCORE_INPUTS.map((input) => (
              <Badge key={input} tone="muted">
                {input}
              </Badge>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
