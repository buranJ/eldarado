import assert from 'node:assert/strict';
import test from 'node:test';
import type { EldoradoSellerOrder } from '../adapters/destination/eldorado/client.js';
import { soldOfferIdsFromOrders } from './sync-local-statuses.js';

const order = (offerId: string, state: string, category = 'Account'): EldoradoSellerOrder => ({
  id: `${offerId}-${state}`,
  offerId,
  gameId: '52',
  title: 'Account',
  category,
  state,
  createdAt: new Date().toISOString(),
  stateChangedAt: null,
  totalPrice: { amount: 10, currency: 'USD' },
  fee: null,
});

test('a canceled order cannot hide another sale for the same offer', () => {
  const sold = soldOfferIdsFromOrders([
    order('sold-offer', 'Completed'),
    order('sold-offer', 'Canceled'),
    order('canceled-only', 'Canceled'),
    order('refunded-only', 'Refunded'),
    order('disputed-only', 'Disputed'),
    order('not-an-account', 'Completed', 'Item'),
  ]);
  assert.deepEqual([...sold], ['sold-offer']);
});
