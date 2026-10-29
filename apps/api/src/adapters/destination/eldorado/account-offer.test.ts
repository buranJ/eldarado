import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAccountOfferPayload, ELDORADO_ACCOUNT_GAMES } from './account-offer.js';
import { FUNPAY_CATEGORIES } from '../../source/funpay/config.js';

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
    [{
      smallImage: 'small.jpg',
      largeImage: 'large.jpg',
      originalSizeImage: 'original.jpg',
    }],
  );

  assert.equal(payload.augmentedGame.gameId, '52');
  assert.equal(payload.augmentedGame.category, 'Account');
  assert.equal(payload.details.guaranteedDeliveryTime, 'Instant');
  assert.equal(payload.details.mainOfferImage.originalSizeImage, 'original.jpg');
  assert.deepEqual(payload.details.offerImages, []);
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
    [{ smallImage: 's', largeImage: 'l', originalSizeImage: 'o' }],
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

test('maps both additional games to Eldorado account categories', () => {
  assert.deepEqual(ELDORADO_ACCOUNT_GAMES['eldorado-179'], {
    gameId: '179',
    seoAlias: 'jujutsu-phanpara-accounts',
  });
  assert.deepEqual(ELDORADO_ACCOUNT_GAMES['eldorado-166'], {
    gameId: '166',
    seoAlias: 'arknights-accounts',
    tradeEnvironmentId: '0',
  });
});

test('maps the five new FunPay games to their Eldorado account categories', () => {
  const expected: Record<string, string> = {
    'honkai-impact-3rd': '154',
    rust: '37',
    'league-of-legends': '17',
    'mobile-legends': '55',
    'clash-of-clans': '18',
  };
  for (const [gameId, eldoradoId] of Object.entries(expected)) {
    assert.equal(ELDORADO_ACCOUNT_GAMES[gameId]?.gameId, eldoradoId);
  }
});

test('maps every game in the new onboarding list to both marketplaces', () => {
  const expected: Record<string, [number, string]> = {
    'zenless-zone-zero': [2408, '194'],
    'wuthering-waves': [2390, '190'],
    'world-of-warships': [158, '330'],
    'wow-mists-of-pandaria-classic': [763, '14'],
    'world-of-warcraft': [13, '0'],
    'world-of-tanks': [77, '240'],
    'whiteout-survival': [4567, '208'],
    'where-winds-meet': [3902, '323'],
    'watcher-of-realms': [1698, '325'],
    warframe: [65, '11'],
    wardogs: [4429, '474'],
    'war-thunder': [242, '80'],
    '8-ball-pool': [2139, '77'],
    'afk-journey': [2287, '426'],
    'albion-online': [47, '41'],
    'arc-raiders': [3382, '319'],
    aniimo: [3587, '478'],
    'arena-breakout': [1650, '321'],
    'apex-legends': [468, '33'],
    'black-desert-online': [33, '24'],
  };
  for (const [gameId, [funpayId, eldoradoId]] of Object.entries(expected)) {
    assert.equal(FUNPAY_CATEGORIES[gameId]?.lotId, funpayId);
    assert.equal(ELDORADO_ACCOUNT_GAMES[gameId]?.gameId, eldoradoId);
    assert.ok(ELDORADO_ACCOUNT_GAMES[gameId]?.seoAlias);
  }
});

test('uses the current PUBG Mobile account URL alias', () => {
  assert.equal(
    ELDORADO_ACCOUNT_GAMES['pubg-mobile']?.seoAlias,
    'pubg-mobile-accounts-for-sale',
  );
});

test('adds the required Arknights Global trade environment', () => {
  const game = ELDORADO_ACCOUNT_GAMES['eldorado-166'];
  const payload = buildAccountOfferPayload(
    game.gameId,
    { title: 'Arknights', description: 'Global account', sellMinor: 1, currency: 'USD' },
    {
      priceUsd: 10,
      hasOriginalEmail: false,
      credentials: { accountLogin: 'login', accountPassword: 'password' },
    },
    [{ smallImage: 's', largeImage: 'l', originalSizeImage: 'o' }],
    game.tradeEnvironmentId,
  );

  assert.equal(payload.augmentedGame.tradeEnvironmentId, '0');
});
