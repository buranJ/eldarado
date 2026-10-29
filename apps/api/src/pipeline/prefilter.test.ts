import assert from 'node:assert/strict';
import test from 'node:test';
import type { RawOffer } from '../adapters/source/types.js';
import { prefilter } from './prefilter.js';

const offer = (rating: number | null, reviewsCount: number): RawOffer => ({
  externalId: '1',
  url: 'https://funpay.com/lots/offer?id=1',
  rawTitle: 'Account',
  sellerTitle: 'Account',
  price: { minor: 100, currency: 'RUB' },
  autoDelivery: false,
  seller: {
    externalId: 'seller-1',
    name: 'Seller',
    rating,
    reviewsCount,
    accountAgeLabel: null,
    accountAgeMonths: null,
    isOnline: false,
    profileUrl: 'https://funpay.com/users/1/',
  },
  gameData: { trophies: 0 },
});

test('only rejects reviewed sellers rated below four', () => {
  assert.deepEqual(prefilter(offer(3, 2)).reasons, [
    'рейтинг продавца 3★ ниже 4★ при наличии отзывов',
  ]);
  assert.equal(prefilter(offer(4, 2)).passed, true);
  assert.equal(prefilter(offer(5, 2)).passed, true);
});

test('retains sellers without reviews and does not filter price or game statistics', () => {
  assert.equal(prefilter(offer(null, 0)).passed, true);
  assert.equal(prefilter(offer(0, 0)).passed, true);
  assert.equal(prefilter(offer(null, 5)).passed, true);
  assert.equal(prefilter(offer(4, 0)).passed, true);
});

test('applies new-game price, region and platform rules without guessing missing values', () => {
  const expensive = { ...offer(5, 1), price: { minor: 30_000_00, currency: 'RUB' as const } };
  assert.equal(prefilter(expensive, 'arc-raiders').passed, false);

  const zenless = { ...offer(5, 1), gameData: { region: 'europe' } };
  assert.equal(prefilter(zenless, 'zenless-zone-zero').passed, true);
  assert.match(prefilter(offer(5, 1), 'zenless-zone-zero').reasons.join(' '), /Европа/);

  const pc = { ...offer(5, 1), gameData: { platform: 'pc' } };
  assert.equal(prefilter(pc, 'warframe').passed, true);
  assert.equal(prefilter({ ...offer(2, 5), gameData: { platform: 'pc' } }, 'warframe').passed, true);
  assert.match(prefilter(offer(5, 1), 'warframe').reasons.join(' '), /PC/);
});
