import assert from 'node:assert/strict';
import test from 'node:test';
import type { PrefilterConfig } from '@gamestock/domain';
import type { RawOffer } from '../adapters/source/types.js';
import { prefilter } from './prefilter.js';
import { PREFILTER } from '../config/prefilter.js';

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

test('requires the documented seller rating, price, and main village town hall', () => {
  const candidate = offer(5_00, 'USD');
  candidate.seller.rating = 4;
  candidate.gameData.townHallLevel = 9;
  assert.equal(prefilter(candidate, PREFILTER['clash-of-clans'], 'clash-of-clans').passed, true);

  candidate.gameData.townHallLevel = 8;
  assert.deepEqual(
    prefilter(candidate, PREFILTER['clash-of-clans'], 'clash-of-clans').reasons,
    ['ратуша 8 < 9'],
  );

  candidate.gameData.townHallLevel = 9;
  candidate.seller.rating = 3;
  candidate.price.minor = 3_00;
  assert.deepEqual(
    prefilter(candidate, PREFILTER['clash-of-clans'], 'clash-of-clans').reasons,
    ['рейтинг продавца 3★ < 4★', 'цена 3 < 4'],
  );
});

test('applies separate minimum USD prices for League and Mobile Legends', () => {
  const candidate = offer(5_00, 'USD');
  candidate.seller.rating = 4;
  assert.deepEqual(
    prefilter(candidate, PREFILTER['league-of-legends'], 'league-of-legends').reasons,
    ['цена 5 < 6'],
  );
  assert.equal(prefilter(candidate, PREFILTER['mobile-legends'], 'mobile-legends').passed, true);
});
