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
      running: isCollectionRunning(gameId),
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
    const running = startCollection({
      gameId: body.gameId,
      marketplace: body.marketplace,
      pruneMissing: true,
    });
    if (!running) return reply.code(409).send({ error: 'Сбор уже выполняется' });
    void running
      .then((run) => {
        app.log.info(
          { gameId: run.gameId, seen: run.seen, created: run.created },
          'Сбор завершён',
        );
      })
      .catch((error: unknown) => {
        app.log.error({ err: error }, 'Сбор завершился с ошибкой');
      });
    return reply.code(202).send({ started: true });
  });
};
