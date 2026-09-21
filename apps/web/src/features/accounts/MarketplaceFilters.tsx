import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Checkbox, FilterField, SearchInput, Select, TextInput } from '@/components/ui/Field';
import { GAMES } from '@/config/games';
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
            placeholder="Поиск по ID, названию, продавцу"
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

      <div className="grid grid-cols-[repeat(6,minmax(0,1fr))] gap-x-3 gap-y-3 px-4 py-3">
        <FilterField label="Игра">
          <Select
            value={filters.gameId}
            onChange={(event) => onChange({ gameId: event.target.value })}
            options={[
              { value: 'all', label: 'Все игры' },
              ...GAMES.map((game) => ({
                value: game.id,
                label: game.name,
                disabled: game.status !== 'active',
              })),
            ]}
          />
        </FilterField>

        <FilterField label="Маркетплейс">
          <Select
            value={filters.marketplace}
            onChange={(event) => onChange({ marketplace: event.target.value })}
            options={[
              { value: 'all', label: 'Все источники' },
              ...sourceMarketplaces().map((m) => ({ value: m.id, label: m.name })),
            ]}
          />
        </FilterField>

        <FilterField label="Цена, $">
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

        <FilterField label="Трофеи от">
          <TextInput
            type="number"
            min={0}
            value={filters.trophiesMin}
            onChange={(event) => onChange({ trophiesMin: event.target.value })}
            placeholder="0"
          />
        </FilterField>

        <FilterField label="Уровень от">
          <TextInput
            type="number"
            min={0}
            value={filters.levelMin}
            title="Атрибут «уровень» со страницы источника"
            onChange={(event) => onChange({ levelMin: event.target.value })}
            placeholder="0"
          />
        </FilterField>

        <FilterField label="Карт от">
          <TextInput
            type="number"
            min={0}
            value={filters.cardsMin}
            onChange={(event) => onChange({ cardsMin: event.target.value })}
            placeholder="0"
          />
        </FilterField>

        <FilterField label="Эволюции от">
          <TextInput
            type="number"
            min={0}
            disabled
            value={filters.evolutionsMin}
            title="Появится после подключения AI-анализа — эволюций нет в атрибутах источника"
            onChange={(event) => onChange({ evolutionsMin: event.target.value })}
            placeholder="—"
          />
        </FilterField>

        <FilterField label="Герои от">
          <TextInput
            type="number"
            min={0}
            disabled
            value={filters.heroesMin}
            title="Появится после подключения AI-анализа — героев нет в атрибутах источника"
            onChange={(event) => onChange({ heroesMin: event.target.value })}
            placeholder="—"
          />
        </FilterField>

        <FilterField label="Рейтинг продавца">
          <Select
            value={filters.sellerRatingMin}
            onChange={(event) => onChange({ sellerRatingMin: event.target.value })}
            options={[
              { value: 'all', label: 'Любой' },
              { value: '4.8', label: 'от 4,8' },
              { value: '4.5', label: 'от 4,5' },
              { value: '4.0', label: 'от 4,0' },
              { value: '3.0', label: 'от 3,0' },
            ]}
          />
        </FilterField>

        <FilterField label="Этап пайплайна">
          <Select
            value={filters.pipeline}
            onChange={(event) => onChange({ pipeline: event.target.value as PipelineFilter })}
            options={[
              { value: 'all', label: 'Все' },
              { value: 'ready_for_analysis', label: 'Прошли предфильтр' },
              { value: 'prefiltered_out', label: 'Отсеяны фильтром' },
            ]}
          />
        </FilterField>

        <div className="col-span-3 flex items-end pb-1">
          <Checkbox
            label="Только с автовыдачей"
            checked={filters.autoDeliveryOnly}
            onChange={(checked) => onChange({ autoDeliveryOnly: checked })}
          />
        </div>
      </div>
    </div>
  );
}
