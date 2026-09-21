import type { Attributes } from './quality.js';

export interface RiskInput {
  attrs: Attributes;
  /** Attributes the source itself published, used to catch contradictions. */
  sourceAttrs: Record<string, number | boolean | null>;
  seller: {
    rating: number | null;
    reviewsCount: number;
    accountAgeMonths: number | null;
  };
  autoDelivery: boolean;
  dataQuality: number;
  extractionConfidence: number;
  /** Corpus fair price ÷ asking price. Much greater than 1 is a warning, not a win. */
  priceRatio: number | null;
  sanityViolations: string[];
}

export interface RiskResult {
  score: number;
  reasons: string[];
}

/** Numeric claims worth cross-checking between the title and source attributes. */
const CROSS_CHECKS: { key: string; label: string; tolerance: number }[] = [
  { key: 'trophies', label: 'кубки', tolerance: 0.15 },
  { key: 'unlockedCards', label: 'карты', tolerance: 0.1 },
];

/**
 * 0–100, higher means riskier. Each signal adds points, so a listing that is
 * merely thin on data lands mid-range while one that is thin *and* sold by a
 * fresh account with no rebind lands high.
 */
export const scoreRisk = (input: RiskInput): RiskResult => {
  const reasons: string[] = [];
  let score = 10; // Baseline: every third-party account transfer carries some risk.

  const add = (points: number, reason: string): void => {
    score += points;
    reasons.push(reason);
  };

  const flag = (key: string): boolean | null => {
    const value = input.attrs[key];
    return typeof value === 'boolean' ? value : null;
  };

  if (flag('fullAccess') === false) add(22, 'нет полного доступа к аккаунту');
  else if (flag('fullAccess') === null) add(8, 'не указано, есть ли полный доступ');

  if (flag('rebindAvailable') === false) add(20, 'перепривязка недоступна');
  else if (flag('rebindAvailable') === null) add(7, 'не указано, возможна ли перепривязка');

  if (flag('emailAccess') === false) add(10, 'нет доступа к почте');

  const restrictions = input.attrs.restrictions;
  if (typeof restrictions === 'string' && restrictions.trim() !== '') {
    add(12, `заявлены ограничения: ${restrictions}`);
  }

  if (input.seller.rating === null) add(14, 'у продавца нет отзывов');
  else if (input.seller.rating <= 3) add(20, `низкий рейтинг продавца: ${input.seller.rating}★`);
  else if (input.seller.rating === 4) add(6, 'рейтинг продавца 4★');

  if (input.seller.reviewsCount < 10) add(10, `мало отзывов: ${input.seller.reviewsCount}`);
  if ((input.seller.accountAgeMonths ?? 0) < 6) add(12, 'продавец на площадке меньше полугода');

  if (!input.autoDelivery) add(5, 'нет автовыдачи — передача вручную');

  if (input.dataQuality < 40) add(16, `мало данных об аккаунте: ${input.dataQuality}%`);
  else if (input.dataQuality < 60) add(8, `неполные данные об аккаунте: ${input.dataQuality}%`);

  if (input.extractionConfidence < 60) {
    add(10, `низкая достоверность разбора заголовка: ${input.extractionConfidence}%`);
  }

  // A price far below comparable accounts is more often a trap than a bargain.
  if (input.priceRatio !== null && input.priceRatio >= 6) {
    add(38, `цена в ${input.priceRatio.toFixed(1)} раза ниже сопоставимых — так не продают`);
  } else if (input.priceRatio !== null && input.priceRatio >= 4) {
    add(24, `цена в ${input.priceRatio.toFixed(1)} раза ниже сопоставимых — подозрительно`);
  } else if (input.priceRatio !== null && input.priceRatio >= 2.5) {
    add(10, `цена заметно ниже сопоставимых (x${input.priceRatio.toFixed(1)})`);
  }

  for (const violation of input.sanityViolations) {
    add(15, `недостоверная характеристика — ${violation}`);
  }

  // Contradictions between what the seller writes and what the source publishes.
  for (const check of CROSS_CHECKS) {
    const claimed = input.attrs[check.key];
    const published = input.sourceAttrs[check.key];
    if (typeof claimed !== 'number' || typeof published !== 'number' || published === 0) continue;
    const drift = Math.abs(claimed - published) / published;
    if (drift > check.tolerance) {
      add(
        14,
        `противоречие в данных: в заголовке ${check.label} ${claimed}, в атрибутах площадки ${published}`,
      );
    }
  }

  return { score: Math.max(0, Math.min(100, Math.round(score))), reasons };
};
