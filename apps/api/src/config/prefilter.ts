import type { PrefilterConfig } from '@gamestock/domain';

/**
 * Thresholds are deliberately in code (not the database) so changes are
 * reviewable. Every rule here runs on data the category page already gives us,
 * so rejecting a listing costs nothing.
 */
export const PREFILTER: Record<string, PrefilterConfig> = {
  'clash-royale': {
    minSellerRating: 4,
    minSellerReviews: 30,
    minSellerAgeMonths: 12,
    minPrice: 300,
    maxPrice: 8000,
    priceCurrency: 'RUB',
    minTrophies: 6000,
    minCards: 100,
    requireAutoDelivery: false,
  },
};
