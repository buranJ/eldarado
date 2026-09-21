/**
 * Fair-price model derived from the corpus itself — no external price source.
 *
 * For a given listing we find the most similar accounts by the attributes the
 * source publishes for everyone (trophies, cards, legendaries, arena, level)
 * and take the median of their prices. k-nearest-neighbours is used rather than
 * a fitted curve because the price surface is lumpy and the median is immune to
 * the junk listings the source lets sellers post.
 */

export interface MarketPoint {
  priceMinor: number;
  trophies: number | null;
  unlockedCards: number | null;
  legendaryCards: number | null;
  arena: number | null;
  accountLevel: number | null;
}

/** Weights reflect how strongly each attribute drives price in this market. */
const FEATURES: { key: keyof Omit<MarketPoint, 'priceMinor'>; weight: number }[] = [
  { key: 'trophies', weight: 1.0 },
  { key: 'unlockedCards', weight: 0.8 },
  { key: 'legendaryCards', weight: 0.6 },
  { key: 'arena', weight: 0.4 },
  /*
   * `accountLevel` is excluded on purpose: in the corpus it is bimodal
   * (medians around 53 and around 1756), so it mixes two different quantities
   * and only adds noise to the distance metric.
   */
];

const NEIGHBOURS = 25;

interface Normaliser {
  min: number;
  max: number;
}

export interface MarketModel {
  size: number;
  fairPrice: (point: Omit<MarketPoint, 'priceMinor'>) => number | null;
  /** Median price of the whole corpus — fallback when a listing has no usable attributes. */
  medianPrice: number;
}

const median = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
    : sorted[middle];
};

const normalise = (value: number, scale: Normaliser): number =>
  scale.max === scale.min ? 0 : (value - scale.min) / (scale.max - scale.min);

/**
 * Builds the model from listings that survived the sanity check. Outliers in
 * price are trimmed so a single 200 000 ₽ listing cannot drag a neighbourhood.
 */
export const buildMarketModel = (corpus: MarketPoint[]): MarketModel => {
  const prices = corpus.map((point) => point.priceMinor).sort((a, b) => a - b);
  const p05 = prices[Math.floor(prices.length * 0.05)] ?? 0;
  const p95 = prices[Math.floor(prices.length * 0.95)] ?? Number.MAX_SAFE_INTEGER;
  const trimmed = corpus.filter(
    (point) => point.priceMinor >= p05 && point.priceMinor <= p95,
  );

  const scales = new Map<string, Normaliser>();
  for (const { key } of FEATURES) {
    const values = trimmed
      .map((point) => point[key])
      .filter((value): value is number => value !== null);
    scales.set(key, {
      min: values.length ? Math.min(...values) : 0,
      max: values.length ? Math.max(...values) : 1,
    });
  }

  const corpusMedian = median(trimmed.map((point) => point.priceMinor));

  const fairPrice = (target: Omit<MarketPoint, 'priceMinor'>): number | null => {
    const known = FEATURES.filter(({ key }) => target[key] !== null);
    if (known.length === 0) return null;

    const scored: { distance: number; priceMinor: number }[] = [];
    for (const point of trimmed) {
      let sum = 0;
      let weightSum = 0;
      for (const { key, weight } of known) {
        const a = target[key];
        const b = point[key];
        if (a === null || b === null) continue;
        const scale = scales.get(key)!;
        const delta = normalise(a, scale) - normalise(b, scale);
        sum += weight * delta * delta;
        weightSum += weight;
      }
      // Require at least half the known attributes to overlap to be comparable.
      if (weightSum < 0.5) continue;
      scored.push({ distance: Math.sqrt(sum / weightSum), priceMinor: point.priceMinor });
    }

    if (scored.length === 0) return null;
    scored.sort((a, b) => a.distance - b.distance);
    return median(scored.slice(0, NEIGHBOURS).map((entry) => entry.priceMinor));
  };

  return { size: trimmed.length, fairPrice, medianPrice: corpusMedian };
};
