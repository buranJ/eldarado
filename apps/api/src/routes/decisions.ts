import type { FastifyInstance, FastifyReply } from 'fastify';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { DEFAULT_DESTINATION } from '../config/marketplaces.js';

const bodySchema = z.object({ actor: z.string().optional() });
const bulkSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(200),
  action: z.enum(['approve', 'reject']),
  actor: z.string().optional(),
});

const DECIDABLE = ['analyzed', 'needs_review', 'ready_for_analysis', 'approved', 'rejected'];

type DecisionListing = Prisma.ListingGetPayload<{
  include: { analysis: true; inventory: true };
}>;

class DecisionError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
  }
}

const formatMoney = (minor: number, currency: string): string => {
  const amount = (minor / 100).toLocaleString('ru-RU', { maximumFractionDigits: 0 });
  return currency === 'RUB' ? `${amount} ₽` : `${amount} ${currency}`;
};

const inventoryData = (listing: DecisionListing, actor?: string) => ({
  listingId: listing.id,
  gameId: listing.gameId,
  title: listing.sellerTitle,
  purchaseMinor: listing.priceMinor,
  purchaseCurrency: listing.priceCurrency,
  purchaseMarket: listing.marketplace,
  resaleMarket: DEFAULT_DESTINATION,
  recommendedMinor: listing.analysis?.resalePriceMinor ?? Math.round(listing.priceMinor * 2),
  operator: actor ?? 'оператор',
});

const ensurePurchasable = (listing: DecisionListing): void => {
  if (listing.inventory) throw new DecisionError('Аккаунт уже в инвентаре', 409);
  if (!DECIDABLE.includes(listing.status)) {
    throw new DecisionError(`Нельзя обработать объявление в статусе «${listing.status}»`, 409);
  }
};

const addToInventory = async (
  tx: Prisma.TransactionClient,
  listing: DecisionListing,
  actor: string | undefined,
  title: string,
) => {
  ensurePurchasable(listing);
  const item = await tx.inventoryItem.create({ data: inventoryData(listing, actor) });
  await tx.listing.update({ where: { id: listing.id }, data: { status: 'purchased' } });
  await tx.activityEvent.create({
    data: {
      gameId: listing.gameId,
      kind: 'account_purchased',
      subject: listing.externalId,
      title,
      meta: `${formatMoney(listing.priceMinor, listing.priceCurrency)}${
        listing.analysis ? ` · Deal ${listing.analysis.dealScore}` : ''
      }`,
      actor: actor ?? 'оператор',
      listingId: listing.id,
    },
  });
  return item;
};

const rejectListing = async (
  tx: Prisma.TransactionClient,
  listing: DecisionListing,
  actor?: string,
) => {
  if (listing.inventory || listing.status === 'purchased') {
    throw new DecisionError('Аккаунт уже в инвентаре, отклонить нельзя', 409);
  }
  await tx.listing.update({ where: { id: listing.id }, data: { status: 'rejected' } });
  await tx.activityEvent.create({
    data: {
      gameId: listing.gameId,
      kind: 'account_rejected',
      subject: listing.externalId,
      title: 'Аккаунт отклонён',
      actor: actor ?? 'оператор',
      listingId: listing.id,
    },
  });
};

const sendError = (error: unknown, reply: FastifyReply) => {
  if (error instanceof DecisionError) {
    return reply.code(error.statusCode).send({ error: error.message });
  }
  throw error;
};

export const registerDecisionRoutes = (app: FastifyInstance): void => {
  const load = async (id: string) =>
    prisma.listing.findUnique({ where: { id }, include: { analysis: true, inventory: true } });

  app.post('/api/listings/:id/approve', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { actor } = bodySchema.parse(request.body ?? {});
    const listing = await load(id);
    if (!listing) return reply.code(404).send({ error: 'Объявление не найдено' });

    try {
      const item = await prisma.$transaction((tx) =>
        addToInventory(tx, listing, actor, 'Аккаунт одобрен и добавлен в инвентарь'),
      );
      return { id, status: 'purchased', inventoryItemId: item.id };
    } catch (error) {
      return sendError(error, reply);
    }
  });

  app.post('/api/listings/:id/reject', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { actor } = bodySchema.parse(request.body ?? {});
    const listing = await load(id);
    if (!listing) return reply.code(404).send({ error: 'Объявление не найдено' });

    try {
      await prisma.$transaction((tx) => rejectListing(tx, listing, actor));
      return { id, status: 'rejected' };
    } catch (error) {
      return sendError(error, reply);
    }
  });

  app.post('/api/listings/bulk-decision', async (request, reply) => {
    const { ids: rawIds, action, actor } = bulkSchema.parse(request.body ?? {});
    const ids = [...new Set(rawIds)];

    try {
      const inventoryItemIds = await prisma.$transaction(async (tx) => {
        const listings = await tx.listing.findMany({
          where: { id: { in: ids } },
          include: { analysis: true, inventory: true },
        });
        if (listings.length !== ids.length) {
          throw new DecisionError('Один или несколько аккаунтов больше не существуют', 404);
        }

        const createdIds: string[] = [];
        for (const listing of listings) {
          if (action === 'approve') {
            const item = await addToInventory(
              tx,
              listing,
              actor,
              'Аккаунт одобрен и добавлен в инвентарь',
            );
            createdIds.push(item.id);
          } else {
            await rejectListing(tx, listing, actor);
          }
        }
        return createdIds;
      });

      return { action, processed: ids.length, inventoryItemIds };
    } catch (error) {
      return sendError(error, reply);
    }
  });

  app.post('/api/listings/:id/purchase', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { actor } = bodySchema.parse(request.body ?? {});
    const listing = await load(id);
    if (!listing) return reply.code(404).send({ error: 'Объявление не найдено' });

    try {
      const item = await prisma.$transaction((tx) =>
        addToInventory(tx, listing, actor, 'Аккаунт куплен'),
      );
      return { id, status: 'purchased', inventoryItemId: item.id };
    } catch (error) {
      return sendError(error, reply);
    }
  });
};
