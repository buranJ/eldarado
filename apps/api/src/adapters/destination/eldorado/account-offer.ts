import type { ListingDraft } from '../types.js';

export const ELDORADO_ACCOUNT_GAMES: Record<
  string,
  { gameId: string; seoAlias: string }
> = {
  'clash-royale': { gameId: '52', seoAlias: 'clash-royale-accounts' },
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
    tradeEnvironmentId: null;
    offerAttributes: never[];
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
      tradeEnvironmentId: null,
      offerAttributes: [],
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
