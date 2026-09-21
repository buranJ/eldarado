import type { Money } from './common';
import type { GameId } from './game';
import type { MarketplaceId } from './marketplace';

export type SaleStatus = 'completed' | 'pending_payout' | 'refunded' | 'disputed';

export interface Sale {
  id: string;
  listingId: string | null;
  accountId: string;
  gameId: GameId;
  title: string;
  marketplace: MarketplaceId;
  purchasePrice: Money;
  salePrice: Money;
  fees: Money;
  netProfit: Money;
  roiPercent: number;
  soldAt: string;
  status: SaleStatus;
}
