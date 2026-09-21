import { useMemo, useState } from 'react';
import {
  Check,
  Eye,
  MoreHorizontal,
  ShoppingCart,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import { PageHeader, MetaItem } from '@/components/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { IconButton } from '@/components/ui/Button';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { SearchInput, Select } from '@/components/ui/Field';
import { DataTable } from '@/components/DataTable';
import type { Column } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { EmptyState } from '@/components/EmptyState';
import { ScoreBadge } from '@/components/ScoreBadge';
import { RiskBadge } from '@/components/RiskBadge';
import { StatusBadge } from '@/components/StatusBadge';
import { AccountDrawer } from '@/features/accounts/AccountDrawer';
import { PurchaseModal } from '@/features/accounts/PurchaseModal';
import { useAppState } from '@/app/providers/app-state-context';
import { useQuery } from '@/hooks/useQuery';
import { api } from '@/api/client';
import { useTableSort } from '@/hooks/useTableSort';
import type { SortAccessor } from '@/hooks/useTableSort';
import { usePagination } from '@/hooks/usePagination';
import { TOP_ACCOUNTS_LIMIT } from '@/config/app';
import { getGame } from '@/config/games';
import { formatMoney } from '@/utils/money';
import { formatCompact, formatNumber, formatPercent } from '@/utils/format';
import { formatDateTime } from '@/utils/date';
import type { AccountStatus, GameAccount } from '@gamestock/domain';

type StatusFilter = 'all' | AccountStatus;

const SORT_ACCESSORS: Record<string, SortAccessor<GameAccount>> = {
  rank: () => 0,
  account: (row) => row.id,
  trophies: (row) => row.gameData.trophies,
  collection: (row) => row.gameData.collectionLevel,
  evo: (row) => row.gameData.evolutions,
  heroes: (row) => row.gameData.heroes,
  lv16: (row) => row.gameData.level16Cards,
  lv15: (row) => row.gameData.level15Cards,
  gems: (row) => row.gameData.gems,
  price: (row) => row.source.price.amount,
  marketValue: (row) => row.analysis?.estimatedMarketValue.amount ?? null,
  recommended: (row) => row.analysis?.recommendedResalePrice.amount ?? null,
  margin: (row) => row.analysis?.estimatedMarginPercent ?? null,
  quality: (row) => row.analysis?.qualityScore ?? null,
  deal: (row) => row.analysis?.dealScore ?? null,
  risk: (row) => row.analysis?.riskScore ?? null,
  status: (row) => row.status,
};

export function TopAccountsPage() {
  const state = useAppState();

  const top = useQuery(() => api.top(state.gameId, TOP_ACCOUNTS_LIMIT), [
    state.gameId,
    state.dataVersion,
  ]);
  const analysis = useQuery(() => api.analysisStatus(), [state.dataVersion, top.data]);
  const loading = top.loading;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [pageSize, setPageSize] = useState(25);
  const [drawerAccount, setDrawerAccount] = useState<GameAccount | null>(null);
  const [purchaseAccount, setPurchaseAccount] = useState<GameAccount | null>(null);

  const ranked = useMemo(() => top.data?.items ?? [], [top.data]);
  const rankById = useMemo(
    () => new Map(ranked.map((account, index) => [account.id, index + 1])),
    [ranked],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return ranked.filter((account) => {
      if (statusFilter !== 'all' && account.status !== statusFilter) return false;
      if (!query) return true;
      return `${account.id} ${account.source.title} ${account.source.seller.name}`
        .toLowerCase()
        .includes(query);
    });
  }, [ranked, search, statusFilter]);

  const { sort, toggle, sorted } = useTableSort(filtered, SORT_ACCESSORS, {
    key: 'deal',
    direction: 'desc',
  });
  const pagination = usePagination(sorted, pageSize);

  const analyzedAt = useMemo(() => {
    const timestamps = ranked
      .map((account) => account.analysis?.analyzedAt)
      .filter((value): value is string => Boolean(value))
      .sort();
    return timestamps.at(-1) ?? null;
  }, [ranked]);

  const columns: Column<GameAccount>[] = [
    {
      key: 'rank',
      header: '#',
      width: 42,
      stickyLeft: 0,
      render: (row) => {
        const rank = rankById.get(row.id) ?? 0;
        return (
          <span
            className={
              rank <= 3
                ? 'num text-[12.5px] font-semibold text-[#93a8ff]'
                : 'num text-[12px] text-ink-3'
            }
          >
            {rank}
          </span>
        );
      },
    },
    {
      key: 'account',
      header: 'Аккаунт',
      width: 202,
      sortable: true,
      stickyLeft: 48,
      stickyEdge: true,
      render: (row) => (
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="num text-[12px] font-medium text-ink">
              {row.source.listingId}
            </span>
            {row.tags.slice(0, 1).map((tag) => (
              <Badge key={tag} tone="muted">
                {tag}
              </Badge>
            ))}
          </div>
          <div className="truncate text-[11px] text-ink-4" title={row.source.title}>
            {row.source.seller.name} · {getGame(row.gameId).name}
          </div>
        </div>
      ),
    },
    {
      key: 'trophies',
      header: 'Трофеи',
      title: 'Текущие трофеи',
      align: 'right',
      width: 74,
      sortable: true,
      render: (row) => <span className="num">{formatNumber(row.gameData.trophies)}</span>,
    },
    {
      key: 'collection',
      header: 'Колл.',
      align: 'right',
      width: 64,
      sortable: true,
      title: 'Уровень коллекции',
      render: (row) => <span className="num">{formatNumber(row.gameData.collectionLevel)}</span>,
    },
    {
      key: 'evo',
      header: 'EVO',
      align: 'right',
      width: 52,
      sortable: true,
      title: 'Эволюции',
      render: (row) => <span className="num">{formatNumber(row.gameData.evolutions)}</span>,
    },
    {
      key: 'heroes',
      header: 'Герои',
      title: 'Открытые герои',
      align: 'right',
      width: 60,
      sortable: true,
      render: (row) => <span className="num">{formatNumber(row.gameData.heroes)}</span>,
    },
    {
      key: 'lv16',
      header: 'Lv16',
      align: 'right',
      width: 52,
      sortable: true,
      title: 'Карты 16 уровня',
      render: (row) => <span className="num">{formatNumber(row.gameData.level16Cards)}</span>,
    },
    {
      key: 'lv15',
      header: 'Lv15',
      align: 'right',
      width: 52,
      sortable: true,
      title: 'Карты 15 уровня',
      render: (row) => <span className="num">{formatNumber(row.gameData.level15Cards)}</span>,
    },
    {
      key: 'gems',
      header: 'Гемы',
      align: 'right',
      width: 64,
      sortable: true,
      title: 'Кристаллы',
      render: (row) => (
        <span className="num text-ink-3">{formatCompact(row.gameData.gems)}</span>
      ),
    },
    {
      key: 'price',
      header: 'Цена',
      title: 'Цена покупки на источнике',
      align: 'right',
      width: 80,
      sortable: true,
      render: (row) => (
        <span className="num font-medium text-ink">{formatMoney(row.source.price)}</span>
      ),
    },
    {
      key: 'marketValue',
      header: 'Оценка',
      title: 'Рыночная оценка',
      align: 'right',
      width: 86,
      sortable: true,
      render: (row) => (
        <span className="num text-ink-2">{formatMoney(row.analysis?.estimatedMarketValue)}</span>
      ),
    },
    {
      key: 'recommended',
      header: 'Реком.',
      title: 'Рекомендуемая цена перепродажи',
      align: 'right',
      width: 88,
      sortable: true,
      render: (row) => (
        <span className="num font-medium text-[#93a8ff]">
          {formatMoney(row.analysis?.recommendedResalePrice)}
        </span>
      ),
    },
    {
      key: 'margin',
      header: 'Маржа',
      title: 'Ожидаемая маржа к цене покупки',
      align: 'right',
      width: 70,
      sortable: true,
      render: (row) => {
        const margin = row.analysis?.estimatedMarginPercent ?? 0;
        return (
          <span className={margin >= 60 ? 'num text-pos' : margin >= 25 ? 'num text-ink' : 'num text-warn'}>
            {formatPercent(row.analysis?.estimatedMarginPercent, { signed: true })}
          </span>
        );
      },
    },
    {
      key: 'quality',
      header: 'Quality',
      align: 'right',
      width: 66,
      sortable: true,
      title: 'Account Quality Score',
      render: (row) =>
        row.analysis ? <ScoreBadge score={row.analysis.qualityScore} kind="quality" /> : '—',
    },
    {
      key: 'deal',
      header: 'Deal',
      title: 'Deal Score — выгодность сделки',
      align: 'right',
      width: 80,
      sortable: true,
      headerClassName: 'text-ink-2',
      render: (row) => (row.analysis ? <ScoreBadge score={row.analysis.dealScore} /> : '—'),
    },
    {
      key: 'risk',
      header: 'Risk',
      title: 'Risk Score',
      width: 98,
      sortable: true,
      render: (row) => (row.analysis ? <RiskBadge score={row.analysis.riskScore} /> : '—'),
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
      width: 74,
      align: 'right',
      render: (row) => (
        <div
          className="flex items-center justify-end gap-1"
          onClick={(event) => event.stopPropagation()}
        >
          <IconButton
            icon={Eye}
            size="xs"
            variant="subtle"
            title="Подробнее"
            aria-label="Подробнее"
            onClick={() => setDrawerAccount(row)}
          />
          <DropdownMenu
            items={[
              {
                key: 'details',
                label: 'Подробнее',
                icon: Eye,
                onSelect: () => setDrawerAccount(row),
              },
              {
                key: 'approve',
                label: 'Одобрить',
                icon: Check,
                tone: 'success',
                separatorBefore: true,
                disabled: row.status === 'approved' || row.status === 'purchased',
                onSelect: () => state.approveAccount(row.id),
              },
              {
                key: 'reject',
                label: 'Отклонить',
                icon: X,
                tone: 'danger',
                disabled: row.status === 'rejected' || row.status === 'purchased',
                onSelect: () => state.rejectAccount(row.id),
              },
              {
                key: 'buy',
                label: 'Купить',
                icon: ShoppingCart,
                separatorBefore: true,
                disabled: row.status === 'purchased',
                onSelect: () => setPurchaseAccount(row),
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
        title="Топ аккаунтов"
        subtitle={`${TOP_ACCOUNTS_LIMIT} наиболее выгодных аккаунтов по соотношению цены и качества`}
        meta={
          <>
            <span className="inline-flex items-center gap-1.5">
              <Sparkles
                size={12}
                className={analysis.data?.pending ? 'text-warn' : 'text-pos'}
              />
              <span
                className={`text-[12px] ${analysis.data?.pending ? 'text-warn' : 'text-pos'}`}
              >
                {!analysis.data?.configured
                  ? 'AI-анализ не подключён'
                  : analysis.data.pending
                    ? `Ждут анализа: ${formatNumber(analysis.data.pending)}`
                    : 'AI-анализ завершён'}
              </span>
            </span>
            <MetaItem label="Последнее обновление:" value={formatDateTime(analyzedAt)} />
            <MetaItem
              label="Проанализировано:"
              value={formatNumber(analysis.data?.analysed ?? 0)}
            />
            <MetaItem label="В рейтинге:" value={`${ranked.length} из ${TOP_ACCOUNTS_LIMIT}`} />
          </>
        }
        actions={
          <>
            <Select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="w-[176px]"
              options={[
                { value: 'all', label: 'Все статусы' },
                { value: 'analyzed', label: 'Проанализированные' },
                { value: 'approved', label: 'Одобренные' },
                { value: 'rejected', label: 'Отклонённые' },
                { value: 'purchased', label: 'Купленные' },
              ]}
            />
            <SearchInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Поиск по аккаунту"
              className="w-[220px]"
            />
          </>
        }
      />

      <Panel className="overflow-hidden">
        <DataTable
          columns={columns}
          rows={pagination.pageRows}
          rowKey={(row) => row.id}
          sort={sort}
          onSortToggle={toggle}
          onRowClick={(row) => setDrawerAccount(row)}
          selectedKey={drawerAccount?.id ?? null}
          loading={loading}
          minWidth={1432}
          empty={
            <EmptyState
              icon={Trophy}
              title="Рейтинг пока пуст"
              description={
                analysis.data?.configured === false
                  ? 'AI-анализ не подключён: добавьте ANTHROPIC_API_KEY в apps/api/.env и запустите npm run analyze.'
                  : 'Ни один аккаунт ещё не проанализирован. Запустите npm run analyze.'
              }
            />
          }
        />
        {!loading && pagination.total > 0 ? (
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
        Рейтинг строится по Deal Score: высокий Quality Score сам по себе не гарантирует место в
        топе — учитываются цена, рыночная оценка, ожидаемая маржа и риск сделки.
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
