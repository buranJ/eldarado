import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAccountOfferPayload } from './account-offer.js';
import {
  resolveAccountOfferSelection,
  type AccountOfferOptions,
} from './offer-options.js';

const mobileLegendsOptions: AccountOfferOptions = {
  tradeEnvironments: [
    { id: '0', name: 'Device', value: 'Android' },
    { id: '1', name: 'Device', value: 'iOS' },
  ],
  requiredAttributes: [{
    id: 'mobile-legends-region',
    name: 'Region',
    values: [
      { id: 'region-global', name: 'Global' },
      { id: 'region-us', name: 'US' },
    ],
  }],
};

test('rejects missing or invented Eldorado game selections before publishing', () => {
  assert.throws(
    () => resolveAccountOfferSelection(mobileLegendsOptions, {}),
    /Укажите Device/,
  );
  assert.throws(
    () => resolveAccountOfferSelection(mobileLegendsOptions, { tradeEnvironmentId: '0' }),
    /Укажите Region/,
  );
  assert.throws(
    () => resolveAccountOfferSelection(mobileLegendsOptions, {
      tradeEnvironmentId: '0',
      offerAttributes: { 'mobile-legends-region': 'region-unknown' },
    }),
    /Укажите Region/,
  );
});

test('sends selected region in the same shape as the Eldorado seller form', () => {
  const selection = resolveAccountOfferSelection(mobileLegendsOptions, {
    tradeEnvironmentId: '1',
    offerAttributes: { 'mobile-legends-region': 'region-us' },
  });
  const payload = buildAccountOfferPayload(
    '55',
    { title: 'Mobile Legends', description: 'Account', sellMinor: 1, currency: 'USD' },
    {
      priceUsd: 20,
      hasOriginalEmail: true,
      credentials: { accountLogin: 'temporary@gmail.com', accountPassword: 'temporary' },
    },
    [{ smallImage: 'small', largeImage: 'large', originalSizeImage: 'original' }],
    selection.tradeEnvironmentId,
    selection.offerAttributes,
  );

  assert.deepEqual(payload.augmentedGame, {
    gameId: '55',
    category: 'Account',
    tradeEnvironmentId: '1',
    offerAttributes: [{
      id: 'mobile-legends-region',
      type: 'Select',
      values: ['region-us'],
    }],
  });
});

test('validates every required attribute and preserves a configured default region', () => {
  const options: AccountOfferOptions = {
    tradeEnvironments: [{ id: '0', name: 'Region', value: 'Global' }],
    requiredAttributes: [
      { id: 'rank', name: 'Rank', values: [{ id: 'bronze', name: 'Bronze' }] },
      { id: 'skins', name: 'Skins', values: [{ id: 'many', name: 'Many' }] },
    ],
  };
  assert.throws(
    () => resolveAccountOfferSelection(options, {
      offerAttributes: { rank: 'bronze' },
    }, '0'),
    /Укажите Skins/,
  );
  assert.deepEqual(resolveAccountOfferSelection(options, {
    offerAttributes: { rank: 'bronze', skins: 'many' },
  }, '0'), {
    tradeEnvironmentId: '0',
    offerAttributes: [
      { id: 'rank', type: 'Select', values: ['bronze'] },
      { id: 'skins', type: 'Select', values: ['many'] },
    ],
  });
});
