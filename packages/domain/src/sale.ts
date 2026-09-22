import type { Money } from './common';
import type { GameId } from './game';
import type { MarketplaceId } from './marketplace';

export type SaleStatus = 'completed' | 'pending_payout' | 'canceled' | 'refunded' | 'disputed';

export interface Sale {
  id: string;
  listingId: string | null;
  accountId: string;
  gameId: GameId;
  title: string;
  marketplace: MarketplaceId;
  /** Unknown for historical orders that were created outside GameStock. */
  purchasePrice: Money | null;
  salePrice: Money;
  /** Available only when the order can be matched to a local listing. */
  fees: Money | null;
  netProfit: Money | null;
  roiPercent: number | null;
  soldAt: string;
  status: SaleStatus;
  url?: string | null;
}
