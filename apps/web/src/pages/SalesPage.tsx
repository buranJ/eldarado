import { useMemo, useState } from 'react';
import { ArrowUpRight, Percent, Receipt, TrendingUp, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { StatCard } from '@/components/StatCard';
import { SearchInput, Select } from '@/components/ui/Field';
import { CardsSkeleton } from '@/components/ui/Skeleton';
import { DataTable } from '@/components/DataTable';
import type { Column } from '@/components/DataTable';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/StatusBadge';
import { MarketplaceBadge } from '@/components/MarketplaceBadge';
import { AccountCell } from '@/features/accounts/AccountCell';
import { useAppState } from '@/app/providers/app-state-context';
import { useQuery } from '@/hooks/useQuery';
import { useTableSort } from '@/hooks/useTableSort';
import type { SortAccessor } from '@/hooks/useTableSort';
import { filterSales, salesTotals } from '@/features/sales/selectors';
import { formatMoney } from '@/utils/money';
import { formatDateTime } from '@/utils/date';
import { formatNumber, formatPercent } from '@/utils/format';
import { api } from '@/api/client';
import type { Sale, SaleStatus } from '@gamestock/domain';

type Period = 'all' | '30' | '90';

export function SalesPage() {
  const state = useAppState();
  const sales = useQuery(
    () => api.eldoradoSales(state.gameId),
    [state.gameId, state.dataVersion],
  );

  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<Period>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | SaleStatus>('all');
  /* Reference point for period filters, fixed for the lifetime of the screen. */
  const [now] = useState(() => Date.now());

  const filtered = useMemo(
    () =>
      filterSales(
        sales.data?.items ?? [],
        { query: search, periodDays: period === 'all' ? null : Number(period), status: statusFilter },
        now,
      ),
    [sales.data, search, period, statusFilter, now],
  );

  const totals = useMemo(() => salesTotals(filtered), [filtered]);

  const accessors: Record<string, SortAccessor<Sale>> = {
    id: (row) => row.id,
    account: (row) => row.accountId,
    purchasePrice: (row) => row.purchasePrice?.amount ?? null,
    salePrice: (row) => row.salePrice.amount,
    fees: (row) => row.fees?.amount ?? null,
    netProfit: (row) => row.netProfit?.amount ?? null,
    roi: (row) => row.roiPercent,
    soldAt: (row) => new Date(row.soldAt).getTime(),
    status: (row) => row.status,
  };

  const { sort, toggle, sorted } = useTableSort(filtered, accessors, {
    key: 'soldAt',
    direction: 'desc',
  });

  const columns: Column<Sale>[] = [
    {
      key: 'id',
      header: 'Заказ',
      width: 100,
      sortable: true,
      stickyLeft: 0,
      render: (row) => (
        <a
          href={row.url ?? undefined}
          target="_blank"
          rel="noreferrer noopener"
          className="num inline-flex max-w-[88px] items-center gap-1 truncate text-[12px] font-medium text-ink transition-colors hover:text-accent"
          title={row.id}
        >
          {row.id.slice(0, 8)}
          <ArrowUpRight size={11} className="shrink-0" />
        </a>
      ),
    },
    {
      key: 'account',
      header: 'Аккаунт',
      width: 300,
      sortable: true,
      stickyLeft: 112,
      stickyEdge: true,
      render: (row) => <AccountCell id={row.accountId} title={row.title} gameId={row.gameId} />,
    },
    {
      key: 'marketplace',
      header: 'Площадка',
      width: 110,
      render: (row) => <MarketplaceBadge id={row.marketplace} />,
    },
    {
      key: 'purchasePrice',
      header: 'Закупка',
      title: 'Цена покупки',
      align: 'right',
      width: 100,
      sortable: true,
      render: (row) => <span className="num text-ink-2">{formatMoney(row.purchasePrice)}</span>,
    },
    {
      key: 'salePrice',
      header: 'Продажа',
      title: 'Цена продажи',
      align: 'right',
      width: 104,
      sortable: true,
      render: (row) => <span className="num font-medium text-ink">{formatMoney(row.salePrice)}</span>,
    },
    {
      key: 'fees',
      header: 'Комиссии',
      align: 'right',
      width: 88,
      sortable: true,
      render: (row) => <span className="num text-ink-3">−{formatMoney(row.fees)}</span>,
    },
    {
      key: 'netProfit',
      header: 'Прибыль',
      title: 'Чистая прибыль',
      align: 'right',
      width: 116,
      sortable: true,
      render: (row) => (
        row.netProfit ? (
          <span className={row.netProfit.amount >= 0 ? 'num font-medium text-pos' : 'num font-medium text-neg'}>
            {formatMoney(row.netProfit, { signed: true })}
          </span>
        ) : '—'
      ),
    },
    {
      key: 'roi',
      header: 'ROI',
      align: 'right',
      width: 78,
      sortable: true,
      render: (row) => (
        row.roiPercent !== null ? (
          <span className={row.roiPercent >= 0 ? 'num text-pos' : 'num text-neg'}>
            {formatPercent(row.roiPercent, { signed: true })}
          </span>
        ) : '—'
      ),
    },
    {
      key: 'soldAt',
      header: 'Дата',
      width: 112,
      sortable: true,
      render: (row) => <span className="text-ink-3">{formatDateTime(row.soldAt)}</span>,
    },
    {
      key: 'status',
      header: 'Статус',
      width: 138,
      sortable: true,
      render: (row) => <StatusBadge domain="sale" status={row.status} />,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Продажи"
        subtitle="История заказов из подключённого аккаунта Eldorado"
        actions={
          <>
            <Select
              value={period}
              onChange={(event) => setPeriod(event.target.value as Period)}
              className="w-[150px]"
              options={[
                { value: 'all', label: 'За всё время' },
                { value: '30', label: 'Последние 30 дней' },
                { value: '90', label: 'Последние 90 дней' },
              ]}
            />
            <Select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | SaleStatus)}
              className="w-[170px]"
              options={[
                { value: 'all', label: 'Все статусы' },
                { value: 'completed', label: 'Завершена' },
                { value: 'pending_payout', label: 'Ожидает выплаты' },
                { value: 'canceled', label: 'Отменён' },
                { value: 'refunded', label: 'Возврат' },
                { value: 'disputed', label: 'Спор' },
              ]}
            />
            <SearchInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Поиск по заказам"
              className="w-[220px]"
            />
          </>
        }
      />

      {sales.loading ? (
        <CardsSkeleton count={4} columns={4} />
      ) : (
        <div className="grid grid-cols-4 gap-3">
          <StatCard label="Продажи" value={formatNumber(totals.count)} icon={Receipt} />
          <StatCard label="Выручка" value={formatMoney(totals.revenue)} icon={Wallet} />
          <StatCard label="Прибыль" value={formatMoney(totals.profit)} icon={TrendingUp} tone="pos" />
          <StatCard
            label="Средний ROI"
            value={formatPercent(totals.averageRoi)}
            icon={Percent}
            tone="accent"
          />
        </div>
      )}

      <Panel className="overflow-hidden">
        <DataTable
          columns={columns}
          rows={sorted}
          rowKey={(row) => row.id}
          sort={sort}
          onSortToggle={toggle}
          loading={sales.loading}
          minWidth={1256}
          empty={
            <EmptyState
              icon={Receipt}
              title="Продаж не найдено"
              description={sales.error ?? 'За выбранный период заказов нет.'}
            />
          }
        />
      </Panel>

      <p className="text-[11px] text-ink-4">
        Для заказов, созданных вручную вне GameStock, цена закупки, комиссия, прибыль и ROI
        неизвестны и отмечены прочерком.
      </p>
    </div>
  );
}
