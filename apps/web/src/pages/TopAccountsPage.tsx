import { useMemo, useState } from 'react';
import { Check, Eye, ShoppingCart, Trophy, X, Zap } from 'lucide-react';
import { PageHeader, MetaItem } from '@/components/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Button, IconButton } from '@/components/ui/Button';
import { SearchInput, Select } from '@/components/ui/Field';
import { DataTable } from '@/components/DataTable';
import type { Column } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/StatusBadge';
import { MarketplaceBadge } from '@/components/MarketplaceBadge';
import { AccountDrawer } from '@/features/accounts/AccountDrawer';
import { PurchaseModal } from '@/features/accounts/PurchaseModal';
import { useAppState } from '@/app/providers/app-state-context';
import { useQuery } from '@/hooks/useQuery';
import { api } from '@/api/client';
import { useTableSort } from '@/hooks/useTableSort';
import type { SortAccessor } from '@/hooks/useTableSort';
import { usePagination } from '@/hooks/usePagination';
import { getGame } from '@/config/games';
import { formatMoney } from '@/utils/money';
import { formatNumber, formatRating } from '@/utils/format';
import { formatRelative } from '@/utils/date';
import type { AccountStatus, GameAccount } from '@gamestock/domain';
import { cn } from '@/utils/cn';

type StatusFilter = 'all' | AccountStatus;

const SORT_ACCESSORS: Record<string, SortAccessor<GameAccount>> = {
  account: (row) => Number(row.source.listingId),
  title: (row) => row.source.title,
  source: (row) => row.source.marketplace,
  price: (row) => row.source.price.amount,
  seller: (row) => row.source.seller.rating,
  foundAt: (row) => row.source.foundAt,
  status: (row) => row.status,
};

