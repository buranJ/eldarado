import type { CollectionRun } from '@gamestock/domain';
import { prisma } from '../lib/db.js';
import { contentHash } from '../lib/hash.js';
import { prefilter } from './prefilter.js';
import { PREFILTER } from '../config/prefilter.js';
import { funPayAdapter } from '../adapters/source/funpay/index.js';
import type { RawOffer, SourceAdapter, SourceImage } from '../adapters/source/types.js';
import { deleteSourceImages, saveSourceImage } from '../lib/source-images.js';

const ADAPTERS: SourceAdapter[] = [funPayAdapter];

/** Statuses owned by later stages — the collector must never overwrite them. */
const DOWNSTREAM_STATUSES = new Set(['analyzed', 'approved', 'rejected', 'purchased']);

export const getAdapter = (marketplace: string): SourceAdapter => {
  const adapter = ADAPTERS.find((item) => item.id === marketplace);
  if (!adapter) throw new Error(`Источник ${marketplace} не зарегистрирован`);
  return adapter;
};

/** Attributes lifted out of `gameData` into real columns for querying. */
const promoted = (offer: RawOffer) => ({
  trophies: (offer.gameData.trophies as number | null) ?? null,
  arena: (offer.gameData.arena as number | null) ?? null,
  unlockedCards: (offer.gameData.unlockedCards as number | null) ?? null,
  legendaryCards: (offer.gameData.legendaryCards as number | null) ?? null,
  accountLevel: (offer.gameData.accountLevel as number | null) ?? null,
});

/** Fields whose change should invalidate a previous analysis. */
const hashOf = (offer: RawOffer): string =>
  contentHash({
    title: offer.sellerTitle,
    price: offer.price.minor,
    currency: offer.price.currency,
    auto: offer.autoDelivery,
    game: JSON.stringify(offer.gameData),
  });

export interface CollectOptions {
  marketplace?: string;
  gameId?: string;
  /** Parse and report without writing to the database. */
  dryRun?: boolean;
}

/**
 * One collection sweep: fetch a category, upsert every offer, run the
 * pre-filter, and mark listings that vanished from the source.
 */
