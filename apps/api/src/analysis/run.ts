import { prisma } from '../lib/db.js';
import { checkSanity } from '../config/sanity.js';
import { buildMarketModel } from './market.js';
import type { MarketModel } from './market.js';
import { scoreQuality } from './quality.js';
import type { Attributes } from './quality.js';
import { scoreRisk } from './risk.js';
import { scoreDeal } from './deal.js';
import { MODEL, RUBRIC_VERSION, estimateCostUsd, extractAttributes } from './extract.js';
import { toAttributeMap } from './schema.js';
import type { Extraction } from './schema.js';

export interface AnalyseOptions {
  gameId?: string;
  /** Cap on how many listings to process in one pass. */
  limit?: number;
  /** Re-analyse listings whose content has not changed since last time. */
  force?: boolean;
  /** Number of listings analysed in parallel. */
  concurrency?: number;
  /** Report what would run without calling the model or writing anything. */
  dryRun?: boolean;
  /** User-owned model key. CLI runs may omit it and use the legacy environment key. */
  apiKey?: string;
  onProgress?: (done: number, total: number) => void;
}

export interface AnalyseReport {
  gameId: string;
  candidates: number;
  analysed: number;
  failed: number;
  skipped: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  cacheWriteTokens: number;
  costUsd: number;
  durationMs: number;
  errors: string[];
}

/**
 * Listings eligible for analysis: passed the pre-filter and still on sale.
 *
 * Ordering matters when the run is capped. Candidates are ranked by the price
 * advantage the market model already sees from source attributes alone, so a
 * partial run spends its budget on the most promising listings instead of
 * whichever happen to be cheapest.
 */
const findCandidates = async (
  gameId: string,
  limit: number,
  force: boolean,
  market: MarketModel,
) => {
  const pool = await prisma.listing.findMany({
    where: {
      gameId,
      disappearedAt: null,
      status: { in: force ? ['ready_for_analysis', 'analyzed', 'needs_review'] : ['ready_for_analysis'] },
    },
    include: { seller: true, analysis: true },
  });

  return pool
    .map((listing) => {
      const fair = market.fairPrice(listing);
      return { listing, advantage: fair === null ? 0 : fair / Math.max(1, listing.priceMinor) };
    })
    .sort((a, b) => b.advantage - a.advantage)
    .slice(0, limit)
    .map((entry) => entry.listing);
};

type Candidate = Awaited<ReturnType<typeof findCandidates>>[number];


const buildModel = async (gameId: string): Promise<MarketModel> => {
  const corpus = await prisma.listing.findMany({
    where: { gameId, disappearedAt: null },
    select: {
      priceMinor: true,
      trophies: true,
      unlockedCards: true,
      legendaryCards: true,
      arena: true,
      accountLevel: true,
    },
  });
  return buildMarketModel(corpus);
};

/**
 * Merges what the seller wrote with what the source published. The seller's own
 * text wins where both exist — the contradiction itself is reported separately
 * by the risk model rather than silently resolved here.
 */
const mergeAttributes = (
  extraction: Extraction,
  sourceAttrs: Record<string, number | boolean | null>,
): Attributes => ({ ...sourceAttrs, ...toAttributeMap(extraction) });

const buildSummary = (
  quality: number,
  deal: number,
  ratio: number | null,
  notes: string,
): string => {
  const value =
    ratio === null
      ? 'Сопоставимых объявлений мало, оценка ориентировочная.'
      : ratio >= 1.5
        ? `Заметно дешевле сопоставимых аккаунтов (примерно в ${ratio.toFixed(1)} раза).`
        : ratio >= 1.05
          ? 'Немного дешевле сопоставимых аккаунтов.'
          : ratio >= 0.9
            ? 'Цена близка к рыночной для таких характеристик.'
            : 'Дороже сопоставимых аккаунтов.';
  const verdict =
    deal >= 75
      ? 'Выгодная покупка.'
      : deal >= 55
        ? 'Умеренно интересный вариант.'
        : 'Покупка сомнительна.';
  return `${notes} Качество аккаунта ${quality} из 100. ${value} ${verdict}`;
};

const strengthsOf = (attrs: Attributes, quality: number): string[] => {
  const out: string[] = [];
  const n = (key: string): number | null =>
    typeof attrs[key] === 'number' ? (attrs[key] as number) : null;

  if ((n('evolutions') ?? 0) >= 10) out.push(`${n('evolutions')} эволюций`);
  if ((n('heroes') ?? 0) >= 5) out.push(`${n('heroes')} героев`);
  if ((n('level16Cards') ?? 0) >= 5) out.push(`${n('level16Cards')} карт 16 уровня`);
  if ((n('trophies') ?? 0) >= 9000) out.push(`${n('trophies')} кубков`);
  if ((n('accountAgeYears') ?? 0) >= 6) out.push(`возраст аккаунта ${n('accountAgeYears')} лет`);
  if ((n('towerSkins') ?? 0) >= 5) out.push(`${n('towerSkins')} скинов башен`);
  if ((n('gems') ?? 0) >= 5000) out.push(`${n('gems')} кристаллов`);
  if (attrs.fullAccess === true && attrs.rebindAvailable === true) {
    out.push('полный доступ с перепривязкой');
  }
  if (out.length === 0 && quality >= 60) out.push('ровные характеристики без слабых мест');
  return out.slice(0, 4);
};

