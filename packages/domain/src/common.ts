/** Shared primitives used across the whole domain model. */

export type CurrencyCode = 'USD' | 'EUR' | 'RUB';

export interface Money {
  amount: number;
  currency: CurrencyCode;
}

/** 0–100 score produced by the analysis pipeline. */
export type Score = number;

export interface ScoreFactor {
  key: string;
  label: string;
  /** Share of the parent score, 0–1. */
  weight: number;
  /** Factor score, 0–100. */
  score: Score;
  inputs: string[];
}

export type Trend = 'up' | 'down' | 'flat';
