/** Filter state and predicate for the raw source-marketplace feed. */

/**
 * Pipeline stage of a listing. When scoring is available this gains
 * 'analyzed' / 'needs_review' without changing the filter's shape.
 */
export type PipelineFilter = 'all' | 'ready_for_analysis' | 'prefiltered_out';

export interface MarketplaceFilterState {
  search: string;
  marketplace: string;
  priceMin: string;
  priceMax: string;
  sellerRatingMin: string;
  autoDeliveryOnly: boolean;
  pipeline: PipelineFilter;
}

export const EMPTY_FILTERS: MarketplaceFilterState = {
  search: '',
  marketplace: 'all',
  priceMin: '',
  priceMax: '',
  sellerRatingMin: 'all',
  autoDeliveryOnly: false,
  pipeline: 'all',
};

export const isFiltersDirty = (filters: MarketplaceFilterState): boolean =>
  JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);

const num = (value: string | undefined): number | undefined => {
  if (!value || value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

/** Maps the filter panel onto the API query. Filtering itself happens server-side. */
export const toListingQuery = (filters: MarketplaceFilterState) => ({
  marketplace: filters.marketplace === 'all' ? undefined : filters.marketplace,
  status: filters.pipeline === 'all' ? undefined : filters.pipeline,
  search: filters.search?.trim() || undefined,
  priceMin: num(filters.priceMin),
  priceMax: num(filters.priceMax),
  sellerRatingMin:
    filters.sellerRatingMin === 'all' ? undefined : Number(filters.sellerRatingMin),
  autoDelivery: filters.autoDeliveryOnly ? true : undefined,
});
