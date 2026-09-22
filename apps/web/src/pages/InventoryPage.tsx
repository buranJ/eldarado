import { useMemo, useState } from 'react';
import { AlertTriangle, Boxes, ExternalLink, MoreHorizontal, Upload } from 'lucide-react';
import { PageHeader, MetaItem } from '@/components/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Button, IconButton } from '@/components/ui/Button';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { SearchInput, Select } from '@/components/ui/Field';
import { DataTable } from '@/components/DataTable';
import type { Column } from '@/components/DataTable';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/StatusBadge';
import { MarketplaceBadge } from '@/components/MarketplaceBadge';
import { ScoreBadge } from '@/components/ScoreBadge';
import { AccountCell } from '@/features/accounts/AccountCell';
import { PriceEditor } from '@/features/inventory/PriceEditor';
import { EldoradoPublishModal } from '@/features/inventory/EldoradoPublishModal';
import { focusPriceInput } from '@/features/inventory/price-input';
import { useAppState } from '@/app/providers/app-state-context';
import { useQuery } from '@/hooks/useQuery';
import { api } from '@/api/client';
import type { InventoryItemDto } from '@/api/client';
import { formatMoney, money } from '@/utils/money';
import { formatDateTime } from '@/utils/date';
import { formatNumber } from '@/utils/format';
import type { InventoryStatus } from '@gamestock/domain';

type StatusFilter = 'all' | InventoryStatus;

