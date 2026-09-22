import { useMemo, useState } from 'react';
import { AlertTriangle, Store, Zap } from 'lucide-react';
import { PageHeader, MetaItem } from '@/components/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/DataTable';
import type { Column } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/StatusBadge';
import { MarketplaceBadge } from '@/components/MarketplaceBadge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { AccountDrawer } from '@/features/accounts/AccountDrawer';
import { PurchaseModal } from '@/features/accounts/PurchaseModal';
import { MarketplaceFilters } from '@/features/accounts/MarketplaceFilters';
import { EMPTY_FILTERS, toListingQuery } from '@/features/accounts/marketplace-filters';
import type { MarketplaceFilterState } from '@/features/accounts/marketplace-filters';
import { useAppState } from '@/app/providers/app-state-context';
import { useQuery } from '@/hooks/useQuery';
import { api } from '@/api/client';
import { getGame } from '@/config/games';
import { formatMoney } from '@/utils/money';
import { formatNumber, formatRating } from '@/utils/format';
import { formatRelative } from '@/utils/date';
import type { GameAccount } from '@gamestock/domain';
import { cn } from '@/utils/cn';

/** Columns the API can sort on — the rest are display-only for now. */
const SORT_KEYS: Record<string, string> = {
  id: 'externalId',
  price: 'priceMinor',
  arena: 'arena',
  trophies: 'trophies',
  cards: 'unlockedCards',
  legendary: 'legendaryCards',
  level: 'accountLevel',
  foundAt: 'firstSeenAt',
  status: 'status',
};

