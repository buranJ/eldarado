import type { ListingDraft } from '../types.js';
import type { SelectedOfferAttribute } from './offer-options.js';

export const ELDORADO_ACCOUNT_GAMES: Record<
  string,
  { gameId: string; seoAlias: string; tradeEnvironmentId?: string }
> = {
  'clash-royale': { gameId: '52', seoAlias: 'clash-royale-accounts' },
  'pubg-mobile': { gameId: '21', seoAlias: 'pubg-mobile-accounts-for-sale' },
  'car-parking-multiplayer': {
    gameId: '339',
    seoAlias: 'car-parking-multiplayer-accounts',
  },
  'arknights-endfield': {
    gameId: '358',
    seoAlias: 'arknights-endfield-accounts',
  },
  'standoff-2': { gameId: '340', seoAlias: 'standoff-2-accounts' },
  'eldorado-179': { gameId: '179', seoAlias: 'jujutsu-phanpara-accounts' },
  // Arknights requires a region. FunPay's category is Global, whose stable
  // Eldorado Trade Environment ID is 0.
  'eldorado-166': { gameId: '166', seoAlias: 'arknights-accounts', tradeEnvironmentId: '0' },
  'honkai-impact-3rd': { gameId: '154', seoAlias: 'honkai-impact-3rd-accounts' },
  rust: { gameId: '37', seoAlias: 'rust-accounts' },
  'league-of-legends': { gameId: '17', seoAlias: 'league-of-legends-accounts-for-sale' },
  'mobile-legends': { gameId: '55', seoAlias: 'mobile-legends-accounts' },
  'clash-of-clans': { gameId: '18', seoAlias: 'clash-of-clans-account-for-sale' },
  'zenless-zone-zero': { gameId: '194', seoAlias: 'zenless-zone-zero-accounts' },
  'wuthering-waves': { gameId: '190', seoAlias: 'wuthering-waves-accounts' },
  'world-of-warships': { gameId: '330', seoAlias: 'wows-accounts' },
  'wow-mists-of-pandaria-classic': { gameId: '14', seoAlias: 'wow-mists-of-pandaria-classic-accounts' },
  'world-of-warcraft': { gameId: '0', seoAlias: 'wow-accounts-for-sale' },
  'world-of-tanks': { gameId: '240', seoAlias: 'world-of-tanks-accounts' },
  'whiteout-survival': { gameId: '208', seoAlias: 'whiteout-survival-accounts' },
  'where-winds-meet': { gameId: '323', seoAlias: 'where-winds-meet-accounts' },
  'watcher-of-realms': { gameId: '325', seoAlias: 'watcher-of-realms-accounts-for-sale' },
  warframe: { gameId: '11', seoAlias: 'warframe-accounts-for-sale' },
  wardogs: { gameId: '474', seoAlias: 'wardogs-accounts' },
  'war-thunder': { gameId: '80', seoAlias: 'war-thunder-accounts' },
  '8-ball-pool': { gameId: '77', seoAlias: '8-ball-pool-accounts' },
  'afk-journey': { gameId: '426', seoAlias: 'afk-journey-accounts' },
  'albion-online': { gameId: '41', seoAlias: 'albion-online-accounts' },
  'arc-raiders': { gameId: '319', seoAlias: 'arc-raiders-accounts' },
  aniimo: { gameId: '478', seoAlias: 'aniimo-accounts' },
  'arena-breakout': { gameId: '321', seoAlias: 'arena-breakout-accounts' },
  'apex-legends': { gameId: '33', seoAlias: 'apex-legends-accounts' },
  'black-desert-online': { gameId: '24', seoAlias: 'bdo-accounts-for-sale' },
};

export interface EldoradoOfferImage {
  smallImage: string;
  largeImage: string;
  originalSizeImage: string;
}

