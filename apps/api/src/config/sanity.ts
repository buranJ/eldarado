/**
 * Source marketplaces do not validate the attributes sellers type into their
 * filter fields — the live corpus contains `-1` cards, `8216` cards and arena
 * `100`. Values outside these ranges are treated as unreliable rather than
 * silently trusted, and never reach the AI stage as facts.
 */
export interface SanityRange {
  min: number;
  max: number;
  label: string;
}

export const SANITY: Record<string, Record<string, SanityRange>> = {
  'clash-royale': {
    arena: { min: 1, max: 36, label: 'арена' },
    trophies: { min: 0, max: 25_000, label: 'кубки' },
    unlockedCards: { min: 0, max: 250, label: 'карты' },
    legendaryCards: { min: 0, max: 250, label: 'легендарные карты' },
    accountLevel: { min: 0, max: 10_000, label: 'уровень' },
  },
  'pubg-mobile': {
    accountLevel: { min: 1, max: 100, label: 'уровень аккаунта' },
  },
  'arknights-endfield': {
    accountLevel: { min: 1, max: 60, label: 'уровень аккаунта' },
    researchLevel: { min: 1, max: 7, label: 'уровень исследования' },
  },
  'standoff-2': {
    accountLevel: { min: 1, max: 1_000, label: 'уровень аккаунта' },
    playtimeHours: { min: 0, max: 50_000, label: 'часы игры' },
  },
};

export interface SanityResult {
  /** Values that fell outside their plausible range, with the offending number. */
  violations: string[];
}

export const checkSanity = (
  gameId: string,
  gameData: Record<string, unknown>,
): SanityResult => {
  const ranges = SANITY[gameId];
  if (!ranges) return { violations: [] };

  const violations: string[] = [];
  for (const [field, range] of Object.entries(ranges)) {
    const value = gameData[field];
    if (typeof value !== 'number') continue;
    if (value < range.min || value > range.max) {
      violations.push(`${range.label}: ${value} вне диапазона ${range.min}–${range.max}`);
    }
  }
  return { violations };
};
