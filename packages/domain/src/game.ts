import type { ScoreFactor } from './common';

export type GameId = string;

export type GameStatus = 'active' | 'coming_soon';

/**
 * Games are data-driven: adding a title means adding a config entry plus a
 * game-data schema, not touching the UI.
 */
export interface Game {
  id: GameId;
  name: string;
  /** Short label used in dense table cells and badges. */
  shortName: string;
  status: GameStatus;
  /** Two-letter monogram rendered in the game selector. */
  monogram: string;
  accent: string;
  /** Ordered field descriptors used by the account drawer. */
  scoringModel: GameScoringModel | null;
}

export interface GameScoringModel {
  version: string;
  factors: ScoreFactor[];
}
