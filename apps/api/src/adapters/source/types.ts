import type { CurrencyCode } from '@gamestock/domain';

/** A listing exactly as observed on a source marketplace, before normalization. */
export interface RawOffer {
  externalId: string;
  url: string;
  /** Full text as rendered by the source, including any auto-generated suffix. */
  rawTitle: string;
  /** Seller's own title with the source's auto-suffix removed. */
  sellerTitle: string;
  price: { minor: number; currency: CurrencyCode };
  autoDelivery: boolean;
  seller: {
    externalId: string;
    name: string;
    rating: number | null;
    reviewsCount: number;
    accountAgeLabel: string | null;
    accountAgeMonths: number | null;
    isOnline: boolean;
    profileUrl: string | null;
  };
  /** Game-specific attributes the source exposes natively. */
  gameData: Record<string, unknown>;
}

export interface SourceImage {
  sourceUrl: string;
  bytes: Buffer;
  mimeType: string;
  extension: string;
}

/**
 * Every source marketplace implements this. Adding PlayerAuctions or G2G means
 * adding an adapter, not touching the pipeline.
 */
export interface SourceAdapter {
  readonly id: string;
  readonly name: string;
  /** Categories this adapter can collect, keyed by game id. */
  supports(gameId: string): boolean;
  /** Fetches and parses one category page. */
  collect(gameId: string): Promise<RawOffer[]>;
  /** Downloads up to four screenshots from an individual source listing. */
  loadImages?(externalId: string, limit?: number): Promise<SourceImage[]>;
  /** Checks whether a single listing is still live (stage 5). */
  isAlive(externalId: string): Promise<boolean>;
}
