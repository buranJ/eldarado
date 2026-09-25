import type { Marketplace, MarketplaceId } from '@gamestock/domain';

export const MARKETPLACES: Marketplace[] = [
  {
    id: 'funpay',
    name: 'FunPay',
    roles: ['source'],
    connection: 'connected',
    feeRate: 0,
    websiteUrl: 'https://funpay.com',
    listingUrlTemplate: 'https://funpay.com/lots/offer?id={id}',
    monogram: 'FP',
    tone: 'accent',
  },
  {
    id: 'eldorado',
    name: 'Eldorado',
    roles: ['destination'],
    connection: 'not_connected',
    feeRate: 0.1,
    websiteUrl: 'https://www.eldorado.gg',
    listingUrlTemplate: 'https://www.eldorado.gg/offer/{id}',
    monogram: 'EL',
    tone: 'violet',
  },
];

export const getMarketplace = (id: MarketplaceId): Marketplace =>
  MARKETPLACES.find((m) => m.id === id) ?? {
    id,
    name: id,
    roles: ['source'],
    connection: 'not_connected',
    feeRate: 0,
    websiteUrl: '#',
    listingUrlTemplate: '#',
    monogram: id.slice(0, 2).toUpperCase(),
    tone: 'neutral',
  };

export const sourceMarketplaces = (): Marketplace[] =>
  MARKETPLACES.filter((m) => m.roles.includes('source'));

export const destinationMarketplaces = (): Marketplace[] =>
  MARKETPLACES.filter((m) => m.roles.includes('destination'));

export const buildListingUrl = (id: MarketplaceId, externalId: string): string =>
  getMarketplace(id).listingUrlTemplate.replace('{id}', externalId);

export const DEFAULT_SOURCE_ID: MarketplaceId = 'funpay';
export const DEFAULT_DESTINATION_ID: MarketplaceId = 'eldorado';
