import { env } from '../../../lib/env.js';
import type {
  EldoradoAccountOfferPayload,
  EldoradoOfferImage,
} from './account-offer.js';

const API_ORIGIN = 'https://www.eldorado.gg';
const TOKEN_SAFETY_WINDOW_MS = 30_000;

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

  get configured(): boolean {
    return env.eldoradoClientId !== null && env.eldoradoClientSecret !== null;
  }

  private async accessToken(): Promise<string> {
    if (!this.configured) {
      throw new EldoradoApiError(
        'Не заданы ELDORADO_CLIENT_ID и ELDORADO_CLIENT_SECRET в apps/api/.env',
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
        ClientId: env.eldoradoClientId,
        ClientSecret: env.eldoradoClientSecret,
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

  private async request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
    const response = await fetch(`${API_ORIGIN}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${await this.accessToken()}`,
        ...init.headers,
      },
    });
    if (response.status === 401 && retry) {
      this.token = null;
      return this.request<T>(path, init, false);
    }
    if (!response.ok) throw new EldoradoApiError(await errorMessage(response), response.status);
    if (response.status === 204) return undefined as T;
    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  /** Read-only smoke test. It proves the credentials work without mutating the seller account. */
  async listOffers(): Promise<EldoradoOfferSummary[]> {
    const body = await this.request<unknown>('/api/flexibleOffers/me/search');
    const candidates = Array.isArray(body)
      ? body
      : typeof body === 'object' && body !== null && 'items' in body && Array.isArray(body.items)
        ? body.items
        : typeof body === 'object' && body !== null && 'results' in body && Array.isArray(body.results)
          ? body.results
        : [];

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

export const eldoradoClient = new EldoradoClient();
