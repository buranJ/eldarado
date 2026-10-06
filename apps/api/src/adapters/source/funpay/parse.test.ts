import assert from 'node:assert/strict';
import test from 'node:test';
import type { RawOffer } from '../types.js';
import { parseCategory, parseOfferImageUrls, selectNewestOffers } from './parse.js';

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

test('parses and translates JJK Phantom Parade account listings', () => {
  const [parsed] = parseCategory(
    `<a href="https://funpay.com/lots/offer?id=58581757" class="tc-item" data-online="1">
      <div class="tc-desc-text">Тайвань 143000+ Кубиков, Юта, Сукуна, 17 SSR</div>
      <div class="media-user-name">seller</div>
      <div class="rating-stars rating-5"></div>
      <div class="rating-mini-count">20</div>
      <div class="media-user-info">на сайте 3 года</div>
      <div class="avatar-photo" data-href="https://funpay.com/users/42/"></div>
      <div class="tc-price">1512 ₽</div>
    </a>`,
    'eldorado-179',
  );

  assert.equal(parsed.externalId, '58581757');
  assert.equal(parsed.gameData.cubes, 143000);
  assert.match(String(parsed.gameData.titleEn), /Taiwan/);
  assert.match(String(parsed.gameData.titleEn), /Yuta/);
  assert.doesNotMatch(String(parsed.gameData.titleEn), /\p{Script=Cyrillic}/u);
});

test('parses and translates Arknights account listings', () => {
  const [parsed] = parseCategory(
    `<a href="https://funpay.com/lots/offer?id=76784195" class="tc-item" data-server="7811" data-auto="1">
      <div class="tc-desc-text">Global 270320 Orundum, 5☆ Операторы: 12, Сюжет 3-1</div>
      <div class="media-user-name">seller</div>
      <div class="rating-stars rating-5"></div>
      <div class="rating-mini-count">10</div>
      <div class="media-user-info">на сайте 4 года</div>
      <div class="avatar-photo" data-href="https://funpay.com/users/43/"></div>
      <div class="tc-price">3452 ₽</div>
    </a>`,
    'eldorado-166',
  );

  assert.equal(parsed.gameData.orundum, 270320);
  assert.equal(parsed.gameData.operators, 12);
  assert.equal(parsed.gameData.platform, '7811');
  assert.match(String(parsed.gameData.titleEn), /Operators/);
  assert.match(String(parsed.gameData.titleEn), /Story/);
  assert.doesNotMatch(String(parsed.gameData.titleEn), /\p{Script=Cyrillic}/u);
});

const categoryOffer = (attributes: string, title: string) => `
  <a href="https://funpay.com/lots/offer?id=77870152" class="tc-item" ${attributes}>
    <div class="tc-desc-text">${title}</div>
    <div class="media-user-name">seller</div>
    <div class="rating-stars rating-5"></div>
    <div class="rating-mini-count">10</div>
    <div class="media-user-info">на сайте 4 года</div>
    <div class="avatar-photo" data-href="https://funpay.com/users/43/"></div>
    <div class="tc-price">800 ₽</div>
  </a>`;

test('parses Honkai Impact 3rd and Clash of Clans category attributes', () => {
  const [honkai] = parseCategory(
    categoryOffer('data-f-level="58" data-server="7503"', 'Валькирии и 14 тикетов, 58 level'),
    'honkai-impact-3rd',
  );
  assert.equal(honkai.sellerTitle, 'Валькирии и 14 тикетов');
  assert.equal(honkai.gameData.accountLevel, 58);
  assert.equal(honkai.gameData.tickets, 14);
  assert.equal(honkai.gameData.server, '7503');

  const [clans] = parseCategory(
    categoryOffer('data-f-level="13" data-f-level2="7"',
      'Ратуша 13, 13 TH Родной Деревни, 7 TH Строителя'),
    'clash-of-clans',
  );
  assert.equal(clans.sellerTitle, 'Ратуша 13');
  assert.equal(clans.gameData.townHallLevel, 13);
  assert.equal(clans.gameData.builderHallLevel, 7);
});

test('keeps sales and excludes rentals in categories that mix offer types', () => {
  const rental = categoryOffer('data-f-type="аренда" data-f-level="146"',
    'Аренда на 6 часов, Аренда, уровень 146');
  const sale = categoryOffer('data-f-type="продажа" data-f-level="146" data-f-hero="140" data-f-skin="200"',
    'Скины и чемпионы, Продажа, уровень 146');

  assert.equal(parseCategory(rental, 'league-of-legends').length, 0);
  const [league] = parseCategory(sale, 'league-of-legends');
  assert.equal(league.sellerTitle, 'Скины и чемпионы');
  assert.equal(league.gameData.champions, 140);
  assert.equal(league.gameData.skins, 200);
  assert.equal(parseCategory(rental, 'mobile-legends').length, 0);

  const [mobile] = parseCategory(categoryOffer(
    'data-f-type="продажа" data-f-lvl="199" data-f-hero="132" data-f-skin="650" data-f-winrate="50"',
    'Коллекция обликов, Продажа, Ранг: Мифический, Уровень: 199',
  ), 'mobile-legends');
  assert.equal(mobile.gameData.accountLevel, 199);
  assert.equal(mobile.gameData.heroes, 132);
  assert.equal(mobile.gameData.winRate, 50);

  const [rust] = parseCategory(categoryOffer(
    'data-f-type="продажа" data-server="1223"',
    'Rust Steam с почтой, Продажа',
  ), 'rust');
  assert.equal(rust.sellerTitle, 'Rust Steam с почтой');
  assert.equal(rust.gameData.offerType, 'продажа');
});
