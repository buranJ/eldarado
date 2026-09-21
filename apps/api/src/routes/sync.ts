import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/db.js';
import { collect, toDomain } from '../pipeline/collect.js';

let running: Promise<unknown> | null = null;

export const registerSyncRoutes = (app: FastifyInstance): void => {
  app.get('/api/sync/status', async (request) => {
    const { gameId = 'clash-royale' } = request.query as { gameId?: string };
    const last = await prisma.collectionRun.findFirst({
      where: { gameId },
      orderBy: { startedAt: 'desc' },
    });
    return {
      running: running !== null,
      lastRun: last ? toDomain(last) : null,
    };
  });

  app.get('/api/sync/runs', async (request) => {
    const { gameId = 'clash-royale', limit = '20' } = request.query as Record<string, string>;
    const runs = await prisma.collectionRun.findMany({
      where: { gameId },
      orderBy: { startedAt: 'desc' },
      take: Math.min(Number(limit) || 20, 100),
    });
    return runs.map(toDomain);
  });

  app.post('/api/sync/run', async (request, reply) => {
    if (running) return reply.code(409).send({ error: 'Сбор уже выполняется' });
    const body = (request.body ?? {}) as { gameId?: string; marketplace?: string };
    running = collect({ gameId: body.gameId, marketplace: body.marketplace }).finally(() => {
      running = null;
    });
    try {
      return await running;
    } catch (error) {
      return reply
        .code(502)
        .send({ error: error instanceof Error ? error.message : String(error) });
    }
  });
};
