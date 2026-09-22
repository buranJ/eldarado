import type { CurrencyCode, Money, Score, ScoreFactor } from './common';
import type { GameId } from './game';
import type { MarketplaceId } from './marketplace';
import type { ClashRoyaleGameData } from './games/clash-royale';

export interface Seller {
  id: string;
  name: string;
  /** 0–5 marketplace rating. */
  rating: number | null;
  reviewsCount: number | null;
  accountAgeMonths: number | null;
  /** Raw age label from the source ("на сайте 9 месяцев"). */
  accountAgeLabel: string | null;
  isNew: boolean;
  isOnline: boolean;
  profileUrl: string | null;
}

/** A listing as it exists on the source marketplace. */
export interface SourceListing {
  marketplace: MarketplaceId;
  listingId: string;
  url: string;
  title: string;
  price: Money;
  detectedCurrency: CurrencyCode;
  seller: Seller;
  autoDelivery: boolean;
  /** Locally cached screenshot, exposed through the GameStock API. */
  imageUrl: string | null;
  /** Up to four locally cached screenshots in source order. */
  imageUrls: string[];
  foundAt: string;
  lastSeenAt: string;
}

/** Everything that affects how safely an account can change hands. */
export interface TransferInfo {
  fullAccess: boolean | null;
  emailAccess: boolean | null;
  rebindAvailable: boolean | null;
  originalEmail: boolean | null;
  restrictions: string | null;
}

export type AnalysisStatus = 'pending' | 'analyzed' | 'needs_review' | 'failed';

export interface AIAnalysis {
  status: AnalysisStatus;
  analyzedAt: string;
  modelVersion: string;
  /** Quality of the account itself, independent of its price. */
  qualityScore: Score;
  /** Profitability of the deal — the product's headline score. */
  dealScore: Score;
  /** 0–100, higher means riskier. */
  riskScore: Score;
  /** How much the model trusts its own extraction, 0–100. */
  analysisConfidence: Score;
  estimatedMarketValue: Money;
  recommendedResalePrice: Money;
  estimatedProfit: Money;
  estimatedMarginPercent: number;
  comparableListings: number;
  summary: string;
  strengths: string[];
  risks: string[];
  qualityFactors: ScoreFactor[];
}

export type AccountStatus =
  /* Collector stages — assigned by the pipeline before any human sees them. */
  | 'new'
  | 'prefiltered_out'
  | 'ready_for_analysis'
  /* Post-analysis stages — assigned by AI scoring and operator decisions. */
  | 'analyzed'
  | 'needs_review'
  | 'approved'
  | 'rejected'
  | 'purchased';

/**
 * Game-specific attributes live under `gameData` so the core account entity
 * stays game-agnostic.
 */
export type GameData = ClashRoyaleGameData;

export interface GameAccount {
  id: string;
  gameId: GameId;
  source: SourceListing;
  gameData: GameData;
  transfer: TransferInfo;
  /** Completeness of extracted attributes, 0–100. Null until analysis runs. */
  dataQuality: Score | null;
  analysis: AIAnalysis | null;
  status: AccountStatus;
  tags: string[];
}
