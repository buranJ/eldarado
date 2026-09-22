import type {
  ActivityEvent,
  CollectionRun,
  GameAccount,
  InventoryStatus,
  MarketplaceListing,
  Money,
} from '@gamestock/domain';

/** Requests go through the Vite dev proxy, so no host is needed. */
const BASE = '/api';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(body?.error ?? `Запрос ${path} завершился с кодом ${response.status}`, response.status);
  }
  return (await response.json()) as T;
};

export interface ListingQuery {
  gameId?: string;
  marketplace?: string;
  status?: string;
  search?: string;
  priceMin?: number;
  priceMax?: number;
  trophiesMin?: number;
  sellerRatingMin?: number;
  autoDelivery?: boolean;
  page?: number;
  pageSize?: number;
  sort?: string;
  direction?: 'asc' | 'desc';
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

const toQuery = (query: ListingQuery): string => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === '' || value === null) continue;
    params.set(key, String(value));
  }
  return params.toString();
};

export interface AnalysisStatus {
  configured: boolean;
  running: boolean;
  pending: number;
  analysed: number;
  needsReview: number;
  total: number;
  averages: { deal: number; quality: number; risk: number };
}

export interface InventoryItemDto {
  id: string;
  accountId: string;
  listingId: string;
  gameId: string;
  title: string;
  url: string;
  purchase: {
    marketplace: string;
    price: Money;
    purchasedAt: string;
    orderRef: string | null;
    operator: string;
  };
  resale: {
    marketplace: string;
    recommendedPrice: Money;
    manualPrice: Money | null;
  };
  expectedProfit: Money;
  scores: { quality: number; deal: number; risk: number } | null;
  status: InventoryStatus;
  updatedAt: string;
}

export interface InventoryPage {
  items: InventoryItemDto[];
  total: number;
  capitalMinor: number;
  expectedRevenueMinor: number;
}

export interface EldoradoPublishPreview {
  title: string;
  description: string;
  gameId: string;
  currency: 'USD';
  automaticDelivery: true;
  sourceImageUrls: string[];
}

export interface EldoradoPublishInput {
  title: string;
  description: string;
  priceUsd: number;
  hasOriginalEmail: boolean;
  imageDataUrl?: string;
  imageFileName?: string;
  accountLogin: string;
  accountPassword: string;
  emailProviderUrl?: string;
  emailLogin?: string;
  emailPassword?: string;
  mfaLogin?: string;
  mfaPassword?: string;
  additionalInfo?: string;
  termsAccepted: true;
  rulesAccepted: true;
}

export interface EldoradoPublishResult {
  offerId: string;
  url: string;
  publishedAt: string;
}

export interface OverviewDto {
  gameId: string;
  kpi: {
    foundToday: number;
    analysed: number;
    approved: number;
    purchased: number;
    listed: number;
    sold: number;
  };
  pipeline: {
    collected: number;
    analyzed: number;
    top: number;
    approved: number;
    purchased: number;
    published: number;
    sold: number;
  };
  averageDealScore: number;
}

export interface SyncStatus {
  running: boolean;
  lastRun: CollectionRun | null;
  autoSyncEnabled: boolean;
  nextRunAt: string | null;
}

export interface HealthStatus {
  ok: boolean;
  aiConfigured: boolean;
}

export interface EldoradoStatus {
  configured: boolean;
  mode: 'ready_to_publish' | 'not_configured';
}

export const api = {
  health: () => request<HealthStatus>('/health'),
  listings: (query: ListingQuery) => request<Page<GameAccount>>(`/listings?${toQuery(query)}`),
  listing: (id: string) => request<GameAccount>(`/listings/${id}`),
  syncStatus: (gameId: string) =>
    request<SyncStatus>(`/sync/status?gameId=${encodeURIComponent(gameId)}`),
  qualified: (gameId: string) =>
    request<{ items: GameAccount[]; total: number }>(`/qualified?gameId=${gameId}`),
  top: (gameId: string, limit = 100) =>
    request<{ items: GameAccount[]; total: number }>(`/top?gameId=${gameId}&limit=${limit}`),
  analysisStatus: (gameId: string) =>
    request<AnalysisStatus>(`/analysis/status?gameId=${encodeURIComponent(gameId)}`),
  overview: (gameId: string) => request<OverviewDto>(`/overview?gameId=${gameId}`),
  activity: (gameId: string, limit = 15) =>
    request<ActivityEvent[]>(`/activity?gameId=${gameId}&limit=${limit}`),

  approve: (listingId: string) =>
    request<{ status: string; inventoryItemId: string }>(`/listings/${listingId}/approve`, {
      method: 'POST',
      body: '{}',
    }),
  reject: (listingId: string) =>
    request<{ status: string }>(`/listings/${listingId}/reject`, { method: 'POST', body: '{}' }),
  bulkDecision: (ids: string[], action: 'approve' | 'reject') =>
    request<{ action: 'approve' | 'reject'; processed: number; inventoryItemIds: string[] }>(
      '/listings/bulk-decision',
      { method: 'POST', body: JSON.stringify({ ids, action }) },
    ),
  purchase: (listingId: string) =>
    request<{ status: string; inventoryItemId: string }>(`/listings/${listingId}/purchase`, {
      method: 'POST',
      body: '{}',
    }),

  inventory: (gameId: string, status?: string) =>
    request<InventoryPage>(
      `/inventory?gameId=${gameId}${status ? `&status=${status}` : ''}`,
    ),
  setInventoryPrice: (id: string, amount: number | null) =>
    request<{ manualPrice: number | null }>(`/inventory/${id}/price`, {
      method: 'PATCH',
      body: JSON.stringify({ amount }),
    }),
  setInventoryStatus: (id: string, status: InventoryStatus) =>
    request<{ status: string }>(`/inventory/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  eldoradoPreview: (id: string) =>
    request<EldoradoPublishPreview>(`/inventory/${id}/eldorado/preview`),
  eldoradoStatus: () => request<EldoradoStatus>('/destinations/eldorado/status'),
  eldoradoListings: () =>
    request<{ items: MarketplaceListing[]; total: number; remoteError: string | null }>(
      '/destinations/eldorado/listings',
    ),
  publishToEldorado: (id: string, input: EldoradoPublishInput) =>
    request<EldoradoPublishResult>(`/inventory/${id}/eldorado/publish`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  deleteEldoradoListing: (inventoryItemId: string) =>
    request<{ deleted: true; offerId: string }>(
      `/inventory/${inventoryItemId}/eldorado/listing`,
      { method: 'DELETE' },
    ),
  deleteEldoradoOffer: (offerId: string) =>
    request<{ deleted: true; offerId: string }>(
      `/destinations/eldorado/offers/${encodeURIComponent(offerId)}`,
      { method: 'DELETE' },
    ),

  runAnalysis: (gameId: string, limit = 100) =>
    request<{ analysed: number; failed: number; skipped: number; costUsd: number }>(
      '/analysis/run',
      { method: 'POST', body: JSON.stringify({ gameId, limit }) },
    ),
  runSync: (gameId: string) =>
    request<CollectionRun>('/sync/run', {
      method: 'POST',
      body: JSON.stringify({ gameId }),
    }),
  setAutoSync: (enabled: boolean) =>
    request<Pick<SyncStatus, 'autoSyncEnabled' | 'nextRunAt'>>('/sync/auto', {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    }),
};
