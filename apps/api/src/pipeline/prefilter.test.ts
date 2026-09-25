import assert from 'node:assert/strict';
import test from 'node:test';
import type { PrefilterConfig } from '@gamestock/domain';
import type { RawOffer } from '../adapters/source/types.js';
import { prefilter } from './prefilter.js';

const config: PrefilterConfig = {
  minSellerRating: 0,
  minSellerReviews: 0,
  minSellerAgeMonths: 0,
  allowUnknownSellerRating: true,
  allowUnknownSellerAge: true,
  minPrice: 700,
  maxPrice: 500_000,
  priceCurrency: 'RUB',
  requireAutoDelivery: false,
};

const offer = (minor: number, currency: RawOffer['price']['currency']): RawOffer => ({
  externalId: '1',
  url: 'https://funpay.com/lots/offer?id=1',
  rawTitle: 'Account',
  sellerTitle: 'Account',
  price: { minor, currency },
  autoDelivery: false,
  seller: {
    externalId: 'seller-1',
    name: 'Seller',
    rating: null,
    reviewsCount: 0,
    accountAgeLabel: null,
    accountAgeMonths: null,
    isOnline: false,
    profileUrl: 'https://funpay.com/users/1/',
  },
  gameData: {},
});

test('compares localized USD prices with RUB thresholds', () => {
  assert.equal(prefilter(offer(10_00, 'USD'), config, 'standoff-2').passed, true);
  assert.deepEqual(prefilter(offer(5_00, 'USD'), config, 'standoff-2').reasons, [
    'цена 455 < 700',
  ]);
});

