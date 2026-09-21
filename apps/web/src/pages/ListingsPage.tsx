import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Megaphone,
  MoreHorizontal,
  Pause,
  Play,
  Upload,
} from 'lucide-react';
import { PageHeader, MetaItem } from '@/components/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Tabs } from '@/components/ui/Tabs';
import type { TabItem } from '@/components/ui/Tabs';
import { IconButton } from '@/components/ui/Button';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { SearchInput } from '@/components/ui/Field';
import { DataTable } from '@/components/DataTable';
import type { Column } from '@/components/DataTable';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/StatusBadge';
import { MarketplaceBadge } from '@/components/MarketplaceBadge';
import { AccountCell } from '@/features/accounts/AccountCell';
import { ConnectionStatus } from '@/features/listings/ConnectionStatus';
import { useAppState } from '@/app/providers/app-state-context';
import { useSimulatedLoading } from '@/hooks/useSimulatedLoading';
import { useTableSort } from '@/hooks/useTableSort';
import type { SortAccessor } from '@/hooks/useTableSort';
import { buildListingUrl, destinationMarketplaces } from '@/config/marketplaces';
import { formatMoney, sumMoney } from '@/utils/money';
import { formatDateTime } from '@/utils/date';
import { formatNumber } from '@/utils/format';
import type { ListingStatus, MarketplaceListing } from '@gamestock/domain';

type TabValue = 'all' | ListingStatus;

export function ListingsPage() {
  const state = useAppState();
  const loading = useSimulatedLoading([state.gameId]);

  const [tab, setTab] = useState<TabValue>('all');
  const [search, setSearch] = useState('');

  const counts = useMemo(() => {
    const base: Record<TabValue, number> = {
      all: state.listings.length,
      draft: 0,
      published: 0,
      paused: 0,
      sold: 0,
      error: 0,
    };
    for (const listing of state.listings) base[listing.status] += 1;
    return base;
  }, [state.listings]);

  const tabs: TabItem<TabValue>[] = [
    { value: 'all', label: 'Все', count: counts.all },
    { value: 'draft', label: 'Черновики', count: counts.draft },
    { value: 'published', label: 'Опубликованы', count: counts.published },
    { value: 'paused', label: 'Приостановлены', count: counts.paused },
    { value: 'sold', label: 'Проданы', count: counts.sold },
    { value: 'error', label: 'Ошибка', count: counts.error },
  ];

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return state.listings.filter((listing) => {
      if (tab !== 'all' && listing.status !== tab) return false;
      if (!query) return true;
      return `${listing.id} ${listing.accountId} ${listing.title} ${listing.externalListingId ?? ''}`
        .toLowerCase()
        .includes(query);
    });
  }, [state.listings, tab, search]);

  const accessors: Record<string, SortAccessor<MarketplaceListing>> = {
    account: (row) => row.accountId,
    sellPrice: (row) => row.sellPrice.amount,
    purchasePrice: (row) => row.purchasePrice.amount,
    profit: (row) => row.expectedProfit.amount,
    status: (row) => row.status,
    publishedAt: (row) => (row.publishedAt ? new Date(row.publishedAt).getTime() : null),
  };

  const { sort, toggle, sorted } = useTableSort(filtered, accessors, {
    key: 'publishedAt',
    direction: 'desc',
  });

  const activeValue = useMemo(
    () =>
      sumMoney(
        state.listings
          .filter((listing) => listing.status === 'published')
          .map((listing) => listing.sellPrice),
      ),
    [state.listings],
  );

  const columns: Column<MarketplaceListing>[] = [
    {
      key: 'account',
      header: 'Аккаунт',
      width: 300,
      sortable: true,
      stickyLeft: 0,
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
      key: 'listingId',
      header: 'ID объявления',
      width: 124,
      render: (row) =>
        row.externalListingId ? (
          <a
            href={buildListingUrl(row.marketplace, row.externalListingId)}
            target="_blank"
            rel="noreferrer noopener"
            onClick={(event) => event.stopPropagation()}
            className="num inline-flex items-center gap-1 text-[11.5px] text-ink-2 transition-colors hover:text-accent"
          >
            {row.externalListingId}
            <ArrowUpRight size={11} />
          </a>
        ) : (
          <span className="text-[11.5px] text-ink-4">не присвоен</span>
        ),
    },
    {
      key: 'sellPrice',
      header: 'Цена продажи',
      align: 'right',
      width: 104,
      sortable: true,
      render: (row) => <span className="num font-medium text-ink">{formatMoney(row.sellPrice)}</span>,
    },
    {
      key: 'purchasePrice',
      header: 'Цена покупки',
      align: 'right',
      width: 104,
      sortable: true,
      render: (row) => <span className="num text-ink-2">{formatMoney(row.purchasePrice)}</span>,
    },
    {
      key: 'profit',
      header: 'Прибыль',
      title: 'Ожидаемая прибыль после комиссий',
      align: 'right',
      width: 128,
      sortable: true,
      render: (row) => (
        <span className={row.expectedProfit.amount >= 0 ? 'num text-pos' : 'num text-neg'}>
          {formatMoney(row.expectedProfit, { signed: true })}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Статус',
      width: 148,
      sortable: true,
      render: (row) => (
        <span className="flex items-center gap-1.5">
          <StatusBadge domain="listing" status={row.status} />
          {row.errorMessage ? (
            <span title={row.errorMessage}>
              <AlertTriangle size={12} className="text-neg" />
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: 'publishedAt',
      header: 'Опубликовано',
      width: 116,
      sortable: true,
      render: (row) => <span className="text-ink-3">{formatDateTime(row.publishedAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 52,
      render: (row) => (
        <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
          <DropdownMenu
            items={[
              {
                key: 'publish',
                label: 'Опубликовать',
                icon: Upload,
                tone: 'success',
                disabled: row.status === 'published' || row.status === 'sold',
                onSelect: () => state.setListingStatus(row.id, 'published'),
              },
              {
                key: 'pause',
                label: 'Приостановить',
                icon: Pause,
                disabled: row.status !== 'published',
                onSelect: () => state.setListingStatus(row.id, 'paused'),
              },
              {
                key: 'resume',
                label: 'Возобновить',
                icon: Play,
                disabled: row.status !== 'paused',
                onSelect: () => state.setListingStatus(row.id, 'published'),
              },
            ]}
            trigger={({ toggle: toggleMenu }) => (
              <IconButton icon={MoreHorizontal} size="xs" variant="subtle" onClick={toggleMenu} />
            )}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Объявления"
        subtitle="Подготовленные и опубликованные лоты на площадках продажи"
        meta={
          <>
            <MetaItem label="Всего объявлений:" value={formatNumber(state.listings.length)} />
            <MetaItem label="Активных:" value={formatNumber(counts.published)} tone="pos" />
            <MetaItem label="Сумма активных лотов:" value={formatMoney(activeValue)} />
          </>
        }
        actions={
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по объявлениям"
            className="w-[240px]"
          />
        }
      />

      <ConnectionStatus ids={destinationMarketplaces().map((m) => m.id)} />

      <Panel className="overflow-hidden">
        <Tabs items={tabs} value={tab} onChange={setTab} />
        <DataTable
          columns={columns}
          rows={sorted}
          rowKey={(row) => row.id}
          sort={sort}
          onSortToggle={toggle}
          loading={loading}
          minWidth={1186}
          empty={
            <EmptyState
              icon={Megaphone}
              title="Объявлений нет"
              description="Подготовьте позицию в инвентаре, чтобы создать черновик объявления."
            />
          }
        />
      </Panel>
    </div>
  );
}
