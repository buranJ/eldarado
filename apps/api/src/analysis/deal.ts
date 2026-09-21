import { DESTINATION_FEE_RATE, RESALE_MARKUP } from '../config/scoring-reference.js';

export interface DealInput {
  /** Account quality as a product, 0–100. */
  qualityScore: number;
  riskScore: number;
  /** Asking price on the source, minor units. */
  priceMinor: number;
  /**
   * Corpus median for accounts with comparable published attributes, minor
   * units. Null when the listing has nothing comparable.
   */
  fairPriceMinor: number | null;
  /** Median price of the whole corpus, used as a weak fallback. */
  corpusMedianMinor: number;
  dataQuality: number;
}

export interface DealResult {
  score: number;
  /** Fair value after accounting for quality the source attributes cannot see. */
  adjustedFairMinor: number;
  resalePriceMinor: number;
  expectedProfitMinor: number;
  marginPercent: number;
  notes: string[];
}

const clamp = (value: number, min = 0, max = 100): number =>
  Math.max(min, Math.min(max, value));

/**
 * Deal Score answers one question: how much value are we getting per rouble
 * spent, relative to what comparable accounts cost.
 *
 * The fair price from the corpus only knows the attributes the source
 * publishes, so it systematically undervalues accounts whose worth sits in
 * collectibles and progression the marketplace does not expose. That gap is
 * corrected by the quality score before the comparison is made.
 *
 * A high quality score never carries a deal on its own — an excellent account
 * at an excellent price is what scores well.
 */
export const scoreDeal = (input: DealInput): DealResult => {
  const notes: string[] = [];
  const base = input.fairPriceMinor ?? input.corpusMedianMinor;
  if (input.fairPriceMinor === null) {
    notes.push('нет сопоставимых объявлений — оценка по медиане рынка');
  }

  /*
   * Quality lifts or lowers the fair price by up to ±40%. Quality 50 is the
   * neutral point, matching an average account in the corpus.
   */
  const qualityAdjustment = 1 + ((input.qualityScore - 50) / 50) * 0.4;
  const adjustedFairMinor = Math.round(base * qualityAdjustment);

  const ratio = adjustedFairMinor / Math.max(1, input.priceMinor);

  /*
   * Map the value ratio onto 0–100. Parity (ratio 1) sits at 50; twice the
   * value for the money reaches the low 80s; anything past 3x saturates,
   * because beyond that the number says more about a suspicious listing than
   * about profit.
   */
  const logRatio = Math.log2(Math.max(0.05, ratio));
  // Gentler slope below parity so overpriced listings still rank against each other.
  const valueScore = clamp(50 + logRatio * (logRatio >= 0 ? 32 : 20));

  // Risk is a discount on the deal, not a separate verdict.
  const riskPenalty = (input.riskScore / 100) * 30;
  // Thin data means the value estimate itself is shaky.
  const confidencePenalty =
    input.dataQuality >= 60 ? 0 : ((60 - input.dataQuality) / 60) * 28;

  const score = Math.round(clamp(valueScore - riskPenalty - confidencePenalty));

  // Resale prices are quoted in whole currency units — kopecks read as noise.
  const resalePriceMinor = Math.round((adjustedFairMinor * RESALE_MARKUP) / 100) * 100;
  const expectedProfitMinor = Math.round(
    resalePriceMinor * (1 - DESTINATION_FEE_RATE) - input.priceMinor,
  );
  const marginPercent =
    Math.round((expectedProfitMinor / Math.max(1, input.priceMinor)) * 1000) / 10;

  if (ratio >= 2) notes.push(`оценка выше цены в ${ratio.toFixed(1)} раза`);
  if (input.riskScore >= 60) notes.push('высокий риск заметно снижает итоговую оценку');

  return {
    score,
    adjustedFairMinor,
    resalePriceMinor,
    expectedProfitMinor,
    marginPercent,
    notes,
  };
};
