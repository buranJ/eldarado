import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Boxes,
  Brain,
  CheckCircle2,
  Megaphone,
  Receipt,
  Search,
  Trophy,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { CardsSkeleton } from '@/components/ui/Skeleton';
import { DataTable } from '@/components/DataTable';
import type { Column } from '@/components/DataTable';
import { ScoreBadge } from '@/components/ScoreBadge';
import { RiskBadge } from '@/components/RiskBadge';
import { AccountDrawer } from '@/features/accounts/AccountDrawer';
import { PurchaseModal } from '@/features/accounts/PurchaseModal';
import { ActivityFeed } from '@/features/accounts/ActivityFeed';
import { PipelinePanel } from '@/features/accounts/PipelinePanel';
import { useAppState } from '@/app/providers/app-state-context';
import { useQuery } from '@/hooks/useQuery';
import { api } from '@/api/client';
import { getGame } from '@/config/games';
import { formatMoney } from '@/utils/money';
import { formatNumber, formatPercent } from '@/utils/format';
import type { GameAccount } from '@gamestock/domain';

export function OverviewPage() {
  const navigate = useNavigate();
  const state = useAppState();
  const { gameId } = state;

  const overview = useQuery(() => api.overview(gameId), [gameId, state.dataVersion]);
  const activityFeed = useQuery(() => api.activity(gameId, 9), [gameId, state.dataVersion]);
  const top = useQuery(() => api.top(gameId, 5), [gameId, state.dataVersion]);
  const loading = overview.loading;

  const [drawerAccount, setDrawerAccount] = useState<GameAccount | null>(null);
  const [purchaseAccount, setPurchaseAccount] = useState<GameAccount | null>(null);

  const counts = overview.data?.pipeline ?? {
    collected: 0,
    analyzed: 0,
    top: 0,
    approved: 0,
    purchased: 0,
    published: 0,
    sold: 0,
  };
  const kpi = overview.data?.kpi;
  const opportunities = top.data?.items ?? [];
  const game = getGame(gameId);

  const columns: Column<GameAccount>[] = [
    {
      key: 'rank',
      header: '#',
      width: 40,
      render: (_row, index) => (
        <span className="num text-[12px] font-medium text-ink-3">{index + 1}</span>
      ),
    },
    {
      key: 'account',
      header: 'Аккаунт',
      width: 148,
      render: (row) => (
        <div className="min-w-0">
          <div className="num text-[12px] font-medium text-ink">{row.source.listingId}</div>
          <div className="text-[11px] text-ink-4">{game.name}</div>
        </div>
      ),
    },
    {
      key: 'trophies',
      header: 'Трофеи',
      align: 'right',
      width: 68,
      render: (row) => <span className="num">{formatNumber(row.gameData.trophies)}</span>,
    },
    {
      key: 'collection',
      header: 'Колл.',
      align: 'right',
      title: 'Уровень коллекции',
      width: 64,
      render: (row) => <span className="num">{formatNumber(row.gameData.collectionLevel)}</span>,
    },
    {
      key: 'evo',
      header: 'EVO',
      align: 'right',
      title: 'Эволюции',
      width: 50,
      render: (row) => <span className="num">{formatNumber(row.gameData.evolutions)}</span>,
    },
    {
      key: 'heroes',
      header: 'Герои',
      align: 'right',
      width: 56,
      render: (row) => <span className="num">{formatNumber(row.gameData.heroes)}</span>,
    },
    {
      key: 'maxCards',
      header: 'Lv16',
      align: 'right',
      title: 'Карты максимального уровня',
      width: 66,
      render: (row) => <span className="num">{formatNumber(row.gameData.level16Cards)}</span>,
    },
    {
      key: 'price',
      header: 'Цена',
      title: 'Цена на источнике',
      align: 'right',
      width: 74,
      render: (row) => <span className="num text-ink">{formatMoney(row.source.price)}</span>,
    },
    {
      key: 'resale',
      header: 'Реком.',
      title: 'Рекомендуемая цена перепродажи',
      align: 'right',
      width: 84,
      render: (row) => (
        <span className="num text-[#93a8ff]">
          {formatMoney(row.analysis?.recommendedResalePrice)}
        </span>
      ),
    },
    {
      key: 'margin',
      header: 'Маржа',
      title: 'Ожидаемая маржа',
      align: 'right',
      width: 68,
      render: (row) => (
        <span className="num text-pos">
          {formatPercent(row.analysis?.estimatedMarginPercent, { signed: true })}
        </span>
      ),
    },
    {
      key: 'deal',
      header: 'Deal',
      title: 'Deal Score',
      align: 'right',
      width: 66,
      render: (row) => (row.analysis ? <ScoreBadge score={row.analysis.dealScore} /> : '—'),
    },
    {
      key: 'risk',
      header: 'Risk',
      title: 'Risk Score',
      align: 'right',
      width: 76,
      render: (row) => (row.analysis ? <RiskBadge score={row.analysis.riskScore} withValue={false} /> : '—'),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Обзор"
        subtitle="Состояние пайплайна закупки и перепродажи за последние 24 часа"
        actions={
          <Button variant="default" iconRight={ArrowRight} onClick={() => navigate('/top-accounts')}>
            К топу аккаунтов
          </Button>
        }
      />

      {loading ? (
        <CardsSkeleton count={6} />
      ) : (
        <div className="grid grid-cols-6 gap-3">
          <StatCard
            label="Найдено за 24 часа"
            value={formatNumber(kpi?.foundToday ?? 0)}
            icon={Search}
          />
          <StatCard
            label="Прошло AI-анализ"
            value={formatNumber(kpi?.analysed ?? 0)}
            icon={Brain}
          />
          <StatCard
            label="Попало в Top 100"
            value={formatNumber(counts.top)}
            icon={Trophy}
            tone="accent"
          />
          <StatCard
            label="Куплено"
            value={formatNumber(counts.purchased)}
            icon={Boxes}
          />
          <StatCard
            label="Опубликовано"
            value={formatNumber(counts.published)}
            icon={Megaphone}
          />
          <StatCard
            label="Продано"
            value={formatNumber(counts.sold)}
            icon={Receipt}
            tone="pos"
          />
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)_296px] items-start gap-5">
        <div className="space-y-5">
          <Panel>
            <PanelHeader
              title="Лучшие возможности сегодня"
              subtitle="Отобраны по Deal Score среди проанализированных аккаунтов"
              action={
                <Button size="xs" variant="ghost" iconRight={ArrowRight} onClick={() => navigate('/top-accounts')}>
                  Все
                </Button>
              }
            />
            <DataTable
              columns={columns}
              rows={opportunities}
              rowKey={(row) => row.id}
              loading={top.loading}
              onRowClick={(row) => setDrawerAccount(row)}
              minWidth={880}
            />
          </Panel>

          <Panel>
            <PanelHeader title="Последние действия" subtitle="Операции команды и системные события" />
            <ActivityFeed events={activityFeed.data ?? []} loading={activityFeed.loading} />
          </Panel>
        </div>

        <PipelinePanel counts={counts} loading={loading} />
      </div>

      <AccountDrawer
        account={drawerAccount}
        open={drawerAccount !== null}
        onClose={() => setDrawerAccount(null)}
        onApprove={(id) => {
          state.approveAccount(id);
          setDrawerAccount(null);
        }}
        onReject={(id) => {
          state.rejectAccount(id);
          setDrawerAccount(null);
        }}
        onBuy={(account) => {
          setDrawerAccount(null);
          setPurchaseAccount(account);
        }}
      />
      <PurchaseModal
        account={purchaseAccount}
        open={purchaseAccount !== null}
        onClose={() => setPurchaseAccount(null)}
        onConfirm={state.purchaseAccount}
      />

      <div className="flex items-center gap-2 pt-1">
        <CheckCircle2 size={12} className="text-ink-4" />
        <p className="text-[11.5px] text-ink-4">
          Показатели считаются по текущей когорте объявлений. Сравнение с предыдущими сутками
          появится, когда накопится история сборов.
        </p>
      </div>
    </div>
  );
}
