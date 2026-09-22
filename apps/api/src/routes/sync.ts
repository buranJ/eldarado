import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/db.js';
import { toDomain } from '../pipeline/collect.js';
import { isCollectionRunning, startCollection } from '../pipeline/sync-runner.js';
import type { SyncScheduler } from '../scheduler.js';

export const registerSyncRoutes = (app: FastifyInstance, scheduler: SyncScheduler): void => {
  app.get('/api/sync/status', async (request) => {
    const { gameId = 'clash-royale' } = request.query as { gameId?: string };
    const last = await prisma.collectionRun.findFirst({
      where: { gameId },
      orderBy: { startedAt: 'desc' },
    });
    return {
      running: isCollectionRunning(),
      lastRun: last ? toDomain(last) : null,
      ...scheduler.status(),
    };
  });

  app.patch('/api/sync/auto', async (request, reply) => {
    const { enabled } = (request.body ?? {}) as { enabled?: unknown };
    if (typeof enabled !== 'boolean') {
      return reply.code(400).send({ error: 'Поле enabled должно быть логическим значением' });
    }
    return scheduler.setEnabled(enabled);
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
    const body = (request.body ?? {}) as { gameId?: string; marketplace?: string };
    if (body.gameId && body.gameId !== 'clash-royale') {
      return reply.code(422).send({ error: 'Парсер источника для этой игры ещё не подключён' });
    }
    const running = startCollection({
      gameId: body.gameId,
      marketplace: body.marketplace,
      pruneMissing: true,
    });
    if (!running) return reply.code(409).send({ error: 'Сбор уже выполняется' });
    try {
      return await running;
    } catch (error) {
      return reply
        .code(502)
        .send({ error: error instanceof Error ? error.message : String(error) });
    }
  });
};
