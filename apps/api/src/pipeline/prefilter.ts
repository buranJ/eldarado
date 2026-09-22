import type { PrefilterConfig, PrefilterVerdict } from '@gamestock/domain';
import type { RawOffer } from '../adapters/source/types.js';
import { checkSanity } from '../config/sanity.js';

/**
 * Rule gate that runs before any AI call. Reasons are accumulated rather than
 * short-circuited so the operator can see every problem with a listing at once.
 */
export const prefilter = (
  offer: RawOffer,
  config: PrefilterConfig,
  gameId: string,
): PrefilterVerdict => {
  const reasons: string[] = [];
  const { seller, gameData } = offer;

  // Implausible attributes mean the listing cannot be trusted as data at all.
  for (const violation of checkSanity(gameId, gameData).violations) {
    reasons.push(`недостоверная характеристика — ${violation}`);
  }

  if (seller.rating === null) {
    if (!config.allowUnknownSellerRating) reasons.push('у продавца нет рейтинга');
  } else if (seller.rating < config.minSellerRating) {
    reasons.push(`рейтинг продавца ${seller.rating}★ < ${config.minSellerRating}★`);
  }

  if (seller.reviewsCount < config.minSellerReviews) {
    reasons.push(`отзывов ${seller.reviewsCount} < ${config.minSellerReviews}`);
  }

  if (seller.accountAgeMonths === null) {
    if (!config.allowUnknownSellerAge) reasons.push('неизвестен возраст аккаунта продавца');
  } else if (seller.accountAgeMonths < config.minSellerAgeMonths) {
    reasons.push(
      `продавец на площадке ${seller.accountAgeMonths} мес. < ${config.minSellerAgeMonths} мес.`,
    );
  }

  const price = offer.price.minor / 100;
  if (offer.price.currency !== config.priceCurrency) {
    reasons.push(`валюта ${offer.price.currency} не совпадает с ${config.priceCurrency}`);
  } else if (price < config.minPrice) {
    reasons.push(`цена ${price.toFixed(0)} < ${config.minPrice}`);
  } else if (price > config.maxPrice) {
    reasons.push(`цена ${price.toFixed(0)} > ${config.maxPrice}`);
  }

  const trophies = gameData.trophies as number | null;
  if (trophies === null || trophies === undefined) {
    reasons.push('не указаны кубки');
  } else if (trophies < config.minTrophies) {
    reasons.push(`кубков ${trophies} < ${config.minTrophies}`);
  }

  const cards = gameData.unlockedCards as number | null;
  if (cards === null || cards === undefined) {
    reasons.push('не указано число карт');
  } else if (cards < config.minCards) {
    reasons.push(`карт ${cards} < ${config.minCards}`);
  }

  if (config.requireAutoDelivery && !offer.autoDelivery) {
    reasons.push('нет автовыдачи');
  }

  return { passed: reasons.length === 0, reasons };
};
