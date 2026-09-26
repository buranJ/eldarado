import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/db.js';
import { toDomain } from '../pipeline/collect.js';
import { enqueueCollection, isCollectionRunning } from '../pipeline/sync-runner.js';
import type { SyncScheduler } from '../scheduler.js';

export const registerSyncRoutes = (app: FastifyInstance, scheduler: SyncScheduler): void => {
  app.get('/api/sync/status', async (request) => {
    const { gameId = 'clash-royale' } = request.query as { gameId?: string };
    const last = await prisma.collectionRun.findFirst({
      // A newly started run initially contains zero counters. Returning it as
      // the "last run" made the UI briefly show values such as "191 of 0".
      // Running state is exposed separately through isCollectionRunning().
      where: { gameId, status: { not: 'running' } },
      orderBy: { startedAt: 'desc' },
    });
    return {
      running: await isCollectionRunning(gameId),
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
    const job = await enqueueCollection({
      gameId: body.gameId,
      marketplace: body.marketplace,
      pruneMissing: true,
    });
    if (!job) return reply.code(409).send({ error: 'Сбор уже выполняется или ожидает запуска' });
    return reply.code(202).send({ started: true, jobId: job.id });
  });
};
