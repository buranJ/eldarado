import type {
  EldoradoAccountOfferPayload,
  EldoradoOfferImage,
} from './account-offer.js';

const API_ORIGIN = 'https://www.eldorado.gg';
const TOKEN_SAFETY_WINDOW_MS = 30_000;
const OFFERS_PAGE_SIZE = 50;
const ORDERS_FIRST_CURSOR =
  '9999-99-99 99:99:99.999999999999999-9999-9999-9999-999999999999';
const MAX_ORDER_PAGES = 500;
const MAX_RATE_LIMIT_RETRIES = 5;

const wait = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const retryDelay = (response: Response, attempt: number): number => {
  const retryAfter = response.headers.get('retry-after');
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds > 0) return seconds * 1_000;
    const at = Date.parse(retryAfter);
    if (Number.isFinite(at)) return Math.max(1_000, at - Date.now());
  }
  return Math.min(30_000, 2_000 * 2 ** attempt);
};

interface TokenResponse {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface EldoradoOfferSummary {
  id: string;
  title: string;
  gameId: string;
  category: string;
  state: string;
  price: { amount: number; currency: string } | null;
}

export interface EldoradoAccountGame {
  gameId: string;
  gameName: string;
  seoAlias: string;
}

export interface EldoradoCredentials {
  clientId: string;
  clientSecret: string;
}

export interface EldoradoSellerOrder {
  id: string;
  offerId: string;
  gameId: string;
  title: string;
  category: string;
  state: string;
  createdAt: string;
  stateChangedAt: string | null;
  totalPrice: { amount: number; currency: string };
}

interface OfferPage {
  pageIndex: number;
  totalPages: number;
  recordCount: number;
  pageSize: number;
  results: unknown[];
}

interface OrderPage {
  nextPageCursor: string | null;
  results: unknown[];
}

export class EldoradoApiError extends Error {
  readonly status: number;

  constructor(
    message: string,
    status: number,
  ) {
    super(message);
    this.name = 'EldoradoApiError';
    this.status = status;
  }
}

const errorMessage = async (response: Response): Promise<string> => {
  const body = (await response.json().catch(() => null)) as
    | { messages?: string[]; message?: string; title?: string }
    | null;
  return body?.messages?.join('; ') ?? body?.message ?? body?.title ?? `HTTP ${response.status}`;
};

/**
 * Small, dependency-free client for the Eldorado Seller API. Tokens live only
 * in memory, so restarting the API clears them and the client re-authenticates.
 */
export class EldoradoClient {
  private token: { value: string; expiresAt: number } | null = null;
  private accountGamesPromise: Promise<EldoradoAccountGame[]> | null = null;
  private readonly credentials: EldoradoCredentials | null;

  constructor(credentials: EldoradoCredentials | null) {
    this.credentials = credentials;
  }

  get configured(): boolean {
    return this.credentials !== null;
  }

