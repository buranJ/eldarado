import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAccountOfferPayload } from './account-offer.js';

test('builds the current Eldorado account offer payload without legacy secrets', () => {
  const payload = buildAccountOfferPayload(
    '52',
    { title: 'Draft title', description: 'Draft description', sellMinor: 1, currency: 'USD' },
    {
      title: ' Clash Royale test account ',
      description: 'Accurate test description',
      priceUsd: 29.5,
      hasOriginalEmail: true,
      credentials: {
        accountLogin: ' seller-login ',
        accountPassword: 'secret-password',
      },
    },
    {
      smallImage: 'small.jpg',
      largeImage: 'large.jpg',
      originalSizeImage: 'original.jpg',
    },
  );

  assert.equal(payload.augmentedGame.gameId, '52');
  assert.equal(payload.augmentedGame.category, 'Account');
  assert.equal(payload.details.guaranteedDeliveryTime, 'Instant');
  assert.deepEqual(payload.details.pricing.pricePerUnit, { amount: 29.5, currency: 'USD' });
  assert.equal('accountSecretDetails' in payload, false);
  assert.equal(payload.accountDeliveryDetails[0].accountDetails.accountLogin, 'seller-login');
  assert.equal(payload.accountDeliveryDetails[0].emailDetails, null);
  assert.equal(payload.accountDeliveryDetails[0].mfaDetails, null);
});

test('normalizes partially supplied optional delivery groups like Eldorado seller UI', () => {
  const payload = buildAccountOfferPayload(
    '52',
    { title: 'Draft', description: 'Draft', sellMinor: 1, currency: 'USD' },
    {
      priceUsd: 10,
      hasOriginalEmail: false,
      credentials: {
        accountLogin: 'login',
        accountPassword: 'password',
        emailProviderUrl: ' https://mail.google.com ',
        mfaLogin: ' recovery-code ',
      },
    },
    { smallImage: 's', largeImage: 'l', originalSizeImage: 'o' },
  );

  assert.deepEqual(payload.accountDeliveryDetails[0].emailDetails, {
    emailProviderUrl: 'https://mail.google.com',
    emailLogin: '',
    emailPassword: '',
  });
  assert.deepEqual(payload.accountDeliveryDetails[0].mfaDetails, {
    mfaLogin: 'recovery-code',
    mfaPassword: '',
  });
});
