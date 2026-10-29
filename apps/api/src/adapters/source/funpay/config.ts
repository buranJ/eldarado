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
  'honkai-impact-3rd': { lotId: 1082, label: 'Honkai Impact 3rd — аккаунты' },
  rust: { lotId: 250, label: 'Rust — аккаунты' },
  'league-of-legends': { lotId: 85, label: 'League of Legends — аккаунты' },
  'mobile-legends': { lotId: 366, label: 'Mobile Legends — аккаунты' },
  'clash-of-clans': { lotId: 147, label: 'Clash of Clans — аккаунты' },
  // These ids intentionally match the existing Eldorado-backed workspace ids.
  // Keeping them stable preserves imported listings and the selected-game value
  // already stored in users' browsers.
  'eldorado-179': { lotId: 3004, label: 'Jujutsu Kaisen Phantom Parade — аккаунты' },
  'eldorado-166': { lotId: 1141, label: 'Arknights — аккаунты' },
  'zenless-zone-zero': { lotId: 2408, label: 'Zenless Zone Zero — аккаунты' },
  'wuthering-waves': { lotId: 2390, label: 'Wuthering Waves — аккаунты' },
  'world-of-warships': { lotId: 158, label: 'World of Warships — аккаунты' },
  'wow-mists-of-pandaria-classic': { lotId: 763, label: 'WoW Mists of Pandaria Classic (RU) — аккаунты' },
  'world-of-warcraft': { lotId: 13, label: 'World of Warcraft (RU/EU) — аккаунты' },
  'world-of-tanks': { lotId: 77, label: 'World of Tanks — аккаунты' },
  'whiteout-survival': { lotId: 4567, label: 'Whiteout Survival — аккаунты' },
  'where-winds-meet': { lotId: 3902, label: 'Where Winds Meet — аккаунты' },
  'watcher-of-realms': { lotId: 1698, label: 'Watcher of Realms — аккаунты' },
  warframe: { lotId: 65, label: 'Warframe — аккаунты' },
  wardogs: { lotId: 4429, label: 'WARDOGS — аккаунты' },
  'war-thunder': { lotId: 242, label: 'War Thunder — аккаунты' },
  '8-ball-pool': { lotId: 2139, label: '8 Ball Pool — аккаунты' },
  'afk-journey': { lotId: 2287, label: 'AFK Journey — аккаунты' },
  'albion-online': { lotId: 47, label: 'Albion Online — аккаунты' },
  'arc-raiders': { lotId: 3382, label: 'ARC Raiders — аккаунты' },
  aniimo: { lotId: 3587, label: 'Aniimo — аккаунты' },
  'arena-breakout': { lotId: 1650, label: 'Arena Breakout — аккаунты' },
  'apex-legends': { lotId: 468, label: 'Apex Legends — аккаунты' },
  'black-desert-online': { lotId: 33, label: 'Black Desert (EU/US) — аккаунты' },
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
