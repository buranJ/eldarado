import { readFile } from 'node:fs/promises';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { EldoradoApiError, eldoradoClient } from '../adapters/destination/eldorado/client.js';
import {
  buildAccountOfferPayload,
  ELDORADO_ACCOUNT_GAMES,
  eldoradoOfferUrl,
} from '../adapters/destination/eldorado/account-offer.js';
import { buildDraft } from '../adapters/destination/draft.js';
import { ExtractionSchema, toAttributeMap } from '../analysis/schema.js';
import { prisma } from '../lib/db.js';
import { sourceImagePath } from '../lib/source-images.js';
import { convertMinor, DESTINATION_FEE_RATE } from '../config/marketplaces.js';

const optionalField = (max: number) => z.string().max(max).optional();

const publishSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().max(2_000),
  priceUsd: z.number().positive().max(1_000_000),
  hasOriginalEmail: z.boolean(),
  imageDataUrl: z
    .string()
    .max(14_000_000)
    .regex(/^data:image\/(?:jpeg|png|heic|heif);base64,/i, 'Поддерживаются JPEG, PNG и HEIC')
    .optional(),
  imageFileName: z.string().trim().min(1).max(255).optional(),
  accountLogin: z.string().trim().min(1).max(500),
  accountPassword: z.string().min(1).max(500),
  emailProviderUrl: optionalField(1_000),
  emailLogin: optionalField(500),
  emailPassword: optionalField(500),
  mfaLogin: optionalField(500),
  mfaPassword: optionalField(500),
  additionalInfo: optionalField(2_000),
  termsAccepted: z.literal(true),
  rulesAccepted: z.literal(true),
  actor: optionalField(100),
});

const loadInventoryItem = (id: string) =>
  prisma.inventoryItem.findUnique({
    where: { id },
    include: {
      listing: { include: { analysis: true, images: { orderBy: { position: 'asc' } } } },
      listings: true,
    },
  });

type InventoryItem = NonNullable<Awaited<ReturnType<typeof loadInventoryItem>>>;

const draftFor = (item: InventoryItem) => {
  const parsed = ExtractionSchema.safeParse(item.listing.analysis?.extracted);
  const attributes = parsed.success ? toAttributeMap(parsed.data) : {};
  return buildDraft({
    gameName: item.gameId === 'clash-royale' ? 'Clash Royale' : item.gameId,
    sellMinor: item.manualMinor ?? item.recommendedMinor,
    currency: item.purchaseCurrency,
    attributes,
    autoDelivery: true,
  });
};

const parseImage = (dataUrl: string): { bytes: Buffer; mimeType: string } => {
  const match = /^data:(image\/(?:jpeg|png|heic|heif));base64,(.+)$/is.exec(dataUrl);
  if (!match) throw new Error('Некорректный формат изображения');
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length === 0 || bytes.length > 10 * 1024 * 1024) {
    throw new Error('Изображение должно быть не больше 10 МБ');
  }
  return { bytes, mimeType: match[1].toLowerCase() };
};

