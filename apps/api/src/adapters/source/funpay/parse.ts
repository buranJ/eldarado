import * as cheerio from 'cheerio';
import type { CurrencyCode } from '@gamestock/domain';
import type { RawOffer } from '../types.js';
import { translateGameTitle } from '../../../localization/games.js';
import { FUNPAY_BASE } from './config.js';

const CURRENCY_BY_SYMBOL: Record<string, CurrencyCode> = {
  '₽': 'RUB',
  $: 'USD',
  '€': 'EUR',
};

const toInt = (value: string | undefined): number | null => {
  if (value === undefined) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

/** "на сайте 9 месяцев" / "на сайте 2 года" / "на сайте год" → months. */
export const parseSellerAge = (label: string | null): number | null => {
  if (!label) return null;
  const text = label.toLowerCase();
  const amount = toInt(text.match(/(\d+)/)?.[1]) ?? 1;
  if (/месяц/.test(text)) return amount;
  if (/год|лет/.test(text)) return amount * 12;
  if (/дн|день|недел/.test(text)) return 0;
  return null;
};

/** "848.27 ₽" → { minor: 84827, currency: 'RUB' } */
export const parsePrice = (
  text: string,
): { minor: number; currency: CurrencyCode } | null => {
  const amount = text.replace(/[^\d.,]/g, '').replace(',', '.');
  if (!amount) return null;
  const value = Number.parseFloat(amount);
  if (Number.isNaN(value)) return null;
  const symbol = Object.keys(CURRENCY_BY_SYMBOL).find((s) => text.includes(s));
  return {
    minor: Math.round(value * 100),
    currency: symbol ? CURRENCY_BY_SYMBOL[symbol] : 'RUB',
  };
};

/**
 * FunPay appends a generated summary of its own filter attributes to the
 * seller's title: "…, 26 арена, 1461 уровень, 10690 кубков, 121 карт, 21 лег, Нет".
 * We rebuild that suffix from the attribute values we already have and strip it,
 * so the AI reads only what the seller actually wrote. If the suffix does not
 * match exactly, the title is returned untouched rather than guessed at.
 */
export const stripAutoSuffix = (
  rawTitle: string,
  attrs: Record<string, string | undefined>,
): string => {
  const parts = [
    attrs.arena && `${attrs.arena} арена`,
    attrs.level && `${attrs.level} уровень`,
    attrs.cup && `${attrs.cup} кубков`,
    attrs.card && `${attrs.card} карт`,
    attrs.legcard && `${attrs.legcard} лег`,
    attrs.namechange,
  ].filter(Boolean) as string[];

  if (parts.length === 0) return rawTitle.trim();

  const suffix = `, ${parts.join(', ')}`;
  const index = rawTitle.lastIndexOf(suffix);
  if (index === -1) {
    // Fall back to trimming the trailing attribute run if it is recognisable.
    const loose = rawTitle.replace(
      /,\s*\d+\s*арена,.*$/u,
      '',
    );
    return loose.trim();
  }
  return rawTitle.slice(0, index).trim();
};

const stripGameSuffix = (
  rawTitle: string,
  gameId: string | undefined,
  attrs: Record<string, string | undefined>,
): string => {
  if (gameId === 'clash-royale') return stripAutoSuffix(rawTitle, attrs);
  if (gameId === 'pubg-mobile') {
    return rawTitle
      .replace(
        /,\s*(?:продажа|покупка),\s*\d+\s+уровень,\s*ранг:.*$/iu,
        '',
      )
      .trim();
  }
  if (gameId === 'arknights-endfield') {
    return rawTitle
      .replace(
        /,\s*\d+\s+уровень аккаунта,\s*\d+\s+уровень исследования\s*$/iu,
        '',
      )
      .trim();
  }
  if (gameId === 'standoff-2' && attrs.rank) {
    const escapedRank = attrs.rank.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return rawTitle.replace(new RegExp(`,\\s*${escapedRank}\\s*$`, 'iu'), '').trim();
  }
  return rawTitle.trim();
};

const titleNumber = (title: string, labels: string): number | null => {
  const match = title.match(new RegExp(`(\\d[\\d\\s.,]*)\\s*(?:${labels})`, 'iu'));
  if (!match) return null;
  const parsed = Number.parseFloat(match[1].replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
};

const gameDataFor = (
  gameId: string | undefined,
  title: string,
  attrs: Record<string, string | undefined>,
): Record<string, unknown> => {
  const titleEn = gameId ? translateGameTitle(gameId, title) : title;
  switch (gameId) {
    case 'pubg-mobile':
      return {
        titleEn,
        accountLevel: toInt(attrs.level),
        rank: attrs.rank ?? null,
        offerType: attrs.type ?? null,
        mythicSkins: attrs.myth ?? null,
        upgradableWeapons: attrs.weapon ?? null,
        killFeedMessages: attrs.kill ?? null,
        sportsCars: attrs.sport ?? null,
      };
    case 'car-parking-multiplayer':
      return {
        titleEn,
        vinyls: titleNumber(title, 'винил(?:ов|ы)?|наклеек'),
        cars: titleNumber(title, 'машин(?:ы)?|авто'),
        coins: titleNumber(title, 'монет(?:ы)?'),
      };
    case 'arknights-endfield':
      return {
        titleEn,
        accountLevel: toInt(attrs.levela),
        researchLevel: toInt(attrs.levele),
      };
    case 'standoff-2':
      return {
        titleEn,
        rank: attrs.rank ?? null,
        accountLevel: titleNumber(title, 'уров(?:ень|ня)|лвл|lvl'),
        playtimeHours: titleNumber(title, 'час(?:ов|а)?|hours?'),
        gold: titleNumber(title, 'голд(?:ы|а)?|gold|g'),
      };
    default:
      return {
        arena: toInt(attrs.arena),
        accountLevel: toInt(attrs.level),
        trophies: toInt(attrs.cup),
        unlockedCards: toInt(attrs.card),
        legendaryCards: toInt(attrs.legcard),
        nameChangeAvailable:
          attrs.namechange === undefined ? null : /да|есть/i.test(attrs.namechange),
        ...(gameId === 'clash-royale' ? { titleEn } : {}),
      };
  }
};

/** Parses a FunPay category page into raw offers. */
export const parseCategory = (html: string, gameId?: string): RawOffer[] => {
  const $ = cheerio.load(html);
  const offers: RawOffer[] = [];

  $('a.tc-item').each((_, element) => {
    const node = $(element);
    const href = node.attr('href') ?? '';
    const externalId = href.match(/offer\?id=(\d+)/)?.[1];
    if (!externalId) return;

    const attrs: Record<string, string | undefined> = {
      arena: node.attr('data-f-arena'),
      level: node.attr('data-f-level'),
      cup: node.attr('data-f-cup'),
      card: node.attr('data-f-card'),
      legcard: node.attr('data-f-legcard'),
      namechange: node.attr('data-f-namechange'),
      type: node.attr('data-f-type'),
      rank: node.attr('data-f-rank'),
      myth: node.attr('data-f-myth'),
      weapon: node.attr('data-f-weapon'),
      kill: node.attr('data-f-kill'),
      sport: node.attr('data-f-sport'),
      levela: node.attr('data-f-levela'),
      levele: node.attr('data-f-levele'),
    };

    const rawTitle = node.find('.tc-desc-text').first().text().trim();
    const priceText = node.find('.tc-price').first().text().trim();
    const price = parsePrice(priceText);
    if (!price) return;

    const sellerName = node.find('.media-user-name').first().text().trim();
    const ratingClass = node.find('.rating-stars').first().attr('class') ?? '';
    const rating = toInt(ratingClass.match(/rating-(\d)/)?.[1]);
    const reviews = toInt(node.find('.rating-mini-count').first().text().trim()) ?? 0;
    const ageLabel = node.find('.media-user-info').first().text().trim() || null;
    const sellerExternalId =
      node.attr('data-user') ??
      node.find('.avatar-photo').first().attr('data-href')?.match(/users\/(\d+)/)?.[1] ??
      '';

    if (!sellerExternalId) return;

    const sellerTitle = stripGameSuffix(rawTitle, gameId, attrs);

    offers.push({
      externalId,
      url: `${FUNPAY_BASE}/lots/offer?id=${externalId}`,
      rawTitle,
      sellerTitle,
      price,
      autoDelivery: node.attr('data-auto') === '1',
      seller: {
        externalId: sellerExternalId,
        name: sellerName,
        rating,
        reviewsCount: reviews,
        accountAgeLabel: ageLabel,
        accountAgeMonths: parseSellerAge(ageLabel),
        isOnline: node.attr('data-online') === '1',
        profileUrl: `${FUNPAY_BASE}/users/${sellerExternalId}/`,
      },
      gameData: gameDataFor(gameId, sellerTitle, attrs),
    });
  });

  return offers;
};

/**
 * FunPay does not expose a publication timestamp in the category markup.
 * Offer ids are allocated monotonically, so descending id is the closest
 * stable representation of "newest first" available without guessing from
 * seller activity or current online status.
 */
export const selectNewestOffers = (offers: RawOffer[], limit: number): RawOffer[] => {
  const unique = [...new Map(offers.map((offer) => [offer.externalId, offer])).values()];
  return unique
    .sort((left, right) => {
      const a = BigInt(left.externalId);
      const b = BigInt(right.externalId);
      return a === b ? 0 : a > b ? -1 : 1;
    })
    .slice(0, limit);
};

/** Original screenshots linked from the offer's "Картинки" block. */
export const parseOfferImageUrls = (html: string): string[] => {
  const $ = cheerio.load(html);
  return $('.attachments-list a.attachments-thumb[href]')
    .map((_, element) => $(element).attr('href') ?? '')
    .get()
    .filter((value) => {
      try {
        const url = new URL(value);
        return url.protocol === 'https:' && url.hostname === 'sfunpay.com' && url.pathname.startsWith('/s/offer/');
      } catch {
        return false;
      }
    });
};

/** A live public offer page contains a purchase form bound to this offer id. */
export const parseOfferIsLive = (html: string, externalId: string): boolean => {
  const $ = cheerio.load(html);
  return $(`input[name="offer_id"][value="${externalId}"]`).length > 0;
};
