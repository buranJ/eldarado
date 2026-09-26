import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/db.js';

export const registerOperationsRoutes = (app: FastifyInstance): void => {
  app.get('/api/operations/translation-observations', async (request) => {
    const query = z.object({
      gameId: z.string().min(1).max(100),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    }).parse(request.query ?? {});
    const items = await prisma.translationObservation.findMany({
      where: { gameId: query.gameId },
      orderBy: [{ occurrences: 'desc' }, { lastSeenAt: 'desc' }],
      take: query.limit,
    });
    return {
      items: items.map((item) => ({
        term: item.term,
        occurrences: item.occurrences,
        sampleTitle: item.sampleTitle,
        lastSeenAt: item.lastSeenAt.toISOString(),
      })),
      total: await prisma.translationObservation.count({ where: { gameId: query.gameId } }),
    };
  });
};
