/**
 * Reference ranges used to normalise raw attributes onto 0–100 before they are
 * weighted into a score. Values are tuned against the live corpus and should be
 * revisited when the game shifts (new arenas, new card levels).
 */
export interface Range {
  min: number;
  max: number;
}

/*
 * Calibrated against the live corpus (2000 listings, 28.08.2026) so that a
 * median account lands near 50 rather than near the middle of a theoretical
 * maximum. Corpus percentiles: кубки p50 8746 / p95 14000; карты p50 121;
 * легендарные p50 21 / p95 27.
 *
 * `accountLevel` is deliberately absent: the source attribute is bimodal
 * (p50 53, p95 1756), so it mixes two different in-game quantities and cannot
 * be scored until its meaning is confirmed. See docs/SOURCES.md.
 */
export const CR_RANGES: Record<string, Range> = {
  collectionLevel: { min: 20, max: 75 },
  kingTowerLevel: { min: 9, max: 15 },
  unlockedCards: { min: 80, max: 124 },
  level16Cards: { min: 0, max: 25 },
  level15Cards: { min: 0, max: 45 },
  level14Cards: { min: 0, max: 50 },
  evolutions: { min: 0, max: 20 },
  heroes: { min: 0, max: 8 },
  trophies: { min: 3500, max: 13_500 },
  highestTrophies: { min: 3500, max: 14_500 },
  accountAgeYears: { min: 0, max: 9 },
  rareEmotes: { min: 0, max: 25 },
  emotes: { min: 0, max: 120 },
  towerSkins: { min: 0, max: 12 },
  banners: { min: 0, max: 40 },
  gems: { min: 0, max: 12_000 },
  gold: { min: 0, max: 1_500_000 },
  legendaryCards: { min: 8, max: 27 },
};

/** Marketplace commission applied when estimating resale profit. */
export const DESTINATION_FEE_RATE = 0.1;

/** Target markup over the fair price when recommending a resale price. */
export const RESALE_MARKUP = 1.15;
