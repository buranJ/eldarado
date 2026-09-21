export type MarketplaceId = string;

export type MarketplaceRole = 'source' | 'destination';

export type MarketplaceConnection = 'connected' | 'demo' | 'not_connected';

/**
 * Both FunPay (source) and Eldorado (destination) are just marketplace
 * records — nothing in the UI is hard-wired to a specific one.
 */
export interface Marketplace {
  id: MarketplaceId;
  name: string;
  roles: MarketplaceRole[];
  connection: MarketplaceConnection;
  /** Marketplace commission applied on sale, 0–1. */
  feeRate: number;
  websiteUrl: string;
  /** Template used to build an external listing link. */
  listingUrlTemplate: string;
  monogram: string;
  tone: 'accent' | 'violet' | 'info' | 'neutral';
}
