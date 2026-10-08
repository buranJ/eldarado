import { EldoradoApiError } from './client.js';

const API_ORIGIN = 'https://www.eldorado.gg';
const CACHE_TTL_MS = 15 * 60 * 1_000;

export interface AccountOfferOptions {
  requiredAttributes: Array<{
    id: string;
    name: string;
    values: Array<{ id: string; name: string }>;
  }>;
  tradeEnvironments: Array<{ id: string; name: string; value: string }>;
}

export interface AccountOfferSelection {
  tradeEnvironmentId?: string | null;
  offerAttributes?: Record<string, string>;
}

export interface SelectedOfferAttribute {
  id: string;
  type: 'Select';
  values: string[];
}

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
  if (!isRecord(value) || value.isRequired !== true) return null;
  if (value.type !== 'Select' || typeof value.id !== 'string' || typeof value.name !== 'string') {
    throw new EldoradoApiError('Eldorado требует неподдерживаемый параметр игры', 422);
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
    return {
      requiredAttributes: attributes.flatMap((attribute) => {
        const parsed = parseAttribute(attribute);
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
  const offerAttributes = options.requiredAttributes.map((attribute) => {
    const value = submitted[attribute.id];
    if (!attribute.values.some((option) => option.id === value)) {
      throw new EldoradoApiError(`Укажите ${attribute.name} для Eldorado`, 422);
    }
    return { id: attribute.id, type: 'Select' as const, values: [value] };
  });
  return { tradeEnvironmentId, offerAttributes };
};
