import type { Money } from './common';
import type { GameId } from './game';
import type { MarketplaceId } from './marketplace';

export type ListingStatus =
  | 'draft'
  | 'published'
  | 'paused'
  | 'sold'
  | 'closed'
  | 'error'
  | 'deleted';

export interface MarketplaceListing {
  id: string;
  inventoryItemId: string | null;
  accountId: string;
  gameId: GameId;
  gameLabel?: string;
  title: string;
  marketplace: MarketplaceId;
  source?: 'gamestock' | 'eldorado';
  /** ID assigned by the destination marketplace once published. */
  externalListingId: string | null;
  url?: string | null;
  sellPrice: Money | null;
  purchasePrice: Money | null;
  expectedProfit: Money | null;
  status: ListingStatus;
  createdAt: string | null;
  publishedAt: string | null;
  errorMessage: string | null;
}
