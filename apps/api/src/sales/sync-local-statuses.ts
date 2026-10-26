import { eldoradoClientForUser } from '../adapters/destination/eldorado/user-client.js';
import type { EldoradoSellerOrder } from '../adapters/destination/eldorado/client.js';
import { prisma } from '../lib/db.js';

const SYNC_INTERVAL_MS = 5 * 60 * 1_000;
const inFlight = new Map<string, Promise<void>>();
const lastSynced = new Map<string, number>();

export const soldOfferIdsFromOrders = (orders: EldoradoSellerOrder[]): Set<string> => new Set(
  orders
    .filter((order) => order.category.toLowerCase() === 'account')
    .filter((order) => !['canceled', 'cancelled', 'refunded', 'disputed'].includes(
      order.state.toLowerCase(),
    ))
    .map((order) => order.offerId),
);

/** Refresh owned inventory from seller orders without requiring the Sales page to be opened. */
export const syncLocalEldoradoSaleStatuses = (userId: string): Promise<void> => {
  const pending = inFlight.get(userId);
  if (pending) return pending;
  if (Date.now() - (lastSynced.get(userId) ?? 0) < SYNC_INTERVAL_MS) return Promise.resolve();

  const sync = (async () => {
    const localOffers = await prisma.marketplaceListing.findMany({
      where: {
        marketplace: 'eldorado',
        externalId: { not: null },
        status: { not: 'deleted' },
        item: { userId },
        OR: [
          { status: { not: 'sold' } },
          { item: { status: { not: 'sold' } } },
        ],
      },
      select: { id: true, itemId: true, externalId: true },
    });
    if (localOffers.length === 0) return;

    const client = await eldoradoClientForUser(userId);
    if (!client.configured) return;
    const orders = await client.listSellerOrders();
    const soldOfferIds = soldOfferIdsFromOrders(orders);
    const sold = localOffers.filter((offer) => offer.externalId && soldOfferIds.has(offer.externalId));
    if (sold.length > 0) {
      await prisma.$transaction([
        prisma.marketplaceListing.updateMany({
          where: { id: { in: sold.map((offer) => offer.id) } },
          data: { status: 'sold', error: null },
        }),
        prisma.inventoryItem.updateMany({
          where: { id: { in: sold.map((offer) => offer.itemId) }, userId },
          data: { status: 'sold' },
        }),
      ]);
    }
    lastSynced.set(userId, Date.now());
  })();
  inFlight.set(userId, sync);
  void sync.finally(() => {
    if (inFlight.get(userId) === sync) inFlight.delete(userId);
  }).catch(() => undefined);
  return sync;
};
