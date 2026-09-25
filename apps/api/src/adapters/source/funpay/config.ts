/**
 * FunPay category ids per game. The game name link on the FunPay homepage
 * points at the accounts category — that is what we collect.
 */
export const FUNPAY_CATEGORIES: Record<string, { lotId: number; label: string }> = {
  'clash-royale': { lotId: 149, label: 'Clash Royale — аккаунты' },
  'pubg-mobile': { lotId: 346, label: 'PUBG Mobile — аккаунты' },
  'car-parking-multiplayer': { lotId: 1534, label: 'Car Parking Multiplayer — аккаунты' },
  'arknights-endfield': { lotId: 3939, label: 'Arknights: Endfield — аккаунты' },
  'standoff-2': { lotId: 454, label: 'Standoff 2 — аккаунты' },
};

export const FUNPAY_BASE = 'https://funpay.com';

/** Only the category and the public offer page are in collector scope. */
export const FUNPAY_ALLOWED_PATH = /^\/lots\/(?:\d+\/?|offer\?id=\d+)$/;

export const FUNPAY_COLLECTION_LIMIT = 200;

export const REQUEST_HEADERS: Record<string, string> = {
  'User-Agent':
    'GameStockBot/0.1 (internal reselling tool; contact: junusovburan40@gmail.com)',
  'Accept-Language': 'ru-RU,ru;q=0.9',
  Accept: 'text/html,application/xhtml+xml',
};

/** Keep detail-page requests polite while allowing a 200-lot scan to finish promptly. */
export const MIN_REQUEST_INTERVAL_MS = 500;
