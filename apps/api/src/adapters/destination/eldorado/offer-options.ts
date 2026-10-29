import { EldoradoApiError } from './client.js';

const API_ORIGIN = 'https://www.eldorado.gg';
const CACHE_TTL_MS = 15 * 60 * 1_000;

export interface AccountOfferOptions {
  requiredAttributes: Array<{
    id: string;
    name: string;
    values: Array<{ id: string; name: string }>;
  }>;
  requiredNumericAttributes: Array<{
    id: string;
    name: string;
    minValue: number;
    maxValue: number;
    precision: number;
    units: string | null;
  }>;
  tradeEnvironments: Array<{ id: string; name: string; value: string }>;
}

export interface AccountOfferSelection {
  tradeEnvironmentId?: string | null;
  offerAttributes?: Record<string, string>;
  numericAttributes?: Record<string, number>;
}

/** Only infer a destination region/device when FunPay gives an explicit value. */
export const inferTradeEnvironmentId = (
  options: AccountOfferOptions,
  gameData: unknown,
): string | null => {
  if (!isRecord(gameData)) return null;
  const sources = [gameData.region, gameData.platform]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
  if (sources.length === 0) return null;
  const normalize = (value: string): string => value.trim().toLowerCase().replace(/[^a-zа-яё]/giu, '');
  const aliases: Record<string, string> = {
    europe: 'eu', европа: 'eu', eu: 'eu',
    america: 'na', americas: 'na', севернаяамерика: 'na', na: 'na', us: 'na',
    asia: 'asia', азия: 'asia',
    pc: 'pc', компьютер: 'pc',
  };
  for (const source of sources) {
    const target = aliases[normalize(source)] ?? normalize(source);
    const match = options.tradeEnvironments.find((option) =>
      (aliases[normalize(option.value)] ?? normalize(option.value)) === target,
    );
    if (match) return match.id;
  }
  return null;
};

export type SelectedOfferAttribute =
  | { id: string; type: 'Select'; values: string[] }
  | { id: string; name: string; type: 'Numeric'; display: 'Value'; units: string | null; value: number };

const cache = new Map<string, { expiresAt: number; value: Promise<AccountOfferOptions> }>();

