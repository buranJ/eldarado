import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Megaphone,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';
import { PageHeader, MetaItem } from '@/components/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Tabs } from '@/components/ui/Tabs';
import type { TabItem } from '@/components/ui/Tabs';
import { Button, IconButton } from '@/components/ui/Button';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { Modal } from '@/components/ui/Modal';
import { SearchInput, Select } from '@/components/ui/Field';
import { DataTable } from '@/components/DataTable';
import type { Column } from '@/components/DataTable';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/StatusBadge';
import { MarketplaceBadge } from '@/components/MarketplaceBadge';
import { AccountCell } from '@/features/accounts/AccountCell';
import { ConnectionStatus } from '@/features/listings/ConnectionStatus';
import { useAppState } from '@/app/providers/app-state-context';
import { useToast } from '@/app/providers/toast-context';
import { useQuery } from '@/hooks/useQuery';
import { useTableSort } from '@/hooks/useTableSort';
import type { SortAccessor } from '@/hooks/useTableSort';
import { api } from '@/api/client';
import { buildListingUrl } from '@/config/marketplaces';
import { formatMoney, sumMoney } from '@/utils/money';
import { formatDateTime } from '@/utils/date';
import { formatNumber } from '@/utils/format';
import type { ListingStatus, MarketplaceListing } from '@gamestock/domain';

const EMPTY_LISTINGS: MarketplaceListing[] = [];

type TabValue = 'all' | ListingStatus;

