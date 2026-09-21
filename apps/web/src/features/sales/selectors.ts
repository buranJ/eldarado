import { sumMoney } from '@/utils/money';
import type { Money, Sale, SaleStatus } from '@gamestock/domain';

export interface SalesTotals {
  count: number;
  revenue: Money;
  profit: Money;
  averageRoi: number;
}

/** Refunded orders are excluded from money totals but still counted as records. */
const isSettled = (sale: Sale): boolean => sale.status !== 'refunded';

export const salesTotals = (sales: Sale[]): SalesTotals => {
  const settled = sales.filter(isSettled);
  return {
    count: sales.length,
    revenue: sumMoney(settled.map((sale) => sale.salePrice)),
    profit: sumMoney(settled.map((sale) => sale.netProfit)),
    averageRoi:
      settled.length === 0
        ? 0
        : settled.reduce((acc, sale) => acc + sale.roiPercent, 0) / settled.length,
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
