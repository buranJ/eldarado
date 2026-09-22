import type { ListingDraft } from './types.js';

export interface DraftSource {
  gameName: string;
  /** Localized seller-written summary; the source text remains untouched. */
  sellerSummary?: string | null;
  sellMinor: number;
  currency: string;
  attributes: Record<string, number | boolean | string | null>;
  autoDelivery: boolean;
}

const num = (attrs: DraftSource['attributes'], key: string): number | null =>
  typeof attrs[key] === 'number' ? (attrs[key] as number) : null;

const flag = (attrs: DraftSource['attributes'], key: string): boolean | null =>
  typeof attrs[key] === 'boolean' ? (attrs[key] as boolean) : null;

/** Headline stats, in the order buyers scan them. */
const TITLE_PARTS: { key: string; render: (value: number) => string }[] = [
  { key: 'trophies', render: (v) => `${v} Trophies` },
  { key: 'kingTowerLevel', render: (v) => `KT ${v}` },
  { key: 'accountLevel', render: (v) => `Level ${v}` },
  { key: 'evolutions', render: (v) => `${v} Evolutions` },
  { key: 'heroes', render: (v) => `${v} Champions` },
  { key: 'unlockedCards', render: (v) => `${v} Cards` },
  { key: 'emotes', render: (v) => `${v} Emotes` },
  { key: 'towerSkins', render: (v) => `${v} Tower Skins` },
];

const DETAIL_ROWS: { key: string; label: string }[] = [
  { key: 'kingTowerLevel', label: 'King Tower level' },
  { key: 'collectionLevel', label: 'Collection level' },
  { key: 'accountLevel', label: 'Account level' },
  { key: 'trophies', label: 'Current trophies' },
  { key: 'highestTrophies', label: 'Best trophies' },
  { key: 'arena', label: 'Arena' },
  { key: 'unlockedCards', label: 'Unlocked cards' },
  { key: 'legendaryCards', label: 'Legendary cards' },
  { key: 'level16Cards', label: 'Level 16 cards' },
  { key: 'level15Cards', label: 'Level 15 cards' },
  { key: 'level14Cards', label: 'Level 14 cards' },
  { key: 'evolutions', label: 'Evolutions' },
  { key: 'heroes', label: 'Champions' },
  { key: 'gems', label: 'Gems' },
  { key: 'gold', label: 'Gold' },
  { key: 'emotes', label: 'Emotes' },
  { key: 'rareEmotes', label: 'Rare emotes' },
  { key: 'towerSkins', label: 'Tower skins' },
  { key: 'banners', label: 'Banners' },
  { key: 'accountAgeYears', label: 'Account age (years)' },
];

/**
 * Renders an account into a listing a buyer can act on. Only attributes we
 * actually know are written out — nothing is padded with guesses, because a
 * wrong number in a listing is a dispute waiting to happen.
 */
export const buildDraft = (source: DraftSource): ListingDraft => {
  const { attributes: attrs } = source;

  const headline = TITLE_PARTS.map(({ key, render }) => {
    const value = num(attrs, key);
    return value === null ? null : render(value);
  }).filter((part): part is string => part !== null);

  const sellerSummary = source.sellerSummary?.trim() || null;
  const titleParts = headline.length
    ? [source.gameName, ...headline]
    : [source.gameName, sellerSummary];
  const title = titleParts.filter((part): part is string => Boolean(part)).join(' | ').slice(0, 120);

  const details = DETAIL_ROWS.map(({ key, label }) => {
    const value = num(attrs, key);
    return value === null ? null : `• ${label}: ${value.toLocaleString('en-US')}`;
  }).filter((row): row is string => row !== null);

  const transfer: string[] = [];
  const fullAccess = flag(attrs, 'fullAccess');
  const emailAccess = flag(attrs, 'emailAccess');
  const rebind = flag(attrs, 'rebindAvailable');
  const originalEmail = flag(attrs, 'originalEmail');

  if (fullAccess !== null) transfer.push(`• Full access: ${fullAccess ? 'yes' : 'no'}`);
  if (emailAccess !== null) transfer.push(`• Email access: ${emailAccess ? 'yes' : 'no'}`);
  if (rebind !== null) transfer.push(`• Rebind available: ${rebind ? 'yes' : 'no'}`);
  if (originalEmail !== null) {
    transfer.push(`• Original email: ${originalEmail ? 'yes' : 'no'}`);
  }
  if (typeof attrs.restrictions === 'string' && attrs.restrictions.trim() !== '') {
    transfer.push(`• Restrictions: ${attrs.restrictions.trim()}`);
  }

  const sections = [
    `${source.gameName} account for sale.`,
    ...(sellerSummary ? ['', 'SELLER DETAILS', `• ${sellerSummary}`] : []),
    '',
    'ACCOUNT DETAILS',
    ...(details.length ? details : ['• Details available on request']),
  ];

  if (transfer.length) {
    sections.push('', 'TRANSFER', ...transfer);
  }

  sections.push(
    '',
    'DELIVERY',
    source.autoDelivery
      ? '• Fast delivery after payment'
      : '• Manual delivery, usually within a few hours',
    '',
    'Message me before buying if you have any questions.',
  );

  return {
    title,
    description: sections.join('\n'),
    sellMinor: source.sellMinor,
    currency: source.currency,
  };
};
