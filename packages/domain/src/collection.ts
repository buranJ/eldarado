import type { GameId } from './game';
import type { MarketplaceId } from './marketplace';

export type CollectionRunStatus = 'running' | 'ok' | 'failed';

/** One execution of the source collector. */
export interface CollectionRun {
  id: string;
  marketplace: MarketplaceId;
  gameId: GameId;
  status: CollectionRunStatus;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  /** Offers present on the source page. */
  seen: number;
  created: number;
  updated: number;
  unchanged: number;
  /** Survived the pre-filter and are eligible for AI analysis. */
  passed: number;
  rejected: number;
  /** Previously known offers that are no longer listed. */
  disappeared: number;
  error: string | null;
}

/**
 * Cheap rule-based gate that runs before any AI call. Everything it needs comes
 * from the source category page, so rejecting a listing here costs nothing.
 */
export interface PrefilterConfig {
  minSellerRating: number;
  minSellerReviews: number;
  minSellerAgeMonths: number;
  /** Missing public reputation data is left for the later AI/manual risk stage. */
  allowUnknownSellerRating: boolean;
  allowUnknownSellerAge: boolean;
  minPrice: number;
  maxPrice: number;
  priceCurrency: string;
  minTrophies: number;
  minCards: number;
  requireAutoDelivery: boolean;
}

export interface PrefilterVerdict {
  passed: boolean;
  /** Human-readable reasons a listing was rejected, in rule order. */
  reasons: string[];
}