const analyseOne = async (
  listing: Candidate,
  market: MarketModel,
  gameId: string,
  apiKey?: string,
): Promise<import('./extract.js').ExtractionUsage> => {
  const sourceAttrs = (listing.gameData ?? {}) as Record<string, number | boolean | null>;

  const { extraction, usage } = await extractAttributes({
    title: listing.sellerTitle,
    sourceAttrs,
  }, apiKey);

  const attrs = mergeAttributes(extraction, sourceAttrs);
  const quality = scoreQuality(gameId, attrs);

  const fairPriceMinor = market.fairPrice({
    trophies: listing.trophies,
    unlockedCards: listing.unlockedCards,
    legendaryCards: listing.legendaryCards,
    arena: listing.arena,
    accountLevel: listing.accountLevel,
  });
  const priceRatio =
    fairPriceMinor === null ? null : fairPriceMinor / Math.max(1, listing.priceMinor);

  const risk = scoreRisk({
    attrs,
    sourceAttrs,
    seller: {
      rating: listing.seller.rating,
      reviewsCount: listing.seller.reviewsCount,
      accountAgeMonths: listing.seller.accountAgeMonths,
    },
    autoDelivery: listing.autoDelivery,
    dataQuality: quality.dataQuality,
    extractionConfidence: extraction.confidence,
    priceRatio,
    sanityViolations: checkSanity(gameId, sourceAttrs).violations,
  });

  const deal = scoreDeal({
    qualityScore: quality.score,
    riskScore: risk.score,
    priceMinor: listing.priceMinor,
    fairPriceMinor,
    corpusMedianMinor: market.medianPrice,
    dataQuality: quality.dataQuality,
  });

  const adjustedRatio = deal.adjustedFairMinor / Math.max(1, listing.priceMinor);

  await prisma.$transaction([
    prisma.analysis.upsert({
      where: { listingId: listing.id },
      create: {
        listingId: listing.id,
        sourceHash: listing.contentHash,
        modelVersion: MODEL,
        rubricVersion: RUBRIC_VERSION,
        extracted: extraction as object,
        qualityScore: quality.score,
        dealScore: deal.score,
        riskScore: risk.score,
        confidence: extraction.confidence,
        dataQuality: quality.dataQuality,
        fairPriceMinor: deal.adjustedFairMinor,
        resalePriceMinor: deal.resalePriceMinor,
        summary: buildSummary(quality.score, deal.score, adjustedRatio, extraction.notes),
        strengths: strengthsOf(attrs, quality.score),
        risks: risk.reasons.slice(0, 5),
        factors: quality.factors as object,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cachedTokens: usage.cachedTokens,
      },
      update: {
        sourceHash: listing.contentHash,
        modelVersion: MODEL,
        rubricVersion: RUBRIC_VERSION,
        extracted: extraction as object,
        qualityScore: quality.score,
        dealScore: deal.score,
        riskScore: risk.score,
        confidence: extraction.confidence,
        dataQuality: quality.dataQuality,
        fairPriceMinor: deal.adjustedFairMinor,
        resalePriceMinor: deal.resalePriceMinor,
        summary: buildSummary(quality.score, deal.score, adjustedRatio, extraction.notes),
        strengths: strengthsOf(attrs, quality.score),
        risks: risk.reasons.slice(0, 5),
        factors: quality.factors as object,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cachedTokens: usage.cachedTokens,
      },
    }),
    prisma.listing.update({
      where: { id: listing.id },
      data: { status: quality.dataQuality < 35 ? 'needs_review' : 'analyzed' },
    }),
  ]);

  return usage;
};

/** Runs a limited number of tasks at a time to stay inside rate limits. */
const pool = async <T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> => {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      await worker(items[index]);
    }
  });
  await Promise.all(runners);
};

export const analyse = async (options: AnalyseOptions = {}): Promise<AnalyseReport> => {
  const gameId = options.gameId ?? 'clash-royale';
  const startedAt = Date.now();

  const market = await buildModel(gameId);
  const candidates = await findCandidates(
    gameId,
    options.limit ?? 100,
    options.force ?? false,
    market,
  );

  const report: AnalyseReport = {
    gameId,
    candidates: candidates.length,
    analysed: 0,
    failed: 0,
    skipped: 0,
    inputTokens: 0,
    outputTokens: 0,
    cachedTokens: 0,
    cacheWriteTokens: 0,
    costUsd: 0,
    durationMs: 0,
    errors: [],
  };

  const pending = candidates.filter((listing) => {
    // Skip work that would produce the same answer as last time.
    if (!options.force && listing.analysis?.sourceHash === listing.contentHash) {
      report.skipped += 1;
      return false;
    }
    return true;
  });

  if (options.dryRun) {
    report.durationMs = Date.now() - startedAt;
    return report;
  }

  let done = 0;
  await pool(pending, options.concurrency ?? 6, async (listing) => {
    try {
      const usage = await analyseOne(listing, market, gameId, options.apiKey);
      report.analysed += 1;
      report.inputTokens += usage.inputTokens;
      report.outputTokens += usage.outputTokens;
      report.cachedTokens += usage.cachedTokens;
      report.cacheWriteTokens += usage.cacheWriteTokens;
      report.costUsd += estimateCostUsd(usage);
    } catch (error) {
      report.failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      if (report.errors.length < 5) report.errors.push(`${listing.externalId}: ${message}`);
    } finally {
      options.onProgress?.((done += 1), pending.length);
    }
  });

  report.durationMs = Date.now() - startedAt;
  return report;
};
