/**
 * FunPay category ids per game. The game name link on the FunPay homepage
 * points at the accounts category — that is what we collect.
 */
export const FUNPAY_CATEGORIES: Record<string, { lotId: number; label: string }> = {
  'clash-royale': { lotId: 149, label: 'Clash Royale — аккаунты' },
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

/** One category page per day is well under any reasonable rate limit. */
export const MIN_REQUEST_INTERVAL_MS = 2_000;
