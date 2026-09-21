import { hoursAgo } from '@/utils/date';
import type { AIRun } from '@gamestock/domain';

export const AI_RUNS_FIXTURE: AIRun[] = [
  { id: 'AIR-7301', accountId: 'CR-2041', gameId: 'clash-royale', title: 'Clash Royale | 7420 кубков | 9 EVO', qualityScore: 82, dealScore: 94, riskScore: 22, confidence: 93, result: 'ok', at: hoursAgo(5) },
  { id: 'AIR-7300', accountId: 'CR-2050', gameId: 'clash-royale', title: 'Clash Royale | 7650 кубков | 8 EVO', qualityScore: 76, dealScore: 89, riskScore: 19, confidence: 94, result: 'ok', at: hoursAgo(3) },
  { id: 'AIR-7299', accountId: 'CR-2046', gameId: 'clash-royale', title: 'Clash Royale | 8940 кубков | 16 EVO', qualityScore: 86, dealScore: 85, riskScore: 24, confidence: 92, result: 'ok', at: hoursAgo(8) },
  { id: 'AIR-7298', accountId: 'CR-2055', gameId: 'clash-royale', title: 'Clash Royale | 6020 кубков | 5 EVO', qualityScore: 58, dealScore: 62, riskScore: 51, confidence: 63, result: 'needs_review', at: hoursAgo(28) },
  { id: 'AIR-7297', accountId: 'CR-2044', gameId: 'clash-royale', title: 'Clash Royale | 6180 кубков | 4 EVO', qualityScore: 61, dealScore: 38, riskScore: 88, confidence: 48, result: 'needs_review', at: hoursAgo(30) },
  { id: 'AIR-7296', accountId: 'CR-2057', gameId: 'clash-royale', title: 'Clash Royale | 9820 кубков | 19 EVO', qualityScore: 98, dealScore: 49, riskScore: 21, confidence: 95, result: 'ok', at: hoursAgo(20) },
  { id: 'AIR-7295', accountId: 'CR-2054', gameId: 'clash-royale', title: 'Clash Royale | 9410 кубков | 14 EVO', qualityScore: 92, dealScore: 68, riskScore: 37, confidence: 88, result: 'ok', at: hoursAgo(17) },
  { id: 'AIR-7294', accountId: 'CR-2043', gameId: 'clash-royale', title: 'Clash Royale | 9120 кубков | 13 EVO', qualityScore: 88, dealScore: 47, riskScore: 71, confidence: 74, result: 'needs_review', at: hoursAgo(26) },
  { id: 'AIR-7293', accountId: 'CR-2062', gameId: 'clash-royale', title: 'Clash Royale | 8830 кубков | 12 EVO', qualityScore: 83, dealScore: 52, riskScore: 58, confidence: 77, result: 'ok', at: hoursAgo(38) },
  { id: 'AIR-7292', accountId: 'CR-2049', gameId: 'clash-royale', title: 'Clash Royale | 4380 кубков | 2 EVO', qualityScore: 38, dealScore: 44, riskScore: 42, confidence: 82, result: 'ok', at: hoursAgo(25) },
  { id: 'AIR-7291', accountId: 'CR-2047', gameId: 'clash-royale', title: 'Clash Royale | 9310 кубков | 12 EVO', qualityScore: 89, dealScore: 72, riskScore: 31, confidence: 89, result: 'ok', at: hoursAgo(13) },
  { id: 'AIR-7290', accountId: 'CR-2072', gameId: 'clash-royale', title: 'Clash Royale | 8210 кубков | 11 EVO', qualityScore: 0, dealScore: 0, riskScore: 0, confidence: 0, result: 'failed', at: hoursAgo(34) },
];

/** Aggregated counters for the AI dashboard header. */
export const AI_STATS = {
  processed: 1284,
  recognized: 1196,
  needsReview: 61,
  failed: 27,
};
