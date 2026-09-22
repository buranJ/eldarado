import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/db.js';
import { analyse } from '../analysis/run.js';
import { readCredentials } from '../lib/credentials.js';

let running: Promise<unknown> | null = null;

export const registerAnalysisRoutes = (app: FastifyInstance): void => {
  app.get('/api/analysis/status', async (request) => {
    const { gameId = 'clash-royale' } = request.query as { gameId?: string };
    const [pending, analysed, needsReview, aggregate] = await Promise.all([
      prisma.listing.count({ where: { gameId, status: 'ready_for_analysis', disappearedAt: null } }),
      prisma.listing.count({
        where: { gameId, status: { in: ['analyzed', 'needs_review'] }, disappearedAt: null },
      }),
      prisma.listing.count({ where: { gameId, status: 'needs_review', disappearedAt: null } }),
      prisma.analysis.aggregate({
        where: { listing: { is: { gameId } } },
        _avg: { dealScore: true, qualityScore: true, riskScore: true },
        _count: { _all: true },
      }),
    ]);

    const credentials = await readCredentials<{ apiKey: string }>(request.user!.id, 'anthropic');
    return {
      configured: credentials !== null,
      running: running !== null,
      pending,
      analysed,
      needsReview,
      total: aggregate._count._all,
      averages: {
        deal: Math.round(aggregate._avg.dealScore ?? 0),
        quality: Math.round(aggregate._avg.qualityScore ?? 0),
        risk: Math.round(aggregate._avg.riskScore ?? 0),
      },
    };
  });

  app.post('/api/analysis/run', async (request, reply) => {
    const credentials = await readCredentials<{ apiKey: string }>(request.user!.id, 'anthropic');
    if (!credentials) {
      return reply
        .code(503)
        .send({ error: 'Добавьте ключ Anthropic в настройках профиля' });
    }
    if (running) return reply.code(409).send({ error: 'Анализ уже выполняется' });

    const body = (request.body ?? {}) as { gameId?: string; limit?: number; force?: boolean };
    running = analyse({
      gameId: body.gameId,
      limit: body.limit ?? 100,
      force: body.force,
      apiKey: credentials.apiKey,
    }).finally(() => {
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
