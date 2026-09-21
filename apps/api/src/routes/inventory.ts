import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { logActivity } from '../pipeline/activity.js';
import { DESTINATION_FEE_RATE } from '../config/marketplaces.js';

const money = (minor: number, currency: string) => ({
  amount: minor / 100,
  currency,
});

const formatMoney = (minor: number, currency: string): string => {
  const amount = (minor / 100).toLocaleString('ru-RU', { maximumFractionDigits: 0 });
  return currency === 'RUB' ? `${amount} ₽` : `${amount} ${currency}`;
};

type Row = Awaited<ReturnType<typeof loadItems>>[number];

const loadItems = (gameId: string, status?: string) =>
  prisma.inventoryItem.findMany({
    where: { gameId, ...(status ? { status } : {}) },
    include: { listing: { include: { analysis: true, seller: true } } },
    orderBy: { purchasedAt: 'desc' },
  });

const toApiItem = (row: Row) => {
  const sellMinor = row.manualMinor ?? row.recommendedMinor;
  const profitMinor = Math.round(sellMinor * (1 - DESTINATION_FEE_RATE) - row.purchaseMinor);
  return {
    id: row.id,
    accountId: row.listing.externalId,
    listingId: row.listingId,
    gameId: row.gameId,
    title: row.title,
    url: row.listing.url,
    purchase: {
      marketplace: row.purchaseMarket,
      price: money(row.purchaseMinor, row.purchaseCurrency),
      purchasedAt: row.purchasedAt.toISOString(),
      orderRef: row.orderRef,
      operator: row.operator,
    },
    resale: {
      marketplace: row.resaleMarket,
      recommendedPrice: money(row.recommendedMinor, row.purchaseCurrency),
      manualPrice: row.manualMinor === null ? null : money(row.manualMinor, row.purchaseCurrency),
    },
    expectedProfit: money(profitMinor, row.purchaseCurrency),
    scores: row.listing.analysis
      ? {
          quality: row.listing.analysis.qualityScore,
          deal: row.listing.analysis.dealScore,
          risk: row.listing.analysis.riskScore,
        }
      : null,
    status: row.status,
    updatedAt: row.updatedAt.toISOString(),
  };
};

const priceSchema = z.object({
  /** Major units (roubles), or null to fall back to the recommended price. */
  amount: z.number().positive().nullable(),
  actor: z.string().optional(),
});

const statusSchema = z.object({
  status: z.enum(['purchased', 'preparing', 'ready_to_list', 'listed', 'reserved', 'sold']),
  actor: z.string().optional(),
});

export const registerInventoryRoutes = (app: FastifyInstance): void => {
  app.get('/api/inventory', async (request) => {
    const { gameId = 'clash-royale', status } = request.query as Record<string, string>;
    const rows = await loadItems(gameId, status);
    const items = rows.map(toApiItem);

    const held = items.filter((item) => item.status !== 'sold');
    return {
      items,
      total: items.length,
      capitalMinor: held.reduce((sum, item) => sum + item.purchase.price.amount * 100, 0),
      expectedRevenueMinor: held.reduce(
        (sum, item) =>
          sum + (item.resale.manualPrice ?? item.resale.recommendedPrice).amount * 100,
        0,
      ),
    };
  });

  app.patch('/api/inventory/:id/price', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { amount, actor } = priceSchema.parse(request.body ?? {});
    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      include: { listing: true },
    });
    if (!item) return reply.code(404).send({ error: 'Позиция не найдена' });
    if (item.status === 'sold') {
      return reply.code(409).send({ error: 'Позиция продана, цену менять нельзя' });
    }

    const previousMinor = item.manualMinor ?? item.recommendedMinor;
    const nextMinor = amount === null ? null : Math.round(amount * 100);

    await prisma.inventoryItem.update({ where: { id }, data: { manualMinor: nextMinor } });
    await logActivity({
      gameId: item.gameId,
      kind: 'price_changed',
      subject: item.listing.externalId,
      title: 'Цена продажи изменена',
      meta: `${formatMoney(previousMinor, item.purchaseCurrency)} → ${formatMoney(
        nextMinor ?? item.recommendedMinor,
        item.purchaseCurrency,
      )}${nextMinor === null ? ' (рекомендованная)' : ''}`,
      actor,
      listingId: item.listingId,
    });

    return { id, manualPrice: nextMinor === null ? null : nextMinor / 100 };
  });

  app.patch('/api/inventory/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status, actor } = statusSchema.parse(request.body ?? {});
    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      include: { listing: true },
    });
    if (!item) return reply.code(404).send({ error: 'Позиция не найдена' });

    await prisma.inventoryItem.update({ where: { id }, data: { status } });

    const titles: Record<string, string> = {
      preparing: 'Подготовка к публикации',
      ready_to_list: 'Готов к публикации',
      listed: 'Опубликован',
      reserved: 'Зарезервирован',
      sold: 'Продан',
      purchased: 'Возвращён в статус «куплен»',
    };
    await logActivity({
      gameId: item.gameId,
      kind: status === 'listed' ? 'listing_published' : 'listing_prepared',
      subject: item.listing.externalId,
      title: titles[status] ?? 'Статус позиции изменён',
      meta: null,
      actor,
      listingId: item.listingId,
    });

    return { id, status };
  });
};