export function MarketplacePage() {
  const state = useAppState();

  const [filters, setFilters] = useState<MarketplaceFilterState>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState({ key: 'id', direction: 'desc' as 'asc' | 'desc' });
  const [drawerAccount, setDrawerAccount] = useState<GameAccount | null>(null);
  const [purchaseAccount, setPurchaseAccount] = useState<GameAccount | null>(null);

  const query = useMemo(
    () => ({
      ...toListingQuery(filters),
      gameId: state.gameId,
      page,
      pageSize,
      sort: SORT_KEYS[sort.key] ?? 'externalId',
      direction: sort.direction,
    }),
    [filters, state.gameId, page, pageSize, sort],
  );

  const listings = useQuery(
    () => api.listings(query),
    [JSON.stringify(query), state.dataVersion],
  );
  const stats = useQuery(() => api.syncStatus(), [listings.data]);

  const rows = listings.data?.items ?? [];
  const total = listings.data?.total ?? 0;
  const lastRun = stats.data?.lastRun ?? null;

  const toggleSort = (key: string) => {
    if (!(key in SORT_KEYS)) return;
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'desc' },
    );
    setPage(1);
  };

  const patchFilters = (patch: Partial<MarketplaceFilterState>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  };

  const columns: Column<GameAccount>[] = [
    {
      key: 'id',
      header: 'ID',
      width: 90,
      sortable: true,
      stickyLeft: 0,
      render: (row) => (
        <span className="num text-[12px] font-medium text-ink">{row.source.listingId}</span>
      ),
    },
    {
      key: 'game',
      header: 'Игра',
      width: 124,
      stickyLeft: 90,
      stickyEdge: true,
      render: (row) => (
        <span className="flex items-center gap-1.5 text-[12px] text-ink-2">
          <span className="flex size-4 items-center justify-center rounded-sm border border-line-2 bg-panel-2 text-[8px] font-bold text-ink-3">
            {getGame(row.gameId).monogram}
          </span>
          {getGame(row.gameId).name}
        </span>
      ),
    },
    {
      key: 'source',
      header: 'Источник',
      width: 98,
      render: (row) => <MarketplaceBadge id={row.source.marketplace} />,
    },
    {
      key: 'title',
      header: 'Заголовок',
      width: 300,
      render: (row) => (
        <span
          className="block max-w-[276px] truncate text-[12px] text-ink"
          title={row.source.title}
        >
          {row.source.title}
        </span>
      ),
    },
    {
      key: 'price',
      header: 'Цена',
      align: 'right',
      width: 92,
      sortable: true,
      render: (row) => (
        <span className="num font-medium text-ink">{formatMoney(row.source.price)}</span>
      ),
    },
    {
      key: 'arena',
      header: 'Арена',
      align: 'right',
      width: 66,
      sortable: true,
      render: (row) => <span className="num">{formatNumber(row.gameData.arena)}</span>,
    },
    {
      key: 'trophies',
      header: 'Трофеи',
      align: 'right',
      width: 78,
      sortable: true,
      render: (row) => <span className="num">{formatNumber(row.gameData.trophies)}</span>,
    },
    {
      key: 'cards',
      header: 'Карты',
      align: 'right',
      width: 76,
      sortable: true,
      title: 'Открытые карты по данным источника',
      render: (row) => <span className="num">{formatNumber(row.gameData.unlockedCards)}</span>,
    },
    {
      key: 'legendary',
      header: 'Лег.',
      align: 'right',
      width: 60,
      sortable: true,
      title: 'Легендарные карты',
      render: (row) => <span className="num">{formatNumber(row.gameData.legendaryCards)}</span>,
    },
    {
      key: 'level',
      header: 'Уровень',
      align: 'right',
      width: 78,
      sortable: true,
      title: 'Атрибут «уровень» с площадки-источника',
      render: (row) => <span className="num">{formatNumber(row.gameData.accountLevel)}</span>,
    },
    {
      key: 'rating',
      header: 'Продавец',
      width: 132,
      title: 'Рейтинг продавца и число отзывов',
      render: (row) => (
        <span className="flex items-center gap-1.5">
          <span
            className={cn(
              'num text-[12px] font-medium',
              (row.source.seller.rating ?? 0) >= 5
                ? 'text-pos'
                : (row.source.seller.rating ?? 0) >= 4
                  ? 'text-ink'
                  : 'text-neg',
            )}
          >
            {formatRating(row.source.seller.rating)}
          </span>
          <span className="num text-[11px] text-ink-4">
            {formatNumber(row.source.seller.reviewsCount)}
          </span>
          {row.source.seller.isNew ? <Badge tone="warn">новый</Badge> : null}
        </span>
      ),
    },
    {
      key: 'auto',
      header: 'Автовыдача',
      align: 'center',
      width: 84,
      render: (row) =>
        row.source.autoDelivery ? (
          <Zap size={13} className="mx-auto text-pos" strokeWidth={2.2} />
        ) : (
          <span className="text-ink-4">—</span>
        ),
    },
    {
      key: 'dataQuality',
      header: 'Данные',
      width: 90,
      title: 'Полнота извлечённых данных — считается на этапе AI-анализа',
      render: (row) =>
        row.dataQuality === null ? (
          <span className="text-[11.5px] text-ink-4">ждёт анализа</span>
        ) : (
          <span className="flex items-center gap-2">
            <ProgressBar
              value={row.dataQuality}
              tone={row.dataQuality >= 80 ? 'pos' : row.dataQuality >= 60 ? 'warn' : 'neg'}
              className="w-10"
            />
            <span className="num text-[11.5px] text-ink-3">{row.dataQuality}%</span>
          </span>
        ),
    },
    {
      key: 'foundAt',
      header: 'Найден',
      width: 96,
      sortable: true,
      render: (row) => <span className="text-ink-3">{formatRelative(row.source.foundAt)}</span>,
    },
    {
      key: 'status',
      header: 'Статус',
      width: 148,
      sortable: true,
      render: (row) => <StatusBadge domain="account" status={row.status} />,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Маркетплейс"
        subtitle="Сырой поток объявлений, собранных с источников"
        meta={
          <>
            <MetaItem
              label="В последнем сборе:"
              value={lastRun ? formatNumber(lastRun.seen) : '—'}
            />
            <MetaItem
              label="Новых:"
              value={lastRun ? formatNumber(lastRun.created) : '—'}
              tone="pos"
            />
            <MetaItem
              label="Прошло предфильтр:"
              value={lastRun ? formatNumber(lastRun.passed) : '—'}
            />
            <MetaItem
              label="Удалено:"
              value={lastRun ? formatNumber(lastRun.disappeared) : '—'}
            />
          </>
        }
      />

      <MarketplaceFilters
        filters={filters}
        onChange={patchFilters}
        onReset={() => {
          setFilters(EMPTY_FILTERS);
          setPage(1);
        }}
        resultCount={total}
        totalCount={lastRun?.seen ?? total}
      />

      {listings.error ? (
        <Panel>
          <EmptyState
            icon={AlertTriangle}
            title="Не удалось загрузить объявления"
            description={listings.error}
            action={
              <Button variant="default" onClick={listings.refetch}>
                Повторить
              </Button>
            }
          />
        </Panel>
      ) : (
        <Panel className="overflow-hidden">
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row.id}
            sort={sort}
            onSortToggle={toggleSort}
            onRowClick={(row) => setDrawerAccount(row)}
            selectedKey={drawerAccount?.id ?? null}
            loading={listings.loading}
            minWidth={1524}
            empty={
              <EmptyState
                icon={Store}
                title="Объявления не найдены"
                description="Измените параметры фильтра или дождитесь следующего сбора данных."
              />
            }
          />
          {!listings.loading && total > 0 ? (
            <Pagination
              page={page}
              pageCount={Math.max(1, Math.ceil(total / pageSize))}
              from={(page - 1) * pageSize + 1}
              to={Math.min(page * pageSize, total)}
              total={total}
              onPageChange={setPage}
              pageSize={pageSize}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          ) : null}
        </Panel>
      )}

      <p className="text-[11.5px] leading-relaxed text-ink-4">
        Данные собираются со страниц категорий источника. Эволюции, герои, гемы и условия
        передачи появятся в таблице после подключения AI-анализа — в атрибутах площадки их нет,
        они лежат в тексте заголовка.
      </p>

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
    </div>
  );
}
