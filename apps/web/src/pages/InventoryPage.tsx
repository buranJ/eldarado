import { useMemo, useState } from 'react';
import { AlertTriangle, Boxes, ExternalLink, MoreHorizontal, Upload } from 'lucide-react';
import { PageHeader, MetaItem } from '@/components/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Tabs } from '@/components/ui/Tabs';
import type { TabItem } from '@/components/ui/Tabs';
import { Button, IconButton } from '@/components/ui/Button';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { SearchInput } from '@/components/ui/Field';
import { DataTable } from '@/components/DataTable';
import type { Column } from '@/components/DataTable';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/StatusBadge';
import { MarketplaceBadge } from '@/components/MarketplaceBadge';
import { ScoreBadge } from '@/components/ScoreBadge';
import { AccountCell } from '@/features/accounts/AccountCell';
import { PriceEditor } from '@/features/inventory/PriceEditor';
import { EldoradoPublishModal } from '@/features/inventory/EldoradoPublishModal';
import { EldoradoBulkPublishModal } from '@/features/inventory/EldoradoBulkPublishModal';
import { focusPriceInput } from '@/features/inventory/price-input';
import { useAppState } from '@/app/providers/app-state-context';
import { useQuery } from '@/hooks/useQuery';
import { api } from '@/api/client';
import type { InventoryItemDto } from '@/api/client';
import { formatMoney, money } from '@/utils/money';
import { formatDateTime } from '@/utils/date';
import { formatNumber } from '@/utils/format';
type InventoryTab = 'new' | 'published' | 'sold';

const canPublish = (item: InventoryItemDto): boolean =>
  ['purchased', 'ready_to_list', 'preparing'].includes(item.status);

export function InventoryPage() {
  const state = useAppState();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<InventoryTab>('new');
  const [publishTarget, setPublishTarget] = useState<InventoryItemDto | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkItems, setBulkItems] = useState<InventoryItemDto[] | null>(null);

  const inventory = useQuery(
    () => api.inventory(state.gameId),
    [state.gameId, state.dataVersion],
  );

  const allItems = useMemo(() => inventory.data?.items ?? [], [inventory.data]);
  const counts = useMemo(
    () => ({
      new: allItems.filter((item) => canPublish(item) || item.status === 'reserved').length,
      published: allItems.filter((item) => item.status === 'listed').length,
      sold: allItems.filter((item) => item.status === 'sold').length,
    }),
    [allItems],
  );
  const tabs: TabItem<InventoryTab>[] = [
    { value: 'new', label: 'Новые', count: counts.new },
    { value: 'published', label: 'Опубликованные', count: counts.published },
    { value: 'sold', label: 'Проданные', count: counts.sold },
  ];

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allItems.filter((item) => {
      const inTab =
        tab === 'new'
          ? canPublish(item) || item.status === 'reserved'
          : tab === 'published'
            ? item.status === 'listed'
            : item.status === 'sold';
      if (!inTab) return false;
      if (!query) return true;
      return `${item.accountId} ${item.title}`.toLowerCase().includes(query);
    });
  }, [allItems, search, tab]);

  const capital = inventory.data ? inventory.data.capitalMinor / 100 : 0;
  const revenue = inventory.data ? inventory.data.expectedRevenueMinor / 100 : 0;
  const currency = rows[0]?.purchase.price.currency ?? 'RUB';
  const selectableIds = rows.filter(canPublish).map((item) => item.id);
  const selectedItems = rows.filter((item) => selectedIds.has(item.id) && canPublish(item));
  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allSelected) selectableIds.forEach((id) => next.delete(id));
      else selectableIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const columns: Column<InventoryItemDto>[] = [
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          checked={allSelected}
          aria-label="Выбрать все готовые аккаунты"
          onClick={(event) => event.stopPropagation()}
          onChange={toggleAll}
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
          disabled={!canPublish(row)}
          aria-label={`Выбрать аккаунт ${row.accountId}`}
          onClick={(event) => event.stopPropagation()}
          onChange={() => toggleSelected(row.id)}
          className="size-3.5 cursor-pointer accent-[#6e8bff] disabled:cursor-not-allowed disabled:opacity-30"
        />
      ),
    },
    {
      key: 'account',
      header: 'Аккаунт',
      width: 296,
      stickyLeft: 42,
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
                disabled: !canPublish(row),
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
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по инвентарю"
            className="w-[260px]"
          />
        }
      />

      {selectedItems.length > 0 ? (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-line-2 bg-panel px-4 py-2.5">
          <span className="text-[12.5px] text-ink-2">
            Выбрано для публикации:{' '}
            <span className="num font-semibold text-ink">{selectedItems.length}</span>
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="md"
              variant="success"
              icon={Upload}
              onClick={() => setBulkItems(selectedItems)}
            >
              Опубликовать на Eldorado
            </Button>
            <Button size="md" variant="ghost" onClick={() => setSelectedIds(new Set())}>
              Снять выбор
            </Button>
          </div>
        </div>
      ) : null}

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
          <Tabs
            items={tabs}
            value={tab}
            onChange={(value) => {
              setTab(value);
              setSelectedIds(new Set());
            }}
          />
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row.id}
            loading={inventory.loading}
            minWidth={1372}
            empty={
              <EmptyState
                icon={Boxes}
                title={
                  tab === 'new'
                    ? 'Новых аккаунтов нет'
                    : tab === 'published'
                      ? 'Опубликованных аккаунтов нет'
                      : 'Проданных аккаунтов нет'
                }
                description={
                  tab === 'new'
                    ? 'Новые аккаунты появятся здесь после одобрения в разделе «Топ аккаунтов».'
                    : tab === 'published'
                      ? 'После публикации на Eldorado аккаунты появятся в этой вкладке.'
                      : 'Здесь появятся завершённые продажи.'
                }
              />
            }
          />
        </Panel>
      )}

      <p className="text-[11.5px] leading-relaxed text-ink-4">
        Оплата на площадке-источнике проводится вручную — система только фиксирует покупку.
        Расчётная цена равна цене закупки × 2,5; фактическую цену можно изменить вручную.
      </p>

      {publishTarget ? (
        <EldoradoPublishModal
          item={publishTarget}
          onClose={() => setPublishTarget(null)}
          onPublished={() => state.notifyDataChanged()}
        />
      ) : null}

      {bulkItems ? (
        <EldoradoBulkPublishModal
          items={bulkItems}
          onClose={() => setBulkItems(null)}
          onFinished={() => {
            setSelectedIds(new Set());
            state.notifyDataChanged();
          }}
        />
      ) : null}
    </div>
  );
}
