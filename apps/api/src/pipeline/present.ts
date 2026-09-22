import type { CurrencyCode } from '@gamestock/domain';

/**
 * Shapes a database row into the payload the web app consumes. Deliberately
 * close to `GameAccount` so the UI needs no special-casing, but analysis fields
 * stay null until stage 2 fills them in.
 */
/** Extraction payload as stored: lists of the values the model actually found. */
interface ExtractedPayload {
  numbers?: { field: string; value: number }[];
  flags?: { field: string; value: boolean }[];
  restrictions?: string;
}

interface AnalysisRow {
  extracted: unknown;
  qualityScore: number;
  dealScore: number;
  riskScore: number;
  confidence: number;
  dataQuality: number;
  fairPriceMinor: number | null;
  resalePriceMinor: number | null;
  summary: string;
  strengths: unknown;
  risks: unknown;
  factors: unknown;
  modelVersion: string;
  createdAt: Date;
}

interface ListingRow {
  id: string;
  marketplace: string;
  externalId: string;
  gameId: string;
  url: string;
  rawTitle: string;
  sellerTitle: string;
  priceMinor: number;
  priceCurrency: string;
  autoDelivery: boolean;
  images: { position: number }[];
  gameData: unknown;
  trophies: number | null;
  arena: number | null;
  unlockedCards: number | null;
  legendaryCards: number | null;
  accountLevel: number | null;
  status: string;
  prefilterReasons: unknown;
  firstSeenAt: Date;
  lastSeenAt: Date;
  disappearedAt: Date | null;
  analysis?: AnalysisRow | null;
  seller: {
    externalId: string;
    name: string;
    rating: number | null;
    reviewsCount: number;
    accountAgeLabel: string | null;
    accountAgeMonths: number | null;
    isOnline: boolean;
    profileUrl: string | null;
  };
}

const DESTINATION_FEE_RATE = 0.1;

const boolOf = (
  data: Record<string, number | boolean | string | null>,
  key: string,
): boolean | null => (typeof data[key] === 'boolean' ? (data[key] as boolean) : null);

const numberOf = (
  data: Record<string, number | boolean | string | null>,
  key: string,
): number | null => (typeof data[key] === 'number' ? (data[key] as number) : null);

/** Shapes a stored analysis into the `AIAnalysis` payload the UI expects. */
const toApiAnalysis = (
  analysis: AnalysisRow | null,
  priceMinor: number,
  currency: string,
) => {
  if (!analysis) return null;
  const money = (minor: number) => ({ amount: minor / 100, currency: currency as CurrencyCode });
  const resaleMinor = analysis.resalePriceMinor ?? 0;
  const profitMinor = Math.round(resaleMinor * (1 - DESTINATION_FEE_RATE) - priceMinor);

  return {
    status: analysis.dataQuality < 35 ? ('needs_review' as const) : ('analyzed' as const),
    analyzedAt: analysis.createdAt.toISOString(),
    modelVersion: analysis.modelVersion,
    qualityScore: analysis.qualityScore,
    dealScore: analysis.dealScore,
    riskScore: analysis.riskScore,
    analysisConfidence: analysis.confidence,
    estimatedMarketValue: money(analysis.fairPriceMinor ?? 0),
    recommendedResalePrice: money(resaleMinor),
    estimatedProfit: money(profitMinor),
    estimatedMarginPercent:
      Math.round((profitMinor / Math.max(1, priceMinor)) * 1000) / 10,
    comparableListings: 25,
    summary: analysis.summary,
    strengths: (analysis.strengths ?? []) as string[],
    risks: (analysis.risks ?? []) as string[],
    qualityFactors: (analysis.factors ?? []) as unknown[],
  };
};

