import { sumMoney } from '@/utils/money';
import type { Money, Sale, SaleStatus } from '@gamestock/domain';

export interface SalesTotals {
  count: number;
  revenue: Money;
  profit: Money | null;
  averageRoi: number | null;
}

/** Only paid or payable orders contribute to financial totals. */
const isSettled = (sale: Sale): boolean =>
  sale.status === 'completed' || sale.status === 'pending_payout';

export const salesTotals = (sales: Sale[]): SalesTotals => {
  const settled = sales.filter(isSettled);
  const knownProfits = settled.flatMap((sale) => (sale.netProfit ? [sale.netProfit] : []));
  const knownRoi = settled.flatMap((sale) =>
    sale.roiPercent === null ? [] : [sale.roiPercent],
  );
  return {
    count: settled.length,
    revenue: sumMoney(settled.map((sale) => sale.salePrice)),
    profit: knownProfits.length > 0 ? sumMoney(knownProfits) : null,
    averageRoi:
      knownRoi.length > 0
        ? knownRoi.reduce((acc, value) => acc + value, 0) / knownRoi.length
        : null,
  };
};

export interface SalesFilter {
  query: string;
  /** Days back from `now`, or `null` for all time. */
  periodDays: number | null;
  status: 'all' | SaleStatus;
}

export const filterSales = (sales: Sale[], filter: SalesFilter, now: number): Sale[] => {
  const query = filter.query.trim().toLowerCase();
  const threshold = filter.periodDays === null ? null : now - filter.periodDays * 24 * 3_600_000;
  return sales.filter((sale) => {
    if (threshold !== null && new Date(sale.soldAt).getTime() < threshold) return false;
    if (filter.status !== 'all' && sale.status !== filter.status) return false;
    if (!query) return true;
    return `${sale.id} ${sale.accountId} ${sale.title}`.toLowerCase().includes(query);
  });
};