export const registerDestinationRoutes = (app: FastifyInstance): void => {
  app.get('/api/destinations/eldorado/status', async () => ({
    configured: eldoradoClient.configured,
    mode: eldoradoClient.configured ? 'ready_to_publish' : 'not_configured',
  }));

  app.get('/api/destinations/eldorado/listings', async (request) => {
    const { gameId = 'clash-royale' } = request.query as { gameId?: string };
    const rows = await prisma.marketplaceListing.findMany({
      where: { gameId, marketplace: 'eldorado' },
      include: { item: { include: { listing: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return {
      items: rows.map((row) => {
        const purchaseInSaleCurrency = convertMinor(
          row.purchaseMinor,
          row.purchaseCurrency,
          row.currency,
        );
        const expectedProfitMinor = Math.round(
          row.sellMinor * (1 - DESTINATION_FEE_RATE) - purchaseInSaleCurrency,
        );
        const game = ELDORADO_ACCOUNT_GAMES[row.gameId];
        return {
          id: row.id,
          inventoryItemId: row.itemId,
          accountId: row.item.listing.externalId,
          gameId: row.gameId,
          title: row.title,
          marketplace: row.marketplace,
          externalListingId: row.externalId,
          url: row.externalId && game ? eldoradoOfferUrl(game.seoAlias, row.externalId) : null,
          sellPrice: { amount: row.sellMinor / 100, currency: row.currency },
          purchasePrice: {
            amount: row.purchaseMinor / 100,
            currency: row.purchaseCurrency,
          },
          expectedProfit: {
            amount: expectedProfitMinor / 100,
            currency: row.currency,
          },
          status: row.status,
          createdAt: row.createdAt.toISOString(),
          publishedAt: row.publishedAt?.toISOString() ?? null,
          errorMessage: row.error,
        };
      }),
      total: rows.length,
    };
  });

  /**
   * A deliberate read-only verification endpoint. Creation and other mutations
   * will live in separate routes so a status check can never publish an offer.
   */
  app.get('/api/destinations/eldorado/offers', async (_request, reply) => {
    try {
      const offers = await eldoradoClient.listOffers();
      return { offers, total: offers.length };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const status = error instanceof EldoradoApiError ? error.status : 502;
      return reply.code(status).send({ error: message });
    }
  });

  app.get('/api/inventory/:id/eldorado/preview', async (request, reply) => {
    const { id } = request.params as { id: string };
    const item = await loadInventoryItem(id);
    if (!item) return reply.code(404).send({ error: 'Позиция не найдена' });
    const game = ELDORADO_ACCOUNT_GAMES[item.gameId];
    if (!game) return reply.code(422).send({ error: `Для игры ${item.gameId} Eldorado не настроен` });
    const draft = draftFor(item);
    return {
      title: draft.title,
      description: draft.description,
      gameId: game.gameId,
      currency: 'USD',
      automaticDelivery: true,
      sourceImageUrls: item.listing.images.map(
        (image) => `/api/listings/${item.listing.id}/images/${image.position}`,
      ),
    };
  });

  app.post(
    '/api/inventory/:id/eldorado/publish',
    { bodyLimit: 15 * 1024 * 1024 },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = publishSchema.parse(request.body ?? {});
      const item = await loadInventoryItem(id);
      if (!item) return reply.code(404).send({ error: 'Позиция не найдена' });
      if (!['purchased', 'ready_to_list', 'preparing'].includes(item.status)) {
        return reply.code(409).send({ error: 'Эту позицию нельзя опубликовать в текущем статусе' });
      }
      const game = ELDORADO_ACCOUNT_GAMES[item.gameId];
      if (!game) return reply.code(422).send({ error: `Для игры ${item.gameId} Eldorado не настроен` });
      const existing = item.listings.find(
        (listing) =>
          listing.marketplace === 'eldorado' &&
          listing.externalId !== null &&
          listing.status !== 'deleted',
      );
      if (existing?.externalId) {
        return reply.code(409).send({
          error: 'Для этой позиции уже существует лот Eldorado',
          offerId: existing.externalId,
          url: eldoradoOfferUrl(game.seoAlias, existing.externalId),
        });
      }

      try {
        const imageInput = input.imageDataUrl
          ? parseImage(input.imageDataUrl)
          : item.listing.images[0]
            ? {
                bytes: await readFile(sourceImagePath(item.listing.images[0].fileName)),
                mimeType: item.listing.images[0].mimeType,
              }
            : null;
        if (!imageInput) {
          return reply.code(422).send({ error: 'У позиции нет сохранённого фото аккаунта' });
        }
        const image = await eldoradoClient.uploadAccountImage({
          ...imageInput,
          fileName: input.imageFileName ?? item.listing.images[0]?.fileName ?? 'account.jpg',
        });
        const draft = draftFor(item);
        const payload = buildAccountOfferPayload(
          game.gameId,
          draft,
          {
            title: input.title,
            description: input.description,
            priceUsd: input.priceUsd,
            hasOriginalEmail: input.hasOriginalEmail,
            credentials: {
              accountLogin: input.accountLogin,
              accountPassword: input.accountPassword,
              emailProviderUrl: input.emailProviderUrl,
              emailLogin: input.emailLogin,
              emailPassword: input.emailPassword,
              mfaLogin: input.mfaLogin,
              mfaPassword: input.mfaPassword,
              additionalInfo: input.additionalInfo,
            },
          },
          image,
        );
        const offerId = await eldoradoClient.createAccountOffer(payload);
        const publishedAt = new Date();
        const sellMinor = Math.round(input.priceUsd * 100);

        await prisma.$transaction(async (tx) => {
          await tx.marketplaceListing.create({
            data: {
              itemId: item.id,
              gameId: item.gameId,
              marketplace: 'eldorado',
              externalId: offerId,
              title: payload.details.offerTitle,
              description: payload.details.description,
              sellMinor,
              purchaseMinor: item.purchaseMinor,
              purchaseCurrency: item.purchaseCurrency,
              currency: 'USD',
              status: 'published',
              publishedAt,
            },
          });
          await tx.inventoryItem.update({ where: { id: item.id }, data: { status: 'listed' } });
          await tx.activityEvent.create({
            data: {
              gameId: item.gameId,
              kind: 'listing_published',
              subject: item.listing.externalId,
              title: 'Лот опубликован на Eldorado',
              meta: `${payload.details.offerTitle} · $${input.priceUsd.toFixed(2)} · ${offerId}`,
              actor: input.actor?.trim() || 'оператор',
              listingId: item.listingId,
            },
          });
        });

        return {
          offerId,
          url: eldoradoOfferUrl(game.seoAlias, offerId),
          publishedAt: publishedAt.toISOString(),
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const status = error instanceof EldoradoApiError ? error.status : 502;
        return reply.code(status).send({ error: message });
      }
    },
  );

  app.delete('/api/inventory/:id/eldorado/listing', async (request, reply) => {
    const { id } = request.params as { id: string };
    const item = await loadInventoryItem(id);
    if (!item) return reply.code(404).send({ error: 'Позиция не найдена' });

    const listing = item.listings.find(
      (candidate) =>
        candidate.marketplace === 'eldorado' &&
        candidate.externalId !== null &&
        candidate.status !== 'deleted',
    );
    if (!listing?.externalId) {
      return reply.code(404).send({ error: 'Активный лот Eldorado для позиции не найден' });
    }

    try {
      await eldoradoClient.deleteAccountOffer(listing.externalId);
      await prisma.$transaction(async (tx) => {
        await tx.marketplaceListing.update({
          where: { id: listing.id },
          data: { status: 'deleted' },
        });
        await tx.inventoryItem.update({
          where: { id: item.id },
          data: { status: 'purchased' },
        });
        await tx.activityEvent.create({
          data: {
            gameId: item.gameId,
            kind: 'listing_deleted',
            subject: item.listing.externalId,
            title: 'Лот удалён с Eldorado',
            meta: `${listing.title} · ${listing.externalId}`,
            actor: 'оператор',
            listingId: item.listingId,
          },
        });
      });
      return { deleted: true, offerId: listing.externalId };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const status = error instanceof EldoradoApiError ? error.status : 502;
      return reply.code(status).send({ error: message });
    }
  });
};
