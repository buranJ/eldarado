import type { Money } from './common';
import type { GameId } from './game';
import type { MarketplaceId } from './marketplace';

export type ListingStatus = 'draft' | 'published' | 'paused' | 'sold' | 'error';

export interface MarketplaceListing {
  id: string;
  inventoryItemId: string;
  accountId: string;
  gameId: GameId;
  title: string;
  marketplace: MarketplaceId;
  /** ID assigned by the destination marketplace once published. */
  externalListingId: string | null;
  sellPrice: Money;
  purchasePrice: Money;
  expectedProfit: Money;
  status: ListingStatus;
  createdAt: string;
  publishedAt: string | null;
  errorMessage: string | null;
}
