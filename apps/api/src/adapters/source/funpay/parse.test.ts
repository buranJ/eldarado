import assert from 'node:assert/strict';
import test from 'node:test';
import type { RawOffer } from '../types.js';
import { parseOfferImageUrls, selectNewestOffers } from './parse.js';

const offer = (externalId: string): RawOffer => ({
  externalId,
  url: `https://funpay.com/lots/offer?id=${externalId}`,
  rawTitle: externalId,
  sellerTitle: externalId,
  price: { minor: 100_00, currency: 'RUB' },
  autoDelivery: false,
  seller: {
    externalId: `seller-${externalId}`,
    name: 'seller',
    rating: 5,
    reviewsCount: 10,
    accountAgeLabel: 'на сайте год',
    accountAgeMonths: 12,
    isOnline: false,
    profileUrl: null,
  },
  gameData: {},
});

test('selects unique offers by newest FunPay id', () => {
  const selected = selectNewestOffers(
    [offer('105'), offer('103'), offer('105'), offer('104'), offer('102')],
    3,
  );
  assert.deepEqual(selected.map((item) => item.externalId), ['105', '104', '103']);
});

test('extracts only original FunPay offer screenshots', () => {
  const urls = parseOfferImageUrls(`
    <ul class="attachments-list">
      <li><a class="attachments-thumb" href="https://sfunpay.com/s/offer/aa/main.jpg"></a></li>
      <li><a class="attachments-thumb" href="https://example.com/not-funpay.jpg"></a></li>
    </ul>
    <img src="https://sfunpay.com/s/file/decorative.jpg">
  `);
  assert.deepEqual(urls, ['https://sfunpay.com/s/offer/aa/main.jpg']);
});