export function ListingsPage() {
  const state = useAppState();
  const toast = useToast();
  const listings = useQuery(
    () => api.eldoradoListings(),
    [state.dataVersion],
  );
  const connection = useQuery(() => api.eldoradoStatus(), []);

  const [tab, setTab] = useState<TabValue>('all');
  const [gameFilter, setGameFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<MarketplaceListing | null>(null);
  const [deleting, setDeleting] = useState(false);
  const rows = listings.data?.items ?? EMPTY_LISTINGS;
  const games = useMemo(
    () =>
      [...new Map(rows.map((row) => [row.gameId, row.gameLabel ?? row.gameId])).entries()].sort(
        ([, left], [, right]) => left.localeCompare(right, 'ru'),
      ),
    [rows],
  );

  const counts = useMemo(() => {
    const base: Record<TabValue, number> = {
      all: rows.length,
      draft: 0,
      published: 0,
      paused: 0,
      sold: 0,
      error: 0,
      deleted: 0,
    };
    for (const listing of rows) base[listing.status] += 1;
    return base;
  }, [rows]);

  const tabs: TabItem<TabValue>[] = [
    { value: 'all', label: 'Все', count: counts.all },
    { value: 'draft', label: 'Черновики', count: counts.draft },
    { value: 'published', label: 'Опубликованы', count: counts.published },
    { value: 'paused', label: 'Приостановлены', count: counts.paused },
    { value: 'sold', label: 'Проданы', count: counts.sold },
    { value: 'error', label: 'Ошибка', count: counts.error },
    { value: 'deleted', label: 'Удалены', count: counts.deleted },
  ];

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((listing) => {
      if (tab !== 'all' && listing.status !== tab) return false;
      if (gameFilter !== 'all' && listing.gameId !== gameFilter) return false;
      if (!query) return true;
      return `${listing.id} ${listing.accountId} ${listing.gameLabel ?? ''} ${listing.title} ${listing.externalListingId ?? ''}`
        .toLowerCase()
        .includes(query);
    });
  }, [rows, tab, gameFilter, search]);

  const accessors: Record<string, SortAccessor<MarketplaceListing>> = {
    account: (row) => row.accountId,
    sellPrice: (row) => row.sellPrice?.amount ?? null,
    purchasePrice: (row) => row.purchasePrice?.amount ?? null,
    profit: (row) => row.expectedProfit?.amount ?? null,
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
        rows
          .filter(
            (listing): listing is MarketplaceListing & {
              sellPrice: NonNullable<MarketplaceListing['sellPrice']>;
            } =>
              listing.status === 'published' && listing.sellPrice !== null,
          )
          .map((listing) => listing.sellPrice),
      ),
    [rows],
  );

  const deleteListing = async () => {
    if (!deleteTarget) return;
    if (!deleteTarget.externalListingId) return;
    setDeleting(true);
    try {
      if (deleteTarget.inventoryItemId) {
        await api.deleteEldoradoListing(deleteTarget.inventoryItemId);
      } else {
        await api.deleteEldoradoOffer(deleteTarget.externalListingId);
      }
      toast.push({
        tone: 'success',
        title: 'Объявление удалено',
        description: `Лот ${deleteTarget.externalListingId ?? ''} удалён с Eldorado.`,
      });
      setDeleteTarget(null);
      listings.refetch();
      state.notifyDataChanged();
    } catch (error) {
      toast.push({
        tone: 'error',
        title: 'Не удалось удалить объявление',
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<MarketplaceListing>[] = [
    {
      key: 'account',
      header: 'Аккаунт',
      width: 300,
      sortable: true,
      stickyLeft: 0,
      stickyEdge: true,
      render: (row) =>
        row.source === 'eldorado' ? (
          <div className="min-w-0">
            <div className="text-[12px] font-medium text-ink">Внешний лот Eldorado</div>
            <div className="max-w-[276px] truncate text-[11.5px] text-ink-3" title={row.title}>
              {row.title}
            </div>
          </div>
        ) : (
          <AccountCell id={row.accountId} title={row.title} gameId={row.gameId} />
        ),
    },
    {
      key: 'game',
      header: 'Игра',
      width: 180,
      render: (row) => <span className="text-[11.5px] text-ink-2">{row.gameLabel ?? row.gameId}</span>,
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
            href={row.url ?? buildListingUrl(row.marketplace, row.externalListingId)}
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
      render: (row) => (
        <span className="num font-medium text-ink">{formatMoney(row.sellPrice)}</span>
      ),
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
      render: (row) => {
        if (!row.expectedProfit) return '—';
        return (
          <span className={row.expectedProfit.amount >= 0 ? 'num text-pos' : 'num text-neg'}>
            {formatMoney(row.expectedProfit, { signed: true })}
          </span>
        );
      },
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
                key: 'delete',
                label: 'Удалить с Eldorado',
                icon: Trash2,
                tone: 'danger',
                disabled: !row.externalListingId || row.status === 'deleted',
                onSelect: () => setDeleteTarget(row),
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
        subtitle="Все лоты учётной записи Eldorado, включая созданные вручную"
        meta={
          <>
            <MetaItem label="Всего объявлений:" value={formatNumber(rows.length)} />
            <MetaItem label="Активных:" value={formatNumber(counts.published)} tone="pos" />
            <MetaItem label="Сумма активных лотов:" value={formatMoney(activeValue)} />
          </>
        }
        actions={
          <>
            <Select
              value={gameFilter}
              onChange={(event) => setGameFilter(event.target.value)}
              className="w-[220px]"
              options={[
                { value: 'all', label: 'Все игры' },
                ...games.map(([value, label]) => ({ value, label })),
              ]}
            />
            <SearchInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Поиск по объявлениям"
              className="w-[240px]"
            />
          </>
        }
      />

      <ConnectionStatus
        id="eldorado"
        connection={connection.data?.configured ? 'connected' : 'not_connected'}
      />

      {listings.data?.remoteError ? (
        <div className="rounded-lg border border-[#4a2326] bg-[#241416] px-4 py-2.5 text-[11.5px] text-neg">
          Не удалось обновить внешние объявления Eldorado: {listings.data.remoteError}
        </div>
      ) : null}

      <Panel className="overflow-hidden">
        <Tabs items={tabs} value={tab} onChange={setTab} />
        {listings.error ? (
          <EmptyState
            icon={AlertTriangle}
            title="Не удалось загрузить объявления"
            description={listings.error}
            action={<Button onClick={listings.refetch}>Повторить</Button>}
          />
        ) : (
          <DataTable
            columns={columns}
            rows={sorted}
            rowKey={(row) => row.id}
            sort={sort}
            onSortToggle={toggle}
            loading={listings.loading}
            minWidth={1366}
            empty={
              <EmptyState
                icon={Megaphone}
                title="Объявлений нет"
                description="Опубликуйте аккаунт из инвентаря — созданный лот появится здесь."
              />
            }
          />
        )}
      </Panel>

      <Modal
        open={deleteTarget !== null}
        onClose={deleting ? () => undefined : () => setDeleteTarget(null)}
        title="Удалить объявление с Eldorado?"
        description={
          deleteTarget?.externalListingId
            ? `Лот ${deleteTarget.externalListingId} исчезнет с площадки.`
            : undefined
        }
        footer={
          <>
            <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Отмена
            </Button>
            <Button
              variant="danger"
              icon={Trash2}
              onClick={() => void deleteListing()}
              disabled={deleting}
            >
              {deleting ? 'Удаление…' : 'Удалить'}
            </Button>
          </>
        }
      >
        <p className="text-[12px] leading-relaxed text-ink-2">
          {deleteTarget?.inventoryItemId
            ? 'Удалится только объявление. Сам аккаунт и история операции останутся в инвентаре.'
            : 'Это внешний лот, созданный вне GameStock. Он будет удалён непосредственно с Eldorado.'}
        </p>
      </Modal>
    </div>
  );
}