export function TopAccountsPage() {
  const state = useAppState();
  const qualified = useQuery(() => api.qualified(state.gameId), [
    state.gameId,
    state.dataVersion,
  ]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [pageSize, setPageSize] = useState(25);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [drawerAccount, setDrawerAccount] = useState<GameAccount | null>(null);
  const [purchaseAccount, setPurchaseAccount] = useState<GameAccount | null>(null);

  const accounts = useMemo(() => qualified.data?.items ?? [], [qualified.data]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return accounts.filter((account) => {
      if (statusFilter !== 'all' && account.status !== statusFilter) return false;
      if (!query) return true;
      return `${account.source.listingId} ${account.source.title} ${account.source.seller.name}`
        .toLowerCase()
        .includes(query);
    });
  }, [accounts, search, statusFilter]);

  const { sort, toggle, sorted } = useTableSort(filtered, SORT_ACCESSORS, {
    key: 'foundAt',
    direction: 'desc',
  });
  const pagination = usePagination(sorted, pageSize);
  const selectablePageIds = pagination.pageRows
    .filter((account) => account.status !== 'purchased')
    .map((account) => account.id);
  const allPageSelected =
    selectablePageIds.length > 0 && selectablePageIds.every((id) => selectedIds.has(id));

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelected = (id: string) => {
    setSelectedIds((current) => {
      if (!current.has(id)) return current;
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  };

  const togglePage = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allPageSelected) selectablePageIds.forEach((id) => next.delete(id));
      else selectablePageIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const runBulkDecision = async (action: 'approve' | 'reject') => {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    const ids = [...selectedIds];
    const succeeded =
      action === 'approve'
        ? await state.bulkApproveAccounts(ids)
        : await state.bulkRejectAccounts(ids);
    if (succeeded) setSelectedIds(new Set());
    setBulkBusy(false);
  };

  const columns: Column<GameAccount>[] = [
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          checked={allPageSelected}
          aria-label="Выбрать все аккаунты на странице"
          onClick={(event) => event.stopPropagation()}
          onChange={togglePage}
          className="size-3.5 cursor-pointer accent-[#6e8bff]"
        />
      ),
      width: 42,
      align: 'center',
      stickyLeft: 0,
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.id)}
          disabled={row.status === 'purchased'}
          aria-label={`Выбрать аккаунт ${row.source.listingId}`}
          onClick={(event) => event.stopPropagation()}
          onChange={() => toggleSelected(row.id)}
          className="size-3.5 cursor-pointer accent-[#6e8bff] disabled:cursor-not-allowed disabled:opacity-30"
        />
      ),
    },
    {
      key: 'account',
      header: 'Аккаунт',
      width: 120,
      sortable: true,
      stickyLeft: 42,
      stickyEdge: true,
      render: (row) => (
        <div className="min-w-0">
          <div className="num text-[12px] font-medium text-ink">{row.source.listingId}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-ink-4">
            <span className="flex size-3.5 items-center justify-center rounded-sm border border-line-2 bg-panel-2 text-[7px] font-bold text-ink-3">
              {getGame(row.gameId).monogram}
            </span>
            {getGame(row.gameId).name}
          </div>
        </div>
      ),
    },
    {
      key: 'title',
      header: 'Объявление',
      width: 190,
      sortable: true,
      render: (row) => (
        <span className="block max-w-[166px] truncate text-[12px] text-ink" title={row.source.title}>
          {row.source.title}
        </span>
      ),
    },
    {
      key: 'source',
      header: 'Источник',
      width: 88,
      sortable: true,
      render: (row) => <MarketplaceBadge id={row.source.marketplace} />,
    },
    {
      key: 'price',
      header: 'Цена',
      align: 'right',
      width: 82,
      sortable: true,
      render: (row) => (
        <span className="num font-medium text-ink">{formatMoney(row.source.price)}</span>
      ),
    },
    {
      key: 'seller',
      header: 'Продавец',
      width: 145,
      sortable: true,
      render: (row) => (
        <div className="min-w-0">
          <div className="truncate text-[12px] text-ink-2">{row.source.seller.name}</div>
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                'num text-[11px]',
                (row.source.seller.rating ?? 0) >= 4.8 ? 'text-pos' : 'text-ink-3',
              )}
            >
              {formatRating(row.source.seller.rating)}
            </span>
            <span className="num text-[10.5px] text-ink-4">
              {formatNumber(row.source.seller.reviewsCount)} отзывов
            </span>
            {row.source.seller.isNew ? <Badge tone="warn">новый</Badge> : null}
          </div>
        </div>
      ),
    },
    {
      key: 'auto',
      header: 'Авто',
      title: 'Автоматическая выдача',
      align: 'center',
      width: 76,
      render: (row) =>
        row.source.autoDelivery ? (
          <Zap size={13} className="mx-auto text-pos" strokeWidth={2.2} />
        ) : (
          <span className="text-ink-4">—</span>
        ),
    },
    {
      key: 'foundAt',
      header: 'Найден',
      width: 84,
      sortable: true,
      render: (row) => <span className="text-ink-3">{formatRelative(row.source.foundAt)}</span>,
    },
    {
      key: 'status',
      header: 'Статус',
      width: 128,
      sortable: true,
      render: (row) => <StatusBadge domain="account" status={row.status} />,
    },
    {
      key: 'actions',
      header: '',
      width: 148,
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1" onClick={(event) => event.stopPropagation()}>
          <IconButton
            icon={Eye}
            size="sm"
            variant="subtle"
            title="Подробнее"
            aria-label="Подробнее"
            onClick={() => setDrawerAccount(row)}
          />
          <IconButton
            icon={Check}
            size="sm"
            variant="success"
            title="Одобрить и добавить в инвентарь"
            aria-label="Одобрить и добавить в инвентарь"
            disabled={row.status === 'purchased'}
            onClick={() => {
              clearSelected(row.id);
              state.approveAccount(row.id);
            }}
          />
          <IconButton
            icon={X}
            size="sm"
            variant="danger"
            title="Отклонить"
            aria-label="Отклонить"
            disabled={row.status === 'rejected' || row.status === 'purchased'}
            onClick={() => {
              clearSelected(row.id);
              state.rejectAccount(row.id);
            }}
          />
          <IconButton
            icon={ShoppingCart}
            size="sm"
            variant="default"
            title="Купить"
            aria-label="Купить"
            disabled={row.status === 'purchased'}
            onClick={() => setPurchaseAccount(row)}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Топ аккаунтов"
        subtitle="Все аккаунты, прошедшие первичную проверку и фильтрацию"
        meta={
          <>
            <MetaItem label="Прошли проверку:" value={formatNumber(qualified.data?.total ?? 0)} tone="pos" />
            <MetaItem label="Режим:" value="Без AI-анализа" />
            <MetaItem label="Порядок:" value="Сначала новые" />
          </>
        }
        actions={
          <>
            <Select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="w-[190px]"
              options={[
                { value: 'all', label: 'Все статусы' },
                { value: 'ready_for_analysis', label: 'Прошли проверку' },
                { value: 'approved', label: 'Одобренные' },
                { value: 'rejected', label: 'Отклонённые' },
                { value: 'purchased', label: 'Купленные' },
              ]}
            />
            <SearchInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ID, объявление или продавец"
              className="w-[250px]"
            />
          </>
        }
      />

      {selectedIds.size > 0 ? (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-line-2 bg-panel px-4 py-2.5">
          <span className="text-[12.5px] text-ink-2">
            Выбрано: <span className="num font-semibold text-ink">{selectedIds.size}</span>
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="success"
              icon={Check}
              disabled={bulkBusy}
              onClick={() => void runBulkDecision('approve')}
            >
              Одобрить и добавить в инвентарь
            </Button>
            <Button
              size="sm"
              variant="danger"
              icon={X}
              disabled={bulkBusy}
              onClick={() => void runBulkDecision('reject')}
            >
              Отклонить
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={bulkBusy}
              onClick={() => setSelectedIds(new Set())}
            >
              Снять выбор
            </Button>
          </div>
        </div>
      ) : null}

      <Panel className="overflow-hidden">
        <DataTable
          columns={columns}
          rows={pagination.pageRows}
          rowKey={(row) => row.id}
          sort={sort}
          onSortToggle={toggle}
          onRowClick={(row) => setDrawerAccount(row)}
          selectedKey={drawerAccount?.id ?? null}
          loading={qualified.loading}
          minWidth={1102}
          empty={
            <EmptyState
              icon={Trophy}
              title="Подходящих аккаунтов пока нет"
              description="Запустите сбор данных — здесь появятся аккаунты, прошедшие первичную проверку."
            />
          }
        />
        {!qualified.loading && pagination.total > 0 ? (
          <Pagination
            page={pagination.page}
            pageCount={pagination.pageCount}
            from={pagination.from}
            to={pagination.to}
            total={pagination.total}
            onPageChange={pagination.setPage}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            pageSizes={[25, 50, 100]}
          />
        ) : null}
      </Panel>

      <p className="text-[11.5px] leading-relaxed text-ink-4">
        Сейчас список формируется только по результатам первичной проверки. AI-оценки, прогноз
        маржи и ранжирование по выгодности не используются.
      </p>

      <AccountDrawer
        account={drawerAccount}
        open={drawerAccount !== null}
        onClose={() => setDrawerAccount(null)}
        onApprove={(id) => {
          clearSelected(id);
          state.approveAccount(id);
          setDrawerAccount(null);
        }}
        onReject={(id) => {
          clearSelected(id);
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
        onConfirm={(id) => {
          clearSelected(id);
          state.purchaseAccount(id);
        }}
      />
    </div>
  );
}
