import type { RawOffer } from '../adapters/source/types.js';
import { prisma } from '../lib/db.js';
import { findUntranslatedGameTerms } from './games.js';

/** Aggregates unknown game terms once per collection run to keep write volume bounded. */
export const recordTranslationObservations = async (
  gameId: string,
  offers: readonly RawOffer[],
): Promise<void> => {
  const samples = new Map<string, { sampleTitle: string; count: number }>();
  for (const offer of offers) {
    for (const term of findUntranslatedGameTerms(gameId, offer.sellerTitle)) {
      const current = samples.get(term);
      samples.set(term, {
        sampleTitle: current?.sampleTitle ?? offer.sellerTitle.slice(0, 500),
        count: (current?.count ?? 0) + 1,
      });
    }
  }
  await prisma.$transaction(
    [...samples].map(([term, observation]) =>
      prisma.translationObservation.upsert({
        where: { gameId_term: { gameId, term } },
        create: {
          gameId,
          term,
          sampleTitle: observation.sampleTitle,
          occurrences: observation.count,
        },
        update: {
          sampleTitle: observation.sampleTitle,
          occurrences: { increment: observation.count },
        },
      }),
    ),
  );
};
