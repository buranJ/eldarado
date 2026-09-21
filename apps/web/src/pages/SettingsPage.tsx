import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import type { BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Field';
import { MarketplaceBadge } from '@/components/MarketplaceBadge';
import { DataField } from '@/components/DataField';
import { GAMES } from '@/config/games';
import { MARKETPLACES } from '@/config/marketplaces';
import { SCAN_INTERVAL_HOURS, SUPPORTED_CURRENCIES } from '@/config/app';
import { useAppState } from '@/app/providers/app-state-context';
import type { CurrencyCode, MarketplaceConnection } from '@gamestock/domain';

const CONNECTION: Record<MarketplaceConnection, { label: string; tone: BadgeTone }> = {
  connected: { label: 'Подключено', tone: 'pos' },
  demo: { label: 'Demo', tone: 'warn' },
  not_connected: { label: 'Не подключено', tone: 'muted' },
};

const CURRENCY_LABELS: Record<CurrencyCode, string> = {
  USD: 'USD — доллар США',
  EUR: 'EUR — евро',
  RUB: 'RUB — российский рубль',
};

export function SettingsPage() {
  const { baseCurrency, setBaseCurrency } = useAppState();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Настройки"
        subtitle="Конфигурация игр, источников, площадок продажи и модели оценки"
      />

      <div className="grid grid-cols-2 gap-4 items-start">
        <div className="space-y-4">
          <Panel>
            <PanelHeader
              title="Игры"
              subtitle="Каждая игра имеет собственный рейтинг и модель оценки"
              action={
                <Button size="xs" icon={Plus} disabled title="Доступно в следующей версии">
                  Добавить игру
                </Button>
              }
            />
            <ul className="divide-y divide-line">
              {GAMES.map((game) => (
                <li key={game.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex size-7 items-center justify-center rounded-md border border-line-2 bg-panel-2 text-[10px] font-bold text-ink-2">
                    {game.monogram}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-medium text-ink">{game.name}</p>
                    <p className="text-[11.5px] text-ink-4">
                      {game.scoringModel
                        ? `Модель оценки: ${game.scoringModel.version}`
                        : 'Модель оценки не настроена'}
                    </p>
                  </div>
                  <Badge tone={game.status === 'active' ? 'pos' : 'muted'} dot>
                    {game.status === 'active' ? 'Активна' : 'Скоро'}
                  </Badge>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel>
            <PanelHeader title="Источники" subtitle="Площадки, с которых собираются объявления" />
            <ul className="divide-y divide-line">
              {MARKETPLACES.filter((m) => m.roles.includes('source')).map((marketplace) => (
                <li key={marketplace.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <MarketplaceBadge id={marketplace.id} />
                    <Badge tone={CONNECTION[marketplace.connection].tone} dot>
                      {CONNECTION[marketplace.connection].label}
                    </Badge>
                  </div>
                  <div className="mt-2">
                    <DataField label="Расписание сбора" value={`Каждые ${SCAN_INTERVAL_HOURS} часа`} />
                    <DataField label="Тип интеграции" value="Парсер (будет подключён)" />
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel>
            <PanelHeader title="Площадки продажи" subtitle="Куда публикуются подготовленные лоты" />
            <ul className="divide-y divide-line">
              {MARKETPLACES.filter((m) => m.roles.includes('destination')).map((marketplace) => (
                <li key={marketplace.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <MarketplaceBadge id={marketplace.id} />
                    <Badge tone={CONNECTION[marketplace.connection].tone} dot>
                      {CONNECTION[marketplace.connection].label}
                    </Badge>
                  </div>
                  <div className="mt-2">
                    <DataField
                      label="Комиссия площадки"
                      value={`${Math.round(marketplace.feeRate * 100)}%`}
                      mono
                    />
                    <DataField label="Тип интеграции" value="Seller API (будет подключён)" />
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel>
            <PanelHeader
              title="Валюты"
              subtitle="Базовая валюта используется для сводных показателей"
            />
            <div className="px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[12.5px] text-ink">Базовая валюта</p>
                  <p className="text-[11.5px] text-ink-4">
                    Цены источников конвертируются к базовой валюте
                  </p>
                </div>
                <Select
                  value={baseCurrency}
                  onChange={(event) => setBaseCurrency(event.target.value as CurrencyCode)}
                  className="w-[200px]"
                  options={SUPPORTED_CURRENCIES.map((currency) => ({
                    value: currency,
                    label: CURRENCY_LABELS[currency],
                  }))}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {SUPPORTED_CURRENCIES.map((currency) => (
                  <Badge key={currency} tone={currency === baseCurrency ? 'accent' : 'muted'}>
                    {currency}
                  </Badge>
                ))}
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="AI" subtitle="Модель нормализации и оценки аккаунтов" />
            <div className="px-4 py-3">
              <DataField label="Модель" value="Not configured" />
              <DataField label="Скоринг" value="Enabled mock" />
              <DataField label="Извлечение из текста" value="Будет подключено" />
              <DataField label="Анализ изображений" value="Будет подключено" />
              <DataField label="Сравнение с рынком" value="Mock" />
            </div>
            <div className="border-t border-line px-4 py-3">
              <p className="text-[11.5px] leading-relaxed text-ink-4">
                Значения Quality, Deal и Risk Score в текущей версии берутся из тестовых данных. При
                подключении модели структура ответа не изменится.
              </p>
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Доступ" subtitle="Внутренний инструмент без внешней авторизации" />
            <div className="px-4 py-3">
              <DataField label="Аутентификация" value="Не требуется" />
              <DataField label="Режим" value="Demo" />
              <DataField label="Роль" value="Оператор" />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