export function InventoryPage() {
  const state = useAppState();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [publishTarget, setPublishTarget] = useState<InventoryItemDto | null>(null);

  const inventory = useQuery(
    () => api.inventory(state.gameId, statusFilter === 'all' ? undefined : statusFilter),
    [state.gameId, statusFilter, state.dataVersion],
  );

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const items = inventory.data?.items ?? [];
    if (!query) return items;
    return items.filter((item) =>
      `${item.accountId} ${item.title}`.toLowerCase().includes(query),
    );
  }, [inventory.data, search]);

  const capital = inventory.data ? inventory.data.capitalMinor / 100 : 0;
  const revenue = inventory.data ? inventory.data.expectedRevenueMinor / 100 : 0;
  const currency = rows[0]?.purchase.price.currency ?? 'RUB';

  const columns: Column<InventoryItemDto>[] = [
    {
      key: 'account',
      header: 'Аккаунт',
      width: 296,
      stickyLeft: 0,
      stickyEdge: true,
      render: (row) => <AccountCell id={row.accountId} title={row.title} gameId={row.gameId} />,
    },
    {
      key: 'purchasePrice',
      header: 'Закупка',
      align: 'right',
      width: 98,
      title: 'Цена покупки',
      render: (row) => (
        <span className="num font-medium text-ink">{formatMoney(row.purchase.price)}</span>
      ),
    },
    {
      key: 'purchasedAt',
      header: 'Дата',
      width: 112,
      title: 'Дата покупки',
      render: (row) => (
        <span className="text-ink-3">{formatDateTime(row.purchase.purchasedAt)}</span>
      ),
    },
    {
      key: 'quality',
      header: 'Quality',
      align: 'right',
      width: 68,
      render: (row) =>
        row.scores ? <ScoreBadge score={row.scores.quality} kind="quality" /> : '—',
    },
    {
      key: 'deal',
      header: 'Deal',
      align: 'right',
      width: 84,
      render: (row) => (row.scores ? <ScoreBadge score={row.scores.deal} /> : '—'),
    },
    {
      key: 'recommended',
      header: 'Расчётная',
      align: 'right',
      width: 96,
      title: 'Базовая цена продажи: цена закупки × 2,5',
      render: (row) => (
        <span className="num text-[#93a8ff]">{formatMoney(row.resale.recommendedPrice)}</span>
      ),
    },
    {
      key: 'manual',
      header: 'Цена продажи',
      align: 'right',
      width: 138,
      title: 'Фактическая цена публикации на площадке',
      render: (row) => (
        <div onClick={(event) => event.stopPropagation()}>
          <PriceEditor
            inventoryItemId={row.id}
            recommended={row.resale.recommendedPrice}
            manual={row.resale.manualPrice}
            disabled={row.status === 'sold'}
            onCommit={(amount) => state.setManualPrice(row.id, amount)}
          />
        </div>
      ),
    },
    {
      key: 'profit',
      header: 'Прибыль',
      align: 'right',
      width: 108,
      title: 'Ожидаемая прибыль после комиссии площадки',
      render: (row) => (
        <span className={row.expectedProfit.amount >= 0 ? 'num text-pos' : 'num text-neg'}>
          {formatMoney(row.expectedProfit, { signed: true })}
        </span>
      ),
    },
    {
      key: 'destination',
      header: 'Площадка',
      width: 104,
      render: (row) => <MarketplaceBadge id={row.resale.marketplace} />,
    },
    {
      key: 'status',
      header: 'Статус',
      width: 152,
      render: (row) => <StatusBadge domain="inventory" status={row.status} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 74,
      render: (row) => (
        <div
          className="flex items-center justify-end gap-1"
          onClick={(event) => event.stopPropagation()}
        >
          <a
            href={row.url}
            target="_blank"
            rel="noreferrer noopener"
            title="Открыть лот на площадке-источнике"
            className="inline-flex size-6 items-center justify-center rounded-md border border-line bg-panel-2 text-ink-3 transition-colors hover:border-line-2 hover:text-ink"
          >
            <ExternalLink size={12} />
          </a>
          <DropdownMenu
            items={[
              {
                key: 'price',
                label: 'Изменить цену',
                disabled: row.status === 'sold',
                onSelect: () => focusPriceInput(row.id),
              },
              {
                key: 'publish',
                label: 'Опубликовать',
                icon: Upload,
                tone: 'success',
                separatorBefore: true,
                disabled: !['purchased', 'ready_to_list', 'preparing'].includes(row.status),
                onSelect: () => setPublishTarget(row),
              },
              {
                key: 'sold',
                label: 'Отметить проданным',
                separatorBefore: true,
                disabled: row.status === 'sold',
                onSelect: () => state.setInventoryStatus(row.id, 'sold'),
              },
            ]}
            trigger={({ toggle }) => (
              <IconButton icon={MoreHorizontal} size="xs" variant="subtle" onClick={toggle} />
            )}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Инвентарь"
        subtitle="Приобретённые аккаунты и их публикация для перепродажи"
        meta={
          <>
            <MetaItem label="Позиций:" value={formatNumber(inventory.data?.total ?? 0)} />
            <MetaItem label="Капитал в инвентаре:" value={formatMoney(money(capital, currency))} />
            <MetaItem
              label="Ожидаемая выручка:"
              value={formatMoney(money(revenue, currency))}
              tone="pos"
            />
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
                { value: 'purchased', label: 'Куплен' },
                { value: 'preparing', label: 'Подготовка' },
                { value: 'ready_to_list', label: 'Готов к публикации' },
                { value: 'listed', label: 'Опубликован' },
                { value: 'reserved', label: 'Зарезервирован' },
                { value: 'sold', label: 'Продан' },
              ]}
            />
            <SearchInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Поиск по инвентарю"
              className="w-[220px]"
            />
          </>
        }
      />

      {inventory.error ? (
        <Panel>
          <EmptyState
            icon={AlertTriangle}
            title="Не удалось загрузить инвентарь"
            description={inventory.error}
            action={
              <Button variant="default" onClick={inventory.refetch}>
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
            loading={inventory.loading}
            minWidth={1330}
            empty={
              <EmptyState
                icon={Boxes}
                title="Инвентарь пуст"
                description="Аккаунты попадают сюда сразу после одобрения или подтверждения покупки в разделе «Топ аккаунтов»."
              />
            }
          />
        </Panel>
      )}

      <p className="text-[11.5px] leading-relaxed text-ink-4">
        Оплата на площадке-источнике проводится вручную — система только фиксирует покупку.
        Расчётная цена без AI равна цене закупки × 2,5; фактическую цену можно изменить вручную.
      </p>

      {publishTarget ? (
        <EldoradoPublishModal
          item={publishTarget}
          onClose={() => setPublishTarget(null)}
          onPublished={() => state.notifyDataChanged()}
        />
      ) : null}
    </div>
  );
}
