import type { Money } from './common';
import type { GameId } from './game';
import type { MarketplaceId } from './marketplace';

export type InventoryStatus =
  | 'purchased'
  | 'preparing'
  | 'ready_to_list'
  | 'listed'
  | 'reserved'
  | 'sold';

export interface PurchaseRecord {
  marketplace: MarketplaceId;
  price: Money;
  purchasedAt: string;
  orderRef: string;
  operator: string;
}

/** Resale intent — the destination marketplace and its pricing. */
export interface ResalePlan {
  marketplace: MarketplaceId;
  recommendedPrice: Money;
  /** Operator override. `null` means the AI price is used as-is. */
  manualPrice: Money | null;
}

/** Additional destinations the item can be pushed to later. */
export interface PlannedListing {
  marketplace: MarketplaceId;
  plannedPrice: Money;
  enabled: boolean;
}

export interface InventoryItem {
  id: string;
  accountId: string;
  gameId: GameId;
  title: string;
  purchase: PurchaseRecord;
  resale: ResalePlan;
  futureListings: PlannedListing[];
  status: InventoryStatus;
  updatedAt: string;
}
