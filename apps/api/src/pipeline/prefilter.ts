import type { PrefilterVerdict } from '@gamestock/domain';
import type { RawOffer } from '../adapters/source/types.js';
import { convertMinor } from '../config/marketplaces.js';

/** Per-game price ranges from the onboarding brief, in USD. */
const PRICE_RANGES: Record<string, { min?: number; max: number }> = {
  'zenless-zone-zero': { max: 200 },
  'wuthering-waves': { max: 200 },
  'world-of-warcraft': { max: 200 },
  'world-of-tanks': { max: 200 },
  'watcher-of-realms': { max: 200 },
  warframe: { max: 200 },
  wardogs: { max: 200 },
  'afk-journey': { min: 4, max: 200 },
  'albion-online': { min: 4, max: 200 },
  'arc-raiders': { min: 1, max: 100 },
  'arena-breakout': { min: 3, max: 250 },
  'apex-legends': { min: 2, max: 300 },
};

/** Photos are checked after loading the source lot; this gate checks reputation and game rules. */
export const prefilter = (offer: RawOffer, gameId?: string): PrefilterVerdict => {
  const { rating, reviewsCount } = offer.seller;
  const reasons = gameId !== 'warframe' && reviewsCount > 0 && rating !== null && rating < 4
    ? [`рейтинг продавца ${rating}★ ниже 4★ при наличии отзывов`]
    : [];
  const range = gameId ? PRICE_RANGES[gameId] : undefined;
  if (range) {
    const usd = convertMinor(offer.price.minor, offer.price.currency, 'USD') / 100;
    if (range.min !== undefined && usd < range.min) reasons.push(`цена ниже $${range.min}`);
    if (usd > range.max) reasons.push(`цена выше $${range.max}`);
  }
  const gameData = offer.gameData as Record<string, unknown>;
  if (gameId === 'zenless-zone-zero' || gameId === 'wuthering-waves') {
    const region = gameData.region;
    if (typeof region !== 'string' || !/^(?:eu|europe|европа)$/iu.test(region)) {
      reasons.push('нужен регион Европа');
    }
  }
  if (gameId === 'warframe' && gameData.platform !== 'pc') {
    reasons.push('нужна платформа PC');
  }
  return { passed: reasons.length === 0, reasons };
};
