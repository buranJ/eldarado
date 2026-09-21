import type { Score } from './common';
import type { GameId } from './game';

export type AIRunResult = 'ok' | 'needs_review' | 'failed';

/** One row of the AI analysis log. */
export interface AIRun {
  id: string;
  accountId: string;
  gameId: GameId;
  title: string;
  qualityScore: Score;
  dealScore: Score;
  riskScore: Score;
  confidence: Score;
  result: AIRunResult;
  at: string;
}
