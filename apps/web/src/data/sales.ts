import { money } from '@/utils/money';
import { hoursAgo } from '@/utils/date';
import type { Sale, SaleStatus } from '@gamestock/domain';

const FEE_RATE = 0.1;

interface SaleSeed {
  id: string;
  listingId: string | null;
  accountId: string;
  title: string;
  buy: number;
  sell: number;
  hours: number;
  status: SaleStatus;
}

/** Older rows reference archived accounts that are no longer in the live feed. */
const SEEDS: SaleSeed[] = [
  { id: 'ORD-90412', listingId: 'LST-3027', accountId: 'CR-2066', title: 'Clash Royale | 8560 кубков | 11 EVO | 5 героев', buy: 52, sell: 115, hours: 196, status: 'completed' },
  { id: 'ORD-90388', listingId: 'LST-3028', accountId: 'CR-2068', title: 'Clash Royale | 6410 кубков | 6 EVO | 3 героя', buy: 24, sell: 62, hours: 520, status: 'completed' },
  { id: 'ORD-90501', listingId: null, accountId: 'CR-1988', title: 'Clash Royale | 9120 кубков | 12 EVO | 6 героев', buy: 96, sell: 214, hours: 62, status: 'pending_payout' },
  { id: 'ORD-90344', listingId: null, accountId: 'CR-1974', title: 'Clash Royale | 7640 кубков | 8 EVO | 4 героя', buy: 34, sell: 79, hours: 310, status: 'completed' },
  { id: 'ORD-90287', listingId: null, accountId: 'CR-1961', title: 'Clash Royale | 9480 кубков | 17 EVO | 8 героев', buy: 168, sell: 342, hours: 612, status: 'completed' },
  { id: 'ORD-90233', listingId: null, accountId: 'CR-1943', title: 'Clash Royale | 6980 кубков | 6 EVO | 3 героя', buy: 27, sell: 58, hours: 740, status: 'completed' },
  { id: 'ORD-90190', listingId: null, accountId: 'CR-1920', title: 'Clash Royale | 8840 кубков | 13 EVO | 6 героев', buy: 74, sell: 162, hours: 928, status: 'completed' },
  { id: 'ORD-90154', listingId: null, accountId: 'CR-1907', title: 'Clash Royale | 5920 кубков | 3 EVO | 2 героя', buy: 19, sell: 41, hours: 1080, status: 'refunded' },
  { id: 'ORD-90121', listingId: null, accountId: 'CR-1894', title: 'Clash Royale | 9260 кубков | 15 EVO | 7 героев', buy: 128, sell: 268, hours: 1224, status: 'completed' },
  { id: 'ORD-90097', listingId: null, accountId: 'CR-1871', title: 'Clash Royale | 7310 кубков | 9 EVO | 4 героя', buy: 41, sell: 88, hours: 1368, status: 'disputed' },
  { id: 'ORD-90055', listingId: null, accountId: 'CR-1850', title: 'Clash Royale | 8120 кубков | 10 EVO | 5 героев', buy: 58, sell: 134, hours: 1512, status: 'completed' },
];

export const SALES_FIXTURE: Sale[] = SEEDS.map((seed) => {
  const fees = Math.round(seed.sell * FEE_RATE * 100) / 100;
  const net = Math.round((seed.sell - fees - seed.buy) * 100) / 100;
  return {
    id: seed.id,
    listingId: seed.listingId,
    accountId: seed.accountId,
    gameId: 'clash-royale',
    title: seed.title,
    marketplace: 'eldorado',
    purchasePrice: money(seed.buy),
    salePrice: money(seed.sell),
    fees: money(fees),
    netProfit: money(net),
    roiPercent: Math.round((net / seed.buy) * 1000) / 10,
    soldAt: hoursAgo(seed.hours),
    status: seed.status,
  };
});