export const toApiAccount = (row: ListingRow) => {
  const sourceData = (row.gameData ?? {}) as Record<string, number | boolean | string | null>;
  /*
   * Attributes the model read out of the seller's title are layered over the
   * ones the marketplace published, so the UI shows everything that is known
   * about a listing regardless of where it came from.
   */
  const extracted = (row.analysis?.extracted ?? {}) as ExtractedPayload;
  const gameData: Record<string, number | boolean | string | null> = { ...sourceData };
  for (const entry of extracted.numbers ?? []) gameData[entry.field] = entry.value;
  for (const entry of extracted.flags ?? []) gameData[entry.field] = entry.value;
  const imageUrls = [...row.images]
    .sort((left, right) => left.position - right.position)
    .map((image) => `/api/listings/${row.id}/images/${image.position}`);
  return {
    id: row.id,
    externalId: row.externalId,
    gameId: row.gameId,
    status: row.status,
    prefilterReasons: (row.prefilterReasons ?? []) as string[],
    disappearedAt: row.disappearedAt?.toISOString() ?? null,
    source: {
      marketplace: row.marketplace,
      listingId: row.externalId,
      url: row.url,
      title: row.sellerTitle || row.rawTitle,
      rawTitle: row.rawTitle,
      price: { amount: row.priceMinor / 100, currency: row.priceCurrency as CurrencyCode },
      detectedCurrency: row.priceCurrency as CurrencyCode,
      autoDelivery: row.autoDelivery,
      imageUrl: imageUrls[0] ?? null,
      imageUrls,
      foundAt: row.firstSeenAt.toISOString(),
      lastSeenAt: row.lastSeenAt.toISOString(),
      seller: {
        id: row.seller.externalId,
        name: row.seller.name,
        rating: row.seller.rating,
        reviewsCount: row.seller.reviewsCount,
        accountAgeMonths: row.seller.accountAgeMonths,
        accountAgeLabel: row.seller.accountAgeLabel,
        isNew: (row.seller.accountAgeMonths ?? 0) < 6,
        isOnline: row.seller.isOnline,
        profileUrl: row.seller.profileUrl,
      },
    },
    gameData: {
      kind: 'clash-royale' as const,
      arena: row.arena,
      arenaName: row.arena === null ? null : `Арена ${row.arena}`,
      trophies: numberOf(gameData, 'trophies') ?? row.trophies,
      unlockedCards: numberOf(gameData, 'unlockedCards') ?? row.unlockedCards,
      legendaryCards: numberOf(gameData, 'legendaryCards') ?? row.legendaryCards,
      accountLevel: numberOf(gameData, 'accountLevel') ?? row.accountLevel,
      nameChangeAvailable: (gameData.nameChangeAvailable as boolean | null) ?? null,
      // Read out of the seller's title by the extraction stage.
      kingTowerLevel: numberOf(gameData, 'kingTowerLevel'),
      collectionLevel: numberOf(gameData, 'collectionLevel'),
      highestTrophies: numberOf(gameData, 'highestTrophies'),
      // The source does not publish the game's total card count.
      totalCards: null,
      level16Cards: numberOf(gameData, 'level16Cards'),
      level15Cards: numberOf(gameData, 'level15Cards'),
      level14Cards: numberOf(gameData, 'level14Cards'),
      evolutions: numberOf(gameData, 'evolutions'),
      heroes: numberOf(gameData, 'heroes'),
      gems: numberOf(gameData, 'gems'),
      gold: numberOf(gameData, 'gold'),
      accountAgeYears: numberOf(gameData, 'accountAgeYears'),
      emotes: numberOf(gameData, 'emotes'),
      rareEmotes: numberOf(gameData, 'rareEmotes'),
      towerSkins: numberOf(gameData, 'towerSkins'),
      banners: numberOf(gameData, 'banners'),
      achievements: { topGlobal: null, grandTournament: null, twentyWinChallenge: null },
      sourceAttributes: gameData,
    },
    /* Transfer terms come from the seller's free text; null renders as «Нет данных». */
    transfer: {
      fullAccess: boolOf(gameData, 'fullAccess'),
      emailAccess: boolOf(gameData, 'emailAccess'),
      rebindAvailable: boolOf(gameData, 'rebindAvailable'),
      originalEmail: boolOf(gameData, 'originalEmail'),
      restrictions: extracted.restrictions?.trim() || null,
    },
    tags: [],
    analysis: toApiAnalysis(row.analysis ?? null, row.priceMinor, row.priceCurrency),
    dataQuality: row.analysis?.dataQuality ?? null,
  };
};

export type ApiAccount = ReturnType<typeof toApiAccount>;