export interface EldoradoAccountCredentials {
  accountLogin: string;
  accountPassword: string;
  emailProviderUrl?: string | null;
  emailLogin?: string | null;
  emailPassword?: string | null;
  mfaLogin?: string | null;
  mfaPassword?: string | null;
  additionalInfo?: string | null;
}

export interface EldoradoAccountPublishInput {
  priceUsd: number;
  hasOriginalEmail: boolean;
  title?: string;
  description?: string;
  credentials: EldoradoAccountCredentials;
}

export interface EldoradoAccountOfferPayload {
  details: {
    offerTitle: string;
    mainOfferImage: EldoradoOfferImage;
    offerImages: EldoradoOfferImage[];
    description: string;
    guaranteedDeliveryTime: 'Instant';
    pricing: {
      quantity: number;
      minQuantity: number;
      volumeDiscounts: never[];
      pricePerUnit: { amount: number; currency: 'USD' };
    };
    hasOriginalEmail: boolean;
  };
  augmentedGame: {
    gameId: string;
    category: 'Account';
    tradeEnvironmentId: string | null;
    offerAttributes: SelectedOfferAttribute[];
  };
  accountDeliveryDetails: Array<{
    accountDetails: { accountLogin: string; accountPassword: string };
    emailDetails: {
      emailProviderUrl: string;
      emailLogin: string;
      emailPassword: string;
    } | null;
    mfaDetails: { mfaLogin: string; mfaPassword: string } | null;
    additionalInfo: string | null;
  }>;
}

const optionalText = (value: string | null | undefined): string | null =>
  value?.trim() || null;

const emailDetails = (credentials: EldoradoAccountCredentials) => {
  const emailProviderUrl = credentials.emailProviderUrl?.trim() ?? '';
  const emailLogin = credentials.emailLogin?.trim() ?? '';
  const emailPassword = credentials.emailPassword?.trim() ?? '';
  return emailProviderUrl || emailLogin || emailPassword
    ? { emailProviderUrl, emailLogin, emailPassword }
    : null;
};

const mfaDetails = (credentials: EldoradoAccountCredentials) => {
  const mfaLogin = credentials.mfaLogin?.trim() ?? '';
  const mfaPassword = credentials.mfaPassword?.trim() ?? '';
  return mfaLogin || mfaPassword ? { mfaLogin, mfaPassword } : null;
};

/** Pure builder kept separate so the exact wire payload is unit-testable. */
export const buildAccountOfferPayload = (
  gameId: string,
  draft: ListingDraft,
  input: EldoradoAccountPublishInput,
  images: [EldoradoOfferImage, ...EldoradoOfferImage[]],
  tradeEnvironmentId: string | null = null,
  offerAttributes: SelectedOfferAttribute[] = [],
): EldoradoAccountOfferPayload => {
  const [mainOfferImage, ...offerImages] = images;
  return {
    details: {
      offerTitle: (input.title?.trim() || draft.title).slice(0, 160),
      mainOfferImage,
      offerImages,
      description: (input.description?.trim() || draft.description).slice(0, 2_000),
      guaranteedDeliveryTime: 'Instant',
      pricing: {
        quantity: 1,
        minQuantity: 1,
        volumeDiscounts: [],
        pricePerUnit: { amount: input.priceUsd, currency: 'USD' },
      },
      hasOriginalEmail: input.hasOriginalEmail,
    },
    augmentedGame: {
      gameId,
      category: 'Account',
      tradeEnvironmentId,
      offerAttributes,
    },
    accountDeliveryDetails: [
      {
        accountDetails: {
          accountLogin: input.credentials.accountLogin.trim(),
          accountPassword: input.credentials.accountPassword,
        },
        emailDetails: emailDetails(input.credentials),
        mfaDetails: mfaDetails(input.credentials),
        additionalInfo: optionalText(input.credentials.additionalInfo),
      },
    ],
  };
};

export const eldoradoOfferUrl = (seoAlias: string, offerId: string): string =>
  `https://www.eldorado.gg/${seoAlias}/oa/${offerId}`;
