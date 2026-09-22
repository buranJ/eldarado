import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/db.js';

export const registerOverviewRoutes = (app: FastifyInstance): void => {
  /** Funnel over the current cohort — every stage derives from the same listings. */
  app.get('/api/overview', async (request) => {
    const { gameId = 'clash-royale' } = request.query as { gameId?: string };
    const live = { gameId, disappearedAt: null };
    const dayAgo = new Date(Date.now() - 24 * 3_600_000);

    const [collected, foundToday, analysed, approved, purchased, listed, sold, avgDeal] =
      await Promise.all([
        prisma.listing.count({ where: live }),
        prisma.listing.count({ where: { ...live, firstSeenAt: { gte: dayAgo } } }),
        prisma.listing.count({
          where: { ...live, status: { in: ['analyzed', 'needs_review', 'approved', 'purchased'] } },
        }),
        prisma.listing.count({ where: { ...live, status: { in: ['approved', 'purchased'] } } }),
        prisma.inventoryItem.count({ where: { gameId } }),
        prisma.inventoryItem.count({ where: { gameId, status: { in: ['listed', 'reserved', 'sold'] } } }),
        prisma.inventoryItem.count({ where: { gameId, status: 'sold' } }),
        prisma.analysis.aggregate({
          where: { listing: { is: { gameId } } },
          _avg: { dealScore: true },
        }),
      ]);

    return {
      gameId,
      kpi: { foundToday, analysed, approved, purchased, listed, sold },
      pipeline: {
        collected,
        analyzed: analysed,
        top: analysed,
        approved,
        purchased,
        published: listed,
        sold,
      },
      averageDealScore: Math.round(avgDeal._avg.dealScore ?? 0),
    };
  });

  app.get('/api/activity', async (request) => {
    const { gameId = 'clash-royale', limit = '15' } = request.query as Record<string, string>;
    const events = await prisma.activityEvent.findMany({
      where: { gameId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(limit) || 15, 100),
    });
    return events.map((event) => ({
      id: event.id,
      kind: event.kind,
      title: event.title,
      subject: event.subject,
      meta: event.meta,
      at: event.createdAt.toISOString(),
      actor: event.actor,
    }));
  });
};
