import { access } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { toApiAccount } from '../pipeline/present.js';
import { sourceImagePath } from '../lib/source-images.js';

const querySchema = z.object({
  gameId: z.string().default('clash-royale'),
  marketplace: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
  priceMin: z.coerce.number().optional(),
  priceMax: z.coerce.number().optional(),
  trophiesMin: z.coerce.number().optional(),
  cardsMin: z.coerce.number().optional(),
  sellerRatingMin: z.coerce.number().optional(),
  autoDelivery: z.enum(['true', 'false']).optional(),
  includeGone: z.enum(['true', 'false']).default('false'),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(200).default(25),
  sort: z.string().default('externalId'),
  direction: z.enum(['asc', 'desc']).default('desc'),
});

const SORTABLE = new Set([
  'lastSeenAt',
  'firstSeenAt',
  'priceMinor',
  'externalId',
  'status',
  'trophies',
  'arena',
  'unlockedCards',
  'legendaryCards',
  'accountLevel',
]);

export const registerListingRoutes = (app: FastifyInstance): void => {
  app.get('/api/listings/:id/images/:position', async (request, reply) => {
    const { id, position: rawPosition } = request.params as { id: string; position: string };
    const position = Number(rawPosition);
    if (!Number.isInteger(position) || position < 0 || position > 3) {
      return reply.code(404).send({ error: 'Фото объявления не найдено' });
    }
    const image = await prisma.listingImage.findUnique({
      where: { listingId_position: { listingId: id, position } },
    });
    if (!image) return reply.code(404).send({ error: 'Фото объявления не найдено' });
    const path = sourceImagePath(image.fileName);
    try {
      await access(path);
    } catch {
      return reply.code(404).send({ error: 'Файл фото объявления не найден' });
    }
    return reply
      .type(image.mimeType)
      .header('Cache-Control', 'private, max-age=86400')
      .send(createReadStream(path));
  });

  app.get('/api/listings', async (request) => {
    const q = querySchema.parse(request.query);

    const where: Record<string, unknown> = { gameId: q.gameId };
    if (q.marketplace) where.marketplace = q.marketplace;
    if (q.status) where.status = q.status;
    if (q.includeGone === 'false') where.disappearedAt = null;
    if (q.autoDelivery) where.autoDelivery = q.autoDelivery === 'true';
    if (q.priceMin !== undefined || q.priceMax !== undefined) {
      where.priceMinor = {
        ...(q.priceMin !== undefined ? { gte: Math.round(q.priceMin * 100) } : {}),
        ...(q.priceMax !== undefined ? { lte: Math.round(q.priceMax * 100) } : {}),
      };
    }
    if (q.trophiesMin !== undefined) where.trophies = { gte: q.trophiesMin };
    if (q.cardsMin !== undefined) where.unlockedCards = { gte: q.cardsMin };
    if (q.search) {
      where.OR = [
        { sellerTitle: { contains: q.search, mode: 'insensitive' } },
        { externalId: { contains: q.search } },
        { seller: { name: { contains: q.search, mode: 'insensitive' } } },
      ];
    }
    if (q.sellerRatingMin !== undefined) {
      where.seller = {
        ...(where.seller as object | undefined),
        rating: { gte: q.sellerRatingMin },
      };
    }

    const orderBy = SORTABLE.has(q.sort)
      ? { [q.sort]: q.direction }
      : { externalId: q.direction };

    const [total, rows] = await Promise.all([
      prisma.listing.count({ where }),
      prisma.listing.findMany({
        where,
        include: { seller: true, analysis: true, images: { orderBy: { position: 'asc' } } },
        orderBy,
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
    ]);

    return { items: rows.map(toApiAccount), total, page: q.page, pageSize: q.pageSize };
  });

  app.get('/api/listings/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const row = await prisma.listing.findUnique({
      where: { id },
      include: { seller: true, analysis: true, images: { orderBy: { position: 'asc' } } },
    });
    if (!row) return reply.code(404).send({ error: 'Объявление не найдено' });
    return toApiAccount(row);
  });

  /** Top accounts ranked purely by Deal Score — the product's headline screen. */
  app.get('/api/top', async (request) => {
    const { gameId = 'clash-royale', limit = '100' } = request.query as Record<string, string>;
    const rows = await prisma.listing.findMany({
      where: { gameId, disappearedAt: null, analysis: { isNot: null } },
      include: { seller: true, analysis: true, images: { orderBy: { position: 'asc' } } },
      orderBy: { analysis: { dealScore: 'desc' } },
      take: Math.min(Number(limit) || 100, 200),
    });
    return { items: rows.map(toApiAccount), total: rows.length };
  });

  app.get('/api/stats', async (request) => {
    const { gameId = 'clash-royale' } = request.query as { gameId?: string };
    const grouped = await prisma.listing.groupBy({
      by: ['status'],
      where: { gameId, disappearedAt: null },
      _count: { _all: true },
    });
    const byStatus = Object.fromEntries(
      grouped.map((entry) => [entry.status, entry._count._all]),
    );
    const [total, gone] = await Promise.all([
      prisma.listing.count({ where: { gameId, disappearedAt: null } }),
      prisma.listing.count({ where: { gameId, NOT: { disappearedAt: null } } }),
    ]);
    return { gameId, total, gone, byStatus };
  });
};