  private async accessToken(): Promise<string> {
    if (!this.configured) {
      throw new EldoradoApiError(
        'В профиле не настроены ключи Eldorado',
        503,
      );
    }

    if (this.token && this.token.expiresAt > Date.now() + TOKEN_SAFETY_WINDOW_MS) {
      return this.token.value;
    }

    const response = await fetch(`${API_ORIGIN}/api/authentication/seller/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        ClientId: this.credentials!.clientId,
        ClientSecret: this.credentials!.clientSecret,
      }),
    });
    if (!response.ok) throw new EldoradoApiError(await errorMessage(response), response.status);

    const body = (await response.json()) as TokenResponse;
    if (!body.accessToken || body.tokenType !== 'Bearer' || !Number.isFinite(body.expiresIn)) {
      throw new EldoradoApiError('Eldorado вернул некорректный ответ авторизации', 502);
    }
    this.token = {
      value: body.accessToken,
      expiresAt: Date.now() + body.expiresIn * 1_000,
    };
    return this.token.value;
  }

  private async request<T>(
    path: string,
    init: RequestInit = {},
    retryAuth = true,
    rateLimitAttempt = 0,
  ): Promise<T> {
    const response = await fetch(`${API_ORIGIN}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${await this.accessToken()}`,
        ...init.headers,
      },
    });
    if (response.status === 401 && retryAuth) {
      this.token = null;
      return this.request<T>(path, init, false, rateLimitAttempt);
    }
    if (response.status === 429 && rateLimitAttempt < MAX_RATE_LIMIT_RETRIES) {
      await wait(retryDelay(response, rateLimitAttempt));
      return this.request<T>(path, init, retryAuth, rateLimitAttempt + 1);
    }
    if (!response.ok) throw new EldoradoApiError(await errorMessage(response), response.status);
    if (response.status === 204) return undefined as T;
    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  private parseOffers(candidates: unknown[]): EldoradoOfferSummary[] {
    return candidates.flatMap((value) => {
      if (typeof value !== 'object' || value === null) return [];
      const offer = value as Record<string, unknown>;
      const price = offer.pricePerUnit;
      const money =
        typeof price === 'object' && price !== null &&
        typeof (price as Record<string, unknown>).amount === 'number' &&
        typeof (price as Record<string, unknown>).currency === 'string'
          ? {
              amount: (price as Record<string, number>).amount,
              currency: (price as Record<string, string>).currency,
            }
          : null;
      if (typeof offer.id !== 'string') return [];
      return [
        {
          id: offer.id,
          title: typeof offer.offerTitle === 'string' ? offer.offerTitle : 'Без названия',
          gameId: typeof offer.gameId === 'string' ? offer.gameId : 'unknown',
          category: typeof offer.category === 'string' ? offer.category : 'unknown',
          state: typeof offer.offerState === 'string' ? offer.offerState : 'unknown',
          price: money,
        },
      ];
    });
  }

  private parseOfferPage(body: unknown): OfferPage {
    if (Array.isArray(body)) {
      return {
        pageIndex: 1,
        totalPages: 1,
        recordCount: body.length,
        pageSize: body.length,
        results: body,
      };
    }
    if (typeof body !== 'object' || body === null) {
      throw new EldoradoApiError('Eldorado вернул некорректный список объявлений', 502);
    }
    const record = body as Record<string, unknown>;
    const results = Array.isArray(record.results)
      ? record.results
      : Array.isArray(record.items)
        ? record.items
        : [];
    return {
      pageIndex: typeof record.pageIndex === 'number' ? record.pageIndex : 1,
      totalPages: typeof record.totalPages === 'number' ? record.totalPages : 1,
      recordCount: typeof record.recordCount === 'number' ? record.recordCount : results.length,
      pageSize: typeof record.pageSize === 'number' ? record.pageSize : results.length,
      results,
    };
  }

  private parseOrderPage(body: unknown): OrderPage {
    if (typeof body !== 'object' || body === null) {
      throw new EldoradoApiError('Eldorado вернул некорректную страницу заказов', 502);
    }
    const page = body as Record<string, unknown>;
    return {
      nextPageCursor:
        typeof page.nextPageCursor === 'string' && page.nextPageCursor
          ? page.nextPageCursor
          : null,
      results: Array.isArray(page.results) ? page.results : [],
    };
  }

  private parseSellerOrders(candidates: unknown[]): EldoradoSellerOrder[] {
    return candidates.flatMap((value) => {
      if (typeof value !== 'object' || value === null) return [];
      const order = value as Record<string, unknown>;
      const details = order.orderOfferDetails;
      const state = order.state;
      const totalPrice = order.totalPrice;
      if (
        typeof order.id !== 'string' ||
        typeof order.offerId !== 'string' ||
        typeof order.createdDate !== 'string' ||
        typeof details !== 'object' ||
        details === null ||
        typeof state !== 'object' ||
        state === null ||
        typeof totalPrice !== 'object' ||
        totalPrice === null
      ) {
        return [];
      }
      const offer = details as Record<string, unknown>;
      const orderState = state as Record<string, unknown>;
      const price = totalPrice as Record<string, unknown>;
      if (
        typeof offer.gameId !== 'string' ||
        typeof offer.offerTitle !== 'string' ||
        typeof offer.category !== 'string' ||
        typeof orderState.state !== 'string' ||
        typeof price.amount !== 'number' ||
        typeof price.currency !== 'string'
      ) {
        return [];
      }
      return [{
        id: order.id,
        offerId: order.offerId,
        gameId: offer.gameId,
        title: offer.offerTitle,
        category: offer.category,
        state: orderState.state,
        createdAt: order.createdDate,
        stateChangedAt:
          typeof orderState.createdDate === 'string' ? orderState.createdDate : null,
        totalPrice: { amount: price.amount, currency: price.currency },
      }];
    });
  }

  /** Loads every page of the seller's offers instead of Eldorado's default first 10 rows. */
  async listOffers(): Promise<EldoradoOfferSummary[]> {
    const first = this.parseOfferPage(
      await this.request<unknown>(
        `/api/flexibleOffers/me/search?pageIndex=1&pageSize=${OFFERS_PAGE_SIZE}`,
      ),
    );
    const totalPages = Math.min(Math.max(first.totalPages, 1), 100);
    const remaining = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) =>
        this.request<unknown>(
          `/api/flexibleOffers/me/search?pageIndex=${index + 2}&pageSize=${OFFERS_PAGE_SIZE}`,
        ).then((body) => this.parseOfferPage(body)),
      ),
    );
    return this.parseOffers([first, ...remaining].flatMap((page) => page.results));
  }

  /** Loads the complete cursor-paginated seller order history. */
  async listSellerOrders(): Promise<EldoradoSellerOrder[]> {
    const orders: unknown[] = [];
    const visited = new Set<string>();
    let cursor: string | null = ORDERS_FIRST_CURSOR;

    for (let pageIndex = 0; cursor && pageIndex < MAX_ORDER_PAGES; pageIndex += 1) {
      if (visited.has(cursor)) break;
      visited.add(cursor);
      const query = new URLSearchParams({
        isAscendingDateOrder: 'false',
        orderGroup: 'Regular',
        cursorValue: cursor,
        pageDirection: 'Next',
      });
      const page = this.parseOrderPage(
        await this.request<unknown>(`/api/orders/me/seller/orders?${query.toString()}`),
      );
      orders.push(...page.results);
      cursor = page.nextPageCursor;
    }

    return this.parseSellerOrders(orders);
  }

  /** Public Eldorado catalogue used to resolve stable game IDs into names and URLs. */
  async listAccountGames(): Promise<EldoradoAccountGame[]> {
    if (!this.accountGamesPromise) {
      this.accountGamesPromise = fetch(`${API_ORIGIN}/api/library`)
        .then(async (response) => {
          if (!response.ok) {
            throw new EldoradoApiError(await errorMessage(response), response.status);
          }
          const body = (await response.json()) as unknown;
          if (!Array.isArray(body)) {
            throw new EldoradoApiError('Eldorado вернул некорректный справочник игр', 502);
          }
          return body.flatMap((value): EldoradoAccountGame[] => {
            if (typeof value !== 'object' || value === null) return [];
            const game = value as Record<string, unknown>;
            if (
              game.category !== 'Account' ||
              typeof game.gameId !== 'string' ||
              typeof game.gameName !== 'string' ||
              typeof game.seoAlias !== 'string'
            ) {
              return [];
            }
            return [{ gameId: game.gameId, gameName: game.gameName, seoAlias: game.seoAlias }];
          });
        })
        .catch((error) => {
          this.accountGamesPromise = null;
          throw error;
        });
    }
    return this.accountGamesPromise;
  }

  /** Uploads one offer image and converts Eldorado's file response to OfferImageDTO. */
  async uploadAccountImage(input: {
    bytes: Buffer;
    mimeType: string;
    fileName: string;
  }): Promise<EldoradoOfferImage> {
    const form = new FormData();
    form.append('image', new Blob([input.bytes], { type: input.mimeType }), input.fileName);
    // Eldorado's own seller UI uploads images for every offer category with
    // FileType.Offer. `Account` is a marketplace category, not a valid file
    // type, and the file service rejects it as an invalid `type` route value.
    const body = await this.request<{ localPaths?: string[] }>('/api/files/me/Offer', {
      method: 'POST',
      body: form,
    });
    const paths = body?.localPaths?.map((path) => path.replace('/offerimages/', '')) ?? [];
    if (paths.length < 3 || paths.slice(0, 3).some((path) => !path)) {
      throw new EldoradoApiError('Eldorado вернул некорректный ответ загрузки изображения', 502);
    }
    return {
      smallImage: paths[0],
      largeImage: paths[1],
      originalSizeImage: paths[2],
    };
  }

  async createAccountOffer(payload: EldoradoAccountOfferPayload): Promise<string> {
    const before = new Set((await this.listOffers()).map((offer) => offer.id));
    const response = await this.request<unknown>('/api/flexibleOffers/account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', swagger: 'Swager request' },
      body: JSON.stringify(payload),
    });

    if (typeof response === 'string' && response) return response;
    if (typeof response === 'object' && response !== null) {
      const record = response as Record<string, unknown>;
      const id = record.id ?? record.offerId;
      if (typeof id === 'string' && id) return id;
    }

    const created = (await this.listOffers()).find(
      (offer) => !before.has(offer.id) && offer.title === payload.details.offerTitle,
    );
    if (!created) {
      throw new EldoradoApiError(
        'Лот создан, но API не вернул его идентификатор. Проверьте список лотов Eldorado.',
        502,
      );
    }
    return created.id;
  }

  async deleteAccountOffer(offerId: string): Promise<void> {
    await this.request<void>(
      `/api/flexibleOffersUser/me/${encodeURIComponent(offerId)}`,
      {
        method: 'DELETE',
        headers: { swagger: 'Swager request' },
      },
    );
  }
}
