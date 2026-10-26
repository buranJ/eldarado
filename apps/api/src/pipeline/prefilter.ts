import type { PrefilterVerdict } from '@gamestock/domain';
import type { RawOffer } from '../adapters/source/types.js';

/** Photos are checked after loading the source lot; this gate only checks reputation. */
export const prefilter = (offer: RawOffer): PrefilterVerdict => {
  const { rating, reviewsCount } = offer.seller;
  const reasons = reviewsCount > 0 && rating !== null && rating < 4
    ? [`рейтинг продавца ${rating}★ ниже 4★ при наличии отзывов`]
    : [];
  return { passed: reasons.length === 0, reasons };
};
