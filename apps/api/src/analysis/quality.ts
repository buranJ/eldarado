import type { ScoreFactor } from '@gamestock/domain';
import { CR_RANGES } from '../config/scoring-reference.js';
import { getGameScoringModel } from '../config/games.js';

export type Attributes = Record<string, number | boolean | string | null | undefined>;

const clamp = (value: number, min = 0, max = 100): number =>
  Math.max(min, Math.min(max, value));

/** Maps a raw attribute onto 0–100 using its reference range. */
const normalise = (key: string, value: number | null | undefined): number | null => {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  const range = CR_RANGES[key];
  if (!range) return null;
  return clamp(((value - range.min) / (range.max - range.min)) * 100);
};

const num = (attrs: Attributes, key: string): number | null => {
  const value = attrs[key];
  return typeof value === 'number' ? value : null;
};

const bool = (attrs: Attributes, key: string): boolean | null => {
  const value = attrs[key];
  return typeof value === 'boolean' ? value : null;
};

/** Contribution of one attribute to a factor, or null when it is unknown. */
interface Part {
  key: string;
  score: number | null;
  weight: number;
}

const combine = (parts: Part[]): { score: number; known: number; total: number } => {
  let sum = 0;
  let weight = 0;
  let known = 0;
  for (const part of parts) {
    if (part.score === null) continue;
    sum += part.score * part.weight;
    weight += part.weight;
    known += 1;
  }
  return {
    score: weight === 0 ? 0 : Math.round(sum / weight),
    known,
    total: parts.length,
  };
};

/** Transfer terms are scored from how safely the account can change hands. */
const transferParts = (attrs: Attributes): Part[] => {
  const flag = (key: string, weight: number, invert = false): Part => {
    const value = bool(attrs, key);
    return {
      key,
      weight,
      score: value === null ? null : (invert ? !value : value) ? 100 : 0,
    };
  };
  const restrictions = attrs.restrictions;
  return [
    flag('fullAccess', 3),
    flag('emailAccess', 2),
    flag('rebindAvailable', 3),
    flag('originalEmail', 1),
    {
      key: 'restrictions',
      weight: 1,
      score:
        restrictions === null || restrictions === undefined
          ? null
          : typeof restrictions === 'string' && restrictions.trim() !== ''
            ? 0
            : 100,
    },
  ];
};

export interface QualityResult {
  score: number;
  factors: ScoreFactor[];
  /** Share of scoring inputs that were actually known, 0–100. */
  dataQuality: number;
}

/**
 * Quality of the account as a product, independent of its price. Unknown
 * attributes are excluded rather than treated as zero — a listing that simply
 * says less should not score as if it were worse, that is what `dataQuality`
 * is for.
 */
export const scoreQuality = (gameId: string, attrs: Attributes): QualityResult => {
  const model = getGameScoringModel(gameId);

  const groups: Record<string, Part[]> = {
    progression: [
      { key: 'collectionLevel', weight: 2, score: normalise('collectionLevel', num(attrs, 'collectionLevel')) },
      { key: 'kingTowerLevel', weight: 2, score: normalise('kingTowerLevel', num(attrs, 'kingTowerLevel')) },
      { key: 'level16Cards', weight: 2, score: normalise('level16Cards', num(attrs, 'level16Cards')) },
      { key: 'level15Cards', weight: 1.5, score: normalise('level15Cards', num(attrs, 'level15Cards')) },
      { key: 'level14Cards', weight: 1, score: normalise('level14Cards', num(attrs, 'level14Cards')) },
      { key: 'unlockedCards', weight: 1.5, score: normalise('unlockedCards', num(attrs, 'unlockedCards')) },
      { key: 'evolutions', weight: 3, score: normalise('evolutions', num(attrs, 'evolutions')) },
      { key: 'heroes', weight: 2, score: normalise('heroes', num(attrs, 'heroes')) },
    ],
    competitive: [
      { key: 'trophies', weight: 3, score: normalise('trophies', num(attrs, 'trophies')) },
      { key: 'highestTrophies', weight: 2, score: normalise('highestTrophies', num(attrs, 'highestTrophies')) },
      { key: 'legendaryCards', weight: 1, score: normalise('legendaryCards', num(attrs, 'legendaryCards')) },
    ],
    collectibles: [
      { key: 'accountAgeYears', weight: 3, score: normalise('accountAgeYears', num(attrs, 'accountAgeYears')) },
      { key: 'rareEmotes', weight: 2, score: normalise('rareEmotes', num(attrs, 'rareEmotes')) },
      { key: 'emotes', weight: 1, score: normalise('emotes', num(attrs, 'emotes')) },
      { key: 'towerSkins', weight: 2, score: normalise('towerSkins', num(attrs, 'towerSkins')) },
      { key: 'banners', weight: 1, score: normalise('banners', num(attrs, 'banners')) },
    ],
    resources: [
      { key: 'gems', weight: 2, score: normalise('gems', num(attrs, 'gems')) },
      { key: 'gold', weight: 1, score: normalise('gold', num(attrs, 'gold')) },
    ],
    transfer: transferParts(attrs),
  };

  const factors: ScoreFactor[] = [];
  let weightedSum = 0;
  let usedWeight = 0;
  let knownParts = 0;
  let totalParts = 0;

  for (const definition of model.factors) {
    const parts = groups[definition.key] ?? [];
    const { score, known, total } = combine(parts);
    knownParts += known;
    totalParts += total;

    factors.push({
      key: definition.key,
      label: definition.label,
      weight: definition.weight,
      score,
      inputs: parts.filter((part) => part.score !== null).map((part) => part.key),
    });

    // A factor with nothing known contributes no weight instead of dragging to zero.
    if (known > 0) {
      weightedSum += score * definition.weight;
      usedWeight += definition.weight;
    }
  }

  return {
    score: usedWeight === 0 ? 0 : Math.round(weightedSum / usedWeight),
    factors,
    dataQuality: totalParts === 0 ? 0 : Math.round((knownParts / totalParts) * 100),
  };
};
