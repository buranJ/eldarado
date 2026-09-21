import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { logActivity } from '../pipeline/activity.js';
import { DEFAULT_DESTINATION } from '../config/marketplaces.js';

const bodySchema = z.object({ actor: z.string().optional() });

const formatMoney = (minor: number, currency: string): string => {
  const amount = (minor / 100).toLocaleString('ru-RU', { maximumFractionDigits: 0 });
  return currency === 'RUB' ? `${amount} ₽` : `${amount} ${currency}`;
};

/** Statuses an operator decision may be applied to. */
const DECIDABLE = ['analyzed', 'needs_review', 'ready_for_analysis', 'approved', 'rejected'];

export const registerDecisionRoutes = (app: FastifyInstance): void => {
  const load = async (id: string) =>
    prisma.listing.findUnique({ where: { id }, include: { analysis: true, inventory: true } });

  app.post('/api/listings/:id/approve', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { actor } = bodySchema.parse(request.body ?? {});
    const listing = await load(id);
    if (!listing) return reply.code(404).send({ error: 'Объявление не найдено' });
    if (listing.status === 'purchased') {
      return reply.code(409).send({ error: 'Аккаунт уже куплен' });
    }

    await prisma.listing.update({ where: { id }, data: { status: 'approved' } });
    await logActivity({
      gameId: listing.gameId,
      kind: 'account_approved',
      subject: listing.externalId,
      title: 'Аккаунт одобрен',
      meta: listing.analysis
        ? `Deal ${listing.analysis.dealScore} · Risk ${listing.analysis.riskScore}`
        : null,
      actor,
      listingId: listing.id,
    });
    return { id, status: 'approved' };
  });

  app.post('/api/listings/:id/reject', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { actor } = bodySchema.parse(request.body ?? {});
    const listing = await load(id);
    if (!listing) return reply.code(404).send({ error: 'Объявление не найдено' });
    if (listing.status === 'purchased') {
      return reply.code(409).send({ error: 'Аккаунт уже куплен, отклонить нельзя' });
    }

    await prisma.listing.update({ where: { id }, data: { status: 'rejected' } });
    await logActivity({
      gameId: listing.gameId,
      kind: 'account_rejected',
      subject: listing.externalId,
      title: 'Аккаунт отклонён',
      meta: null,
      actor,
      listingId: listing.id,
    });
    return { id, status: 'rejected' };
  });

  /**
   * Records a purchase. No money moves here — the operator buys on the source
   * marketplace themselves and confirms it, which is what creates the
   * inventory item.
   */
  app.post('/api/listings/:id/purchase', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { actor } = bodySchema.parse(request.body ?? {});
    const listing = await load(id);
    if (!listing) return reply.code(404).send({ error: 'Объявление не найдено' });
    if (listing.inventory) {
      return reply.code(409).send({ error: 'Аккаунт уже в инвентаре' });
    }
    if (!DECIDABLE.includes(listing.status)) {
      return reply
        .code(409)
        .send({ error: `Нельзя купить объявление в статусе «${listing.status}»` });
    }

    const recommendedMinor =
      listing.analysis?.resalePriceMinor ?? Math.round(listing.priceMinor * 2);

    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.inventoryItem.create({
        data: {
          listingId: listing.id,
          gameId: listing.gameId,
          title: listing.sellerTitle,
          purchaseMinor: listing.priceMinor,
          purchaseCurrency: listing.priceCurrency,
          purchaseMarket: listing.marketplace,
          resaleMarket: DEFAULT_DESTINATION,
          recommendedMinor,
          operator: actor ?? 'оператор',
        },
      });
      await tx.listing.update({ where: { id }, data: { status: 'purchased' } });
      return created;
    });

    await logActivity({
      gameId: listing.gameId,
      kind: 'account_purchased',
      subject: listing.externalId,
      title: 'Аккаунт куплен',
      meta: `${formatMoney(listing.priceMinor, listing.priceCurrency)}${
        listing.analysis ? ` · Deal ${listing.analysis.dealScore}` : ''
      }`,
      actor,
      listingId: listing.id,
    });

    return { id, status: 'purchased', inventoryItemId: item.id };
  });
};
