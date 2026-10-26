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

export interface PrefilterVerdict {
  passed: boolean;
  /** Human-readable reasons a listing was rejected, in rule order. */
  reasons: string[];
}