export const collect = async (options: CollectOptions = {}): Promise<CollectionRun> => {
  const marketplace = options.marketplace ?? 'funpay';
  const gameId = options.gameId ?? 'clash-royale';
  const adapter = getAdapter(marketplace);
  const config = PREFILTER[gameId];
  if (!config) throw new Error(`Для игры ${gameId} не настроен предфильтр`);

  const startedAt = new Date();
  const run = options.dryRun
    ? null
    : await prisma.collectionRun.create({ data: { marketplace, gameId } });

  const counters = {
    seen: 0,
    created: 0,
    updated: 0,
    unchanged: 0,
    passed: 0,
    rejected: 0,
    disappeared: 0,
  };

  try {
    const offers = await adapter.collect(gameId);
    counters.seen = offers.length;

    if (options.dryRun) {
      for (const offer of offers) {
        if (prefilter(offer, config, gameId).passed) counters.passed += 1;
        else counters.rejected += 1;
      }
    } else {
      const seenIds: string[] = [];

      for (const offer of offers) {
        const verdict = prefilter(offer, config, gameId);
        const hash = hashOf(offer);
        const existing = await prisma.listing.findUnique({
          where: { marketplace_externalId: { marketplace, externalId: offer.externalId } },
          select: {
            id: true,
            contentHash: true,
            status: true,
            inventory: { select: { id: true } },
            images: { orderBy: { position: 'asc' } },
          },
        });

        let downloadedImages: SourceImage[] | null = null;
        let imageCheckFailed = false;
        if (adapter.loadImages && (!existing?.images.length || existing.contentHash !== hash)) {
          try {
            downloadedImages = await adapter.loadImages(offer.externalId, 4);
          } catch (error) {
            imageCheckFailed = true;
            console.warn(
              `FunPay ${offer.externalId}: фото не проверено — ${error instanceof Error ? error.message : error}`,
            );
          }
        }

        const hasImages = (downloadedImages?.length ?? existing?.images.length ?? 0) > 0;
        if (!hasImages) {
          counters.rejected += 1;
          if (
            existing &&
            !imageCheckFailed &&
            !DOWNSTREAM_STATUSES.has(existing.status) &&
            !existing.inventory
          ) {
            await prisma.listing.delete({ where: { id: existing.id } });
            await deleteSourceImages(existing.images.map((image) => image.fileName));
          }
          continue;
        }

        seenIds.push(offer.externalId);
        if (verdict.passed) counters.passed += 1;
        else counters.rejected += 1;

        const seller = await prisma.seller.upsert({
          where: {
            marketplace_externalId: { marketplace, externalId: offer.seller.externalId },
          },
          create: {
            marketplace,
            externalId: offer.seller.externalId,
            name: offer.seller.name,
            rating: offer.seller.rating,
            reviewsCount: offer.seller.reviewsCount,
            accountAgeLabel: offer.seller.accountAgeLabel,
            accountAgeMonths: offer.seller.accountAgeMonths,
            isOnline: offer.seller.isOnline,
            profileUrl: offer.seller.profileUrl,
          },
          update: {
            name: offer.seller.name,
            rating: offer.seller.rating,
            reviewsCount: offer.seller.reviewsCount,
            accountAgeLabel: offer.seller.accountAgeLabel,
            accountAgeMonths: offer.seller.accountAgeMonths,
            isOnline: offer.seller.isOnline,
            lastSeenAt: new Date(),
          },
        });

        const nextStatus = verdict.passed ? 'ready_for_analysis' : 'prefiltered_out';

        if (!existing) {
          counters.created += 1;
        } else if (existing.contentHash === hash) {
          counters.unchanged += 1;
        } else {
          counters.updated += 1;
        }

        /*
         * Decisions made downstream (by AI scoring or an operator) survive a
         * re-collect. The pre-filter verdict itself is always recomputed, so
         * changing the rules re-classifies listings that have not changed.
         */
        const keepStatus = DOWNSTREAM_STATUSES.has(existing?.status ?? '')
          ? (existing as { status: string }).status
          : nextStatus;

        const savedListing = await prisma.listing.upsert({
          where: { marketplace_externalId: { marketplace, externalId: offer.externalId } },
          create: {
            marketplace,
            externalId: offer.externalId,
            gameId,
            url: offer.url,
            rawTitle: offer.rawTitle,
            sellerTitle: offer.sellerTitle,
            priceMinor: offer.price.minor,
            priceCurrency: offer.price.currency,
            autoDelivery: offer.autoDelivery,
            gameData: offer.gameData as object,
            ...promoted(offer),
            contentHash: hash,
            status: nextStatus,
            prefilterReasons: verdict.reasons,
            sellerId: seller.id,
          },
          update: {
            url: offer.url,
            rawTitle: offer.rawTitle,
            sellerTitle: offer.sellerTitle,
            priceMinor: offer.price.minor,
            priceCurrency: offer.price.currency,
            autoDelivery: offer.autoDelivery,
            gameData: offer.gameData as object,
            ...promoted(offer),
            contentHash: hash,
            status: keepStatus,
            prefilterReasons: verdict.reasons,
            sellerId: seller.id,
            lastSeenAt: new Date(),
            disappearedAt: null,
          },
        });

        if (downloadedImages) {
          const stored = await Promise.all(
            downloadedImages.map(async (image, position) => ({
              listingId: savedListing.id,
              position,
              sourceUrl: image.sourceUrl,
              fileName: await saveSourceImage(offer.externalId, position, image),
              mimeType: image.mimeType,
            })),
          );
          await prisma.$transaction([
            prisma.listingImage.deleteMany({ where: { listingId: savedListing.id } }),
            prisma.listingImage.createMany({ data: stored }),
          ]);
          const storedNames = new Set(stored.map((image) => image.fileName));
          await deleteSourceImages(
            (existing?.images ?? [])
              .map((image) => image.fileName)
              .filter((fileName) => !storedNames.has(fileName)),
          );
        }
      }

      await prisma.seller.deleteMany({ where: { listings: { none: {} } } });

      const gone = await prisma.listing.updateMany({
        where: {
          marketplace,
          gameId,
          externalId: { notIn: seenIds },
          disappearedAt: null,
        },
        data: { disappearedAt: new Date() },
      });
      counters.disappeared = gone.count;
    }

    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - startedAt.getTime();

    if (run) {
      const saved = await prisma.collectionRun.update({
        where: { id: run.id },
        data: { ...counters, status: 'ok', finishedAt, durationMs },
      });
      return toDomain(saved);
    }

    return {
      id: 'dry-run',
      marketplace,
      gameId,
      status: 'ok',
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs,
      ...counters,
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (run) {
      await prisma.collectionRun.update({
        where: { id: run.id },
        data: { status: 'failed', error: message, finishedAt: new Date() },
      });
    }
    throw error;
  }
};

type CollectionRunRow = {
  id: string;
  marketplace: string;
  gameId: string;
  status: string;
  startedAt: Date;
  finishedAt: Date | null;
  durationMs: number | null;
  seen: number;
  created: number;
  updated: number;
  unchanged: number;
  passed: number;
  rejected: number;
  disappeared: number;
  error: string | null;
};

export const toDomain = (row: CollectionRunRow): CollectionRun => ({
  id: row.id,
  marketplace: row.marketplace,
  gameId: row.gameId,
  status: row.status as CollectionRun['status'],
  startedAt: row.startedAt.toISOString(),
  finishedAt: row.finishedAt?.toISOString() ?? null,
  durationMs: row.durationMs,
  seen: row.seen,
  created: row.created,
  updated: row.updated,
  unchanged: row.unchanged,
  passed: row.passed,
  rejected: row.rejected,
  disappeared: row.disappeared,
  error: row.error,
});