const fetchCatalog = async (path: string): Promise<unknown> => {
  const response = await fetch(`${API_ORIGIN}${path}`);
  if (!response.ok) {
    throw new EldoradoApiError(`Не удалось получить параметры игры Eldorado: HTTP ${response.status}`, 502);
  }
  return response.json();
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parseAttribute = (value: unknown): AccountOfferOptions['requiredAttributes'][number] | null => {
  if (!isRecord(value) || value.isRequired !== true || value.type !== 'Select') return null;
  if (typeof value.id !== 'string' || typeof value.name !== 'string') {
    throw new EldoradoApiError('Eldorado вернул некорректный параметр игры', 502);
  }
  const values = Array.isArray(value.selectValues)
    ? value.selectValues.flatMap((option): Array<{ id: string; name: string }> =>
        isRecord(option) && typeof option.id === 'string' && typeof option.name === 'string'
          ? [{ id: option.id, name: option.name }]
          : [],
      )
    : [];
  if (values.length === 0) {
    throw new EldoradoApiError(`Eldorado не вернул варианты для параметра ${value.name}`, 502);
  }
  return { id: value.id, name: value.name, values };
};

const parseNumericAttribute = (
  value: unknown,
): AccountOfferOptions['requiredNumericAttributes'][number] | null => {
  if (!isRecord(value) || value.isRequired !== true || value.type !== 'Numeric') return null;
  if (typeof value.id !== 'string' || typeof value.name !== 'string' ||
      typeof value.minValue !== 'number' || typeof value.maxValue !== 'number' ||
      typeof value.precision !== 'number' || !Number.isInteger(value.precision) ||
      value.precision < 0 || value.precision > 12) {
    throw new EldoradoApiError('Eldorado вернул некорректный числовой параметр игры', 502);
  }
  return {
    id: value.id,
    name: value.name,
    minValue: value.minValue,
    maxValue: value.maxValue,
    precision: value.precision,
    units: typeof value.units === 'string' ? value.units : null,
  };
};

const parseTradeEnvironment = (
  value: unknown,
): AccountOfferOptions['tradeEnvironments'] => {
  if (!isRecord(value) || typeof value.id !== 'string') return [];
  const children = value.childTradeEnvironments;
  if (Array.isArray(children) && children.length > 0) {
    return children.flatMap(parseTradeEnvironment);
  }
  return typeof value.name === 'string' && typeof value.value === 'string'
    ? [{ id: value.id, name: value.name, value: value.value }]
    : [];
};

/** Public Eldorado catalog is the source of truth for each game's required fields. */
export const loadAccountOfferOptions = (gameId: string): Promise<AccountOfferOptions> => {
  const cached = cache.get(gameId);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const encoded = encodeURIComponent(gameId);
  const value = Promise.all([
    fetchCatalog(`/api/library/${encoded}/Account/attributes/offers?locale=en-US`),
    fetchCatalog(`/api/library/${encoded}/Account?locale=en-US`),
  ]).then(([attributes, category]) => {
    if (!Array.isArray(attributes) || !isRecord(category) || !Array.isArray(category.tradeEnvironments)) {
      throw new EldoradoApiError('Eldorado вернул некорректные параметры игры', 502);
    }
    const required = attributes.filter((attribute) => isRecord(attribute) && attribute.isRequired === true);
    const unsupported = required.find((attribute) =>
      isRecord(attribute) && attribute.type !== 'Select' && attribute.type !== 'Numeric',
    );
    if (unsupported) throw new EldoradoApiError('Eldorado требует неподдерживаемый параметр игры', 422);
    return {
      requiredAttributes: required.flatMap((attribute) => {
        const parsed = parseAttribute(attribute);
        return parsed ? [parsed] : [];
      }),
      requiredNumericAttributes: required.flatMap((attribute) => {
        const parsed = parseNumericAttribute(attribute);
        return parsed ? [parsed] : [];
      }),
      tradeEnvironments: category.tradeEnvironments.flatMap(parseTradeEnvironment),
    };
  });
  cache.set(gameId, { expiresAt: Date.now() + CACHE_TTL_MS, value });
  void value.catch(() => {
    if (cache.get(gameId)?.value === value) cache.delete(gameId);
  });
  return value;
};

export const resolveAccountOfferSelection = (
  options: AccountOfferOptions,
  selection: AccountOfferSelection,
  defaultTradeEnvironmentId?: string,
): { tradeEnvironmentId: string | null; offerAttributes: SelectedOfferAttribute[] } => {
  const tradeEnvironmentId = selection.tradeEnvironmentId || defaultTradeEnvironmentId || null;
  if (options.tradeEnvironments.length > 0 &&
      !options.tradeEnvironments.some((option) => option.id === tradeEnvironmentId)) {
    throw new EldoradoApiError(`Укажите ${options.tradeEnvironments[0]?.name ?? 'параметр игры'} для Eldorado`, 422);
  }
  if (options.tradeEnvironments.length === 0 && tradeEnvironmentId !== null) {
    throw new EldoradoApiError('Для этой игры не нужен параметр устройства или сервера', 422);
  }

  const submitted = selection.offerAttributes ?? {};
  for (const id of Object.keys(submitted)) {
    if (!options.requiredAttributes.some((attribute) => attribute.id === id)) {
      throw new EldoradoApiError('Передан неизвестный параметр игры Eldorado', 422);
    }
  }
  const offerAttributes: SelectedOfferAttribute[] = options.requiredAttributes.map((attribute) => {
    const value = submitted[attribute.id];
    if (!attribute.values.some((option) => option.id === value)) {
      throw new EldoradoApiError(`Укажите ${attribute.name} для Eldorado`, 422);
    }
    return { id: attribute.id, type: 'Select' as const, values: [value] };
  });
  const numerics = selection.numericAttributes ?? {};
  for (const id of Object.keys(numerics)) {
    if (!options.requiredNumericAttributes.some((attribute) => attribute.id === id)) {
      throw new EldoradoApiError('Передан неизвестный числовой параметр Eldorado', 422);
    }
  }
  for (const attribute of options.requiredNumericAttributes) {
    const value = numerics[attribute.id];
    const rounded = Number.isFinite(value) && Number(value.toFixed(attribute.precision)) === value;
    if (!rounded || value < attribute.minValue || value > attribute.maxValue) {
      throw new EldoradoApiError(`Укажите ${attribute.name} от ${attribute.minValue} до ${attribute.maxValue} для Eldorado`, 422);
    }
    offerAttributes.push({
      id: attribute.id,
      name: attribute.name,
      type: 'Numeric',
      display: 'Value',
      units: attribute.units,
      value,
    });
  }
  return { tradeEnvironmentId, offerAttributes };
};
