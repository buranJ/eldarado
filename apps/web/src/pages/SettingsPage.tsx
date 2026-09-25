import { useEffect, useState } from 'react';
import { LogOut, Save, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FieldLabel, Select, TextInput } from '@/components/ui/Field';
import { MarketplaceBadge } from '@/components/MarketplaceBadge';
import { DataField } from '@/components/DataField';
import { GAMES } from '@/config/games';
import { MARKETPLACES } from '@/config/marketplaces';
import { SCAN_INTERVAL_HOURS, SUPPORTED_CURRENCIES } from '@/config/app';
import { useAppState } from '@/app/providers/app-state-context';
import { useAuth } from '@/app/providers/auth-context';
import { useToast } from '@/app/providers/toast-context';
import { api, type IntegrationStatus } from '@/api/client';
import type { CurrencyCode } from '@gamestock/domain';

const CURRENCY_LABELS: Record<CurrencyCode, string> = {
  USD: 'USD — доллар США',
  EUR: 'EUR — евро',
  RUB: 'RUB — российский рубль',
};

export function SettingsPage() {
  const { baseCurrency, setBaseCurrency } = useAppState();
  const { user, logout } = useAuth();
  const toast = useToast();
  const [integrations, setIntegrations] = useState<IntegrationStatus | null>(null);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  const refreshIntegrations = () =>
    api.integrations().then(setIntegrations).catch(() => setIntegrations(null));

  useEffect(() => {
    void refreshIntegrations();
  }, []);

  const saveEldorado = async () => {
    setSaving('eldorado');
    try {
      await api.saveEldoradoCredentials(clientId, clientSecret);
      setClientId('');
      setClientSecret('');
      await refreshIntegrations();
      toast.push({ title: 'Eldorado подключён', tone: 'success' });
    } catch (error) {
      toast.push({
        title: 'Не удалось сохранить ключи Eldorado',
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      });
    } finally {
      setSaving(null);
    }
  };

  const saveAnthropic = async () => {
    setSaving('anthropic');
    try {
      await api.saveAnthropicCredentials(anthropicKey);
      setAnthropicKey('');
      await refreshIntegrations();
      toast.push({ title: 'Ключ модели сохранён', tone: 'success' });
    } catch (error) {
      toast.push({
        title: 'Не удалось сохранить ключ модели',
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      });
    } finally {
      setSaving(null);
    }
  };

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
              title="Профиль"
              subtitle="Личные данные и активная сессия"
              action={
                <Button size="sm" icon={LogOut} onClick={() => void logout()}>
                  Выйти
                </Button>
              }
            />
            <div className="px-4 py-3">
              <DataField label="Имя" value={user.displayName} />
              <DataField label="Почта" value={user.email} />
              <DataField label="Сессия" value="Защищённая HttpOnly cookie · 30 дней" />
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Интеграции профиля"
              subtitle="Ключи зашифрованы на сервере и принадлежат только этому профилю"
            />
            <div className="space-y-5 px-4 py-4">
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[12.5px] font-medium text-ink">Eldorado Seller API</p>
                    <p className="text-[11.5px] text-ink-4">Client ID и Client Secret</p>
                  </div>
                  <Badge tone={integrations?.eldorado.configured ? 'pos' : 'muted'} dot>
                    {integrations?.eldorado.configured ? 'Подключено' : 'Не подключено'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1">
                    <FieldLabel>Client ID</FieldLabel>
                    <TextInput
                      value={clientId}
                      onChange={(event) => setClientId(event.target.value)}
                      placeholder={integrations?.eldorado.configured ? 'Введите для замены' : ''}
                      autoComplete="off"
                    />
                  </label>
                  <label className="space-y-1">
                    <FieldLabel>Client Secret</FieldLabel>
                    <TextInput
                      type="password"
                      value={clientSecret}
                      onChange={(event) => setClientSecret(event.target.value)}
                      placeholder={integrations?.eldorado.configured ? 'Введите для замены' : ''}
                      autoComplete="new-password"
                    />
                  </label>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="success"
                    icon={Save}
                    disabled={!clientId.trim() || !clientSecret.trim() || saving !== null}
                    onClick={() => void saveEldorado()}
                  >
                    Сохранить
                  </Button>
                  {integrations?.eldorado.configured ? (
                    <Button
                      size="sm"
                      variant="danger"
                      icon={Trash2}
                      disabled={saving !== null}
                      onClick={async () => {
                        setSaving('eldorado');
                        await api.removeEldoradoCredentials();
                        await refreshIntegrations();
                        setSaving(null);
                      }}
                    >
                      Отключить
                    </Button>
                  ) : null}
                </div>
              </section>

              <section className="space-y-3 border-t border-line pt-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[12.5px] font-medium text-ink">Модель оценки Anthropic</p>
                  </div>
                  <Badge tone={integrations?.anthropic.configured ? 'pos' : 'muted'} dot>
                    {integrations?.anthropic.configured ? 'Подключено' : 'Не подключено'}
                  </Badge>
                </div>
                <label className="block space-y-1">
                  <FieldLabel>API key</FieldLabel>
                  <TextInput
                    type="password"
                    value={anthropicKey}
                    onChange={(event) => setAnthropicKey(event.target.value)}
                    placeholder={integrations?.anthropic.configured ? 'Введите новый ключ для замены' : ''}
                    autoComplete="new-password"
                  />
                </label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="success"
                    icon={Save}
                    disabled={anthropicKey.trim().length < 20 || saving !== null}
                    onClick={() => void saveAnthropic()}
                  >
                    Сохранить
                  </Button>
                  {integrations?.anthropic.configured ? (
                    <Button
                      size="sm"
                      variant="danger"
                      icon={Trash2}
                      disabled={saving !== null}
                      onClick={async () => {
                        setSaving('anthropic');
                        await api.removeAnthropicCredentials();
                        await refreshIntegrations();
                        setSaving(null);
                      }}
                    >
                      Отключить
                    </Button>
                  ) : null}
                </div>
              </section>

              <section className="flex items-center justify-between gap-3 border-t border-line pt-4">
                <div>
                  <p className="text-[12.5px] font-medium text-ink">FunPay</p>
                  <p className="text-[11.5px] text-ink-4">Публичный сбор объявлений, ключ не требуется</p>
                </div>
                <Badge tone="pos" dot>Работает</Badge>
              </section>
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Игры"
              subtitle="Игры, доступные для сбора и управления объявлениями"
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
                      {game.collectionEnabled ? 'Сбор объявлений включён' : 'Управление объявлениями Eldorado'}
                    </p>
                  </div>
                  <Badge tone="pos" dot>Доступна</Badge>
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
                    <Badge tone="pos" dot>Подключено</Badge>
                  </div>
                  <div className="mt-2">
                    <DataField label="Расписание сбора" value={`Каждые ${SCAN_INTERVAL_HOURS} часа`} />
                    <DataField label="Тип интеграции" value="Публичный сбор объявлений" />
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
                    <Badge tone={integrations?.eldorado.configured ? 'pos' : 'muted'} dot>
                      {integrations?.eldorado.configured ? 'Подключено' : 'Не подключено'}
                    </Badge>
                  </div>
                  <div className="mt-2">
                    <DataField
                      label="Комиссия площадки"
                      value={`${Math.round(marketplace.feeRate * 100)}%`}
                      mono
                    />
                    <DataField label="Тип интеграции" value="Seller API" />
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

        </div>
      </div>
    </div>
  );
}
