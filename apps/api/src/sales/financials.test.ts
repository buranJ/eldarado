import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateSaleFinancials } from './financials.js';

test('uses the actual Eldorado fee when the API provides it', () => {
  const result = calculateSaleFinancials({
    status: 'completed',
    totalMinor: 10_000,
    saleCurrency: 'RUB',
    purchaseMinor: 5_000,
    purchaseCurrency: 'RUB',
    actualFeeMinor: 750,
  });
  assert.equal(result.feeMinor, 750);
  assert.equal(result.feeEstimated, false);
  assert.equal(result.netProfitMinor, 4_250);
  assert.equal(result.roiPercent, 85);
});

test('estimates a fee only for settled orders when the API omits it', () => {
  const settled = calculateSaleFinancials({
    status: 'pending_payout',
    totalMinor: 10_000,
    saleCurrency: 'RUB',
    purchaseMinor: 5_000,
    purchaseCurrency: 'RUB',
    actualFeeMinor: null,
  });
  assert.equal(settled.feeMinor, 1_000);
  assert.equal(settled.feeEstimated, true);

  const refunded = calculateSaleFinancials({
    status: 'refunded',
    totalMinor: 10_000,
    saleCurrency: 'RUB',
    purchaseMinor: 5_000,
    purchaseCurrency: 'RUB',
    actualFeeMinor: null,
  });
  assert.equal(refunded.feeMinor, null);
  assert.equal(refunded.netProfitMinor, null);
});
