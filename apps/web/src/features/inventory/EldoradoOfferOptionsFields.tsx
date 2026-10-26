import type { EldoradoPublishPreview } from '@/api/client';
import { FieldLabel, Select, TextInput } from '@/components/ui/Field';
import type { EldoradoOfferSelection } from './eldorado-offer-selection';

const fieldName = (name: string): string => {
  switch (name) {
    case 'Region': return 'Регион';
    case 'Device': return 'Устройство';
    case 'Server': return 'Сервер';
    case 'Current Rank': return 'Текущий ранг';
    case 'Previous Rank': return 'Предыдущий ранг';
    case 'Ranked Ready': return 'Доступен рейтинг';
    case 'Champion Count': return 'Количество чемпионов';
    case 'Premium Status': return 'Премиум-статус';
    case 'Hours Played': return 'Часы в игре';
    case 'Skins': return 'Скины';
    case 'Steam Account Level': return 'Уровень Steam';
    case 'Town Hall': return 'Уровень ратуши';
    case 'Maxed Account': return 'Максимальная прокачка';
    case 'Riot Points': return 'Riot Points';
    case 'Blue Essence': return 'Синяя эссенция';
    case 'Gems': return 'Кристаллы';
    default: return name;
  }
};

export function EldoradoOfferOptionsFields({
  preview,
  selection,
  onChange,
  disabled = false,
}: {
  preview: EldoradoPublishPreview;
  selection: EldoradoOfferSelection;
  onChange: (selection: EldoradoOfferSelection) => void;
  disabled?: boolean;
}) {
  if (preview.tradeEnvironments.length === 0 && preview.requiredAttributes.length === 0 && preview.requiredNumericAttributes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-md border border-line bg-panel-2 p-3">
      <p className="text-[11px] text-ink-3">
        Параметры Eldorado — выберите реальные характеристики аккаунта.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {preview.tradeEnvironments.length > 0 ? (
          <label className="block space-y-1">
            <FieldLabel>{fieldName(preview.tradeEnvironments[0]?.name ?? 'Параметр игры')}</FieldLabel>
            <Select
              value={selection.tradeEnvironmentId}
              disabled={disabled}
              onChange={(event) => onChange({
                ...selection,
                tradeEnvironmentId: event.target.value,
              })}
              options={[
                { value: '', label: 'Выберите' },
                ...preview.tradeEnvironments.map((option) => ({
                  value: option.id,
                  label: option.value,
                })),
              ]}
            />
          </label>
        ) : null}
        {preview.requiredAttributes.map((attribute) => (
          <label key={attribute.id} className="block space-y-1">
            <FieldLabel>{fieldName(attribute.name)}</FieldLabel>
            <Select
              value={selection.offerAttributes[attribute.id] ?? ''}
              disabled={disabled}
              onChange={(event) => onChange({
                ...selection,
                offerAttributes: {
                  ...selection.offerAttributes,
                  [attribute.id]: event.target.value,
                },
              })}
              options={[
                { value: '', label: 'Выберите' },
                ...attribute.values.map((option) => ({
                  value: option.id,
                  label: option.name,
                })),
              ]}
            />
          </label>
        ))}
        {preview.requiredNumericAttributes.map((attribute) => (
          <label key={attribute.id} className="block space-y-1">
            <FieldLabel>{fieldName(attribute.name)} — число{attribute.units ? ` (${attribute.units})` : ''}</FieldLabel>
            <TextInput
              type="number"
              inputMode="decimal"
              min={attribute.minValue}
              max={attribute.maxValue}
              step={10 ** -attribute.precision}
              value={selection.numericAttributes[attribute.id] ?? ''}
              disabled={disabled}
              placeholder={`${attribute.minValue}–${attribute.maxValue}`}
              onChange={(event) => {
                const numericAttributes = { ...selection.numericAttributes };
                if (event.target.value === '') delete numericAttributes[attribute.id];
                else numericAttributes[attribute.id] = Number(event.target.value);
                onChange({ ...selection, numericAttributes });
              }}
            />
            {attribute.units === 'K' ? (
              <span className="block text-[10px] text-ink-4">Укажите значение в тысячах: 1 = 1 000</span>
            ) : null}
          </label>
        ))}
      </div>
    </div>
  );
}
