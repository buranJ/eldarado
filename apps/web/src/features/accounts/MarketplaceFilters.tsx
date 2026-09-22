import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Checkbox, FilterField, SearchInput, Select, TextInput } from '@/components/ui/Field';
import { sourceMarketplaces } from '@/config/marketplaces';
import { isFiltersDirty } from './marketplace-filters';
import type { MarketplaceFilterState, PipelineFilter } from './marketplace-filters';

export function MarketplaceFilters({
  filters,
  onChange,
  onReset,
  resultCount,
  totalCount,
}: {
  filters: MarketplaceFilterState;
  onChange: (patch: Partial<MarketplaceFilterState>) => void;
  onReset: () => void;
  resultCount: number;
  totalCount: number;
}) {
  return (
    <div className="rounded-lg border border-line bg-panel">
      <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-2.5">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={13} className="text-ink-4" />
          <span className="text-[12px] font-medium text-ink-2">Фильтры</span>
          <span className="num text-[11.5px] text-ink-4">
            {resultCount} из {totalCount}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <SearchInput
            value={filters.search}
            onChange={(event) => onChange({ search: event.target.value })}
            placeholder="ID, название или продавец"
            className="w-[280px]"
          />
          <Button
            size="sm"
            variant="ghost"
            icon={RotateCcw}
            onClick={onReset}
            disabled={!isFiltersDirty(filters)}
          >
            Сбросить
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(160px,1fr)_minmax(240px,1.4fr)_minmax(180px,1fr)_minmax(180px,1fr)_auto] items-end gap-3 px-4 py-3">
        <FilterField label="Источник">
          <Select
            value={filters.marketplace}
            onChange={(event) => onChange({ marketplace: event.target.value })}
            options={[
              { value: 'all', label: 'Все источники' },
              ...sourceMarketplaces().map((m) => ({ value: m.id, label: m.name })),
            ]}
          />
        </FilterField>

        <FilterField label="Цена">
          <div className="flex items-center gap-1.5">
            <TextInput
              type="number"
              min={0}
              value={filters.priceMin}
              onChange={(event) => onChange({ priceMin: event.target.value })}
              placeholder="от"
            />
            <span className="text-ink-4">—</span>
            <TextInput
              type="number"
              min={0}
              value={filters.priceMax}
              onChange={(event) => onChange({ priceMax: event.target.value })}
              placeholder="до"
            />
          </div>
        </FilterField>

        <FilterField label="Продавец">
          <Select
            value={filters.sellerRatingMin}
            onChange={(event) => onChange({ sellerRatingMin: event.target.value })}
            options={[
              { value: 'all', label: 'Любой рейтинг' },
              { value: '4.8', label: '4,8 и выше' },
              { value: '4.5', label: '4,5 и выше' },
              { value: '4.0', label: '4,0 и выше' },
              { value: '3.0', label: '3,0 и выше' },
            ]}
          />
        </FilterField>

        <FilterField label="Результат проверки">
          <Select
            value={filters.pipeline}
            onChange={(event) => onChange({ pipeline: event.target.value as PipelineFilter })}
            options={[
              { value: 'all', label: 'Все объявления' },
              { value: 'ready_for_analysis', label: 'Подходят' },
              { value: 'prefiltered_out', label: 'Не подходят' },
            ]}
          />
        </FilterField>

        <div className="flex h-7 items-center whitespace-nowrap pb-px">
          <Checkbox
            label="Есть автовыдача"
            checked={filters.autoDeliveryOnly}
            onChange={(checked) => onChange({ autoDeliveryOnly: checked })}
          />
        </div>
      </div>
    </div>
  );
}
