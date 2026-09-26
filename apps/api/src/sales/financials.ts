import { convertMinor, DESTINATION_FEE_RATE } from '../config/marketplaces.js';

type SaleStatus = 'completed' | 'pending_payout' | 'canceled' | 'refunded' | 'disputed';

export interface SaleFinancials {
  feeMinor: number | null;
  feeEstimated: boolean;
  purchaseInSaleCurrencyMinor: number | null;
  netProfitMinor: number | null;
  roiPercent: number | null;
}

export const calculateSaleFinancials = (input: {
  status: SaleStatus;
  totalMinor: number;
  saleCurrency: string;
  purchaseMinor: number | null;
  purchaseCurrency: string | null;
  actualFeeMinor: number | null;
}): SaleFinancials => {
  const settled = input.status === 'completed' || input.status === 'pending_payout';
  if (!settled || input.purchaseMinor === null || input.purchaseCurrency === null) {
    return {
      feeMinor: null,
      feeEstimated: false,
      purchaseInSaleCurrencyMinor: null,
      netProfitMinor: null,
      roiPercent: null,
    };
  }
  const feeMinor = input.actualFeeMinor ?? Math.round(input.totalMinor * DESTINATION_FEE_RATE);
  const purchaseInSaleCurrencyMinor = convertMinor(
    input.purchaseMinor,
    input.purchaseCurrency,
    input.saleCurrency,
  );
  const netProfitMinor = input.totalMinor - feeMinor - purchaseInSaleCurrencyMinor;
  const roiPercent = purchaseInSaleCurrencyMinor > 0
    ? Math.round((netProfitMinor / purchaseInSaleCurrencyMinor) * 1_000) / 10
    : null;
  return {
    feeMinor,
    feeEstimated: input.actualFeeMinor === null,
    purchaseInSaleCurrencyMinor,
    netProfitMinor,
    roiPercent,
  };
};
