import { readFile } from 'node:fs/promises';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { EldoradoApiError } from '../adapters/destination/eldorado/client.js';
import { eldoradoClientForUser } from '../adapters/destination/eldorado/user-client.js';
import {
  buildAccountOfferPayload,
  ELDORADO_ACCOUNT_GAMES,
  eldoradoOfferUrl,
} from '../adapters/destination/eldorado/account-offer.js';
import type { EldoradoOfferImage } from '../adapters/destination/eldorado/account-offer.js';
import { buildDraft } from '../adapters/destination/draft.js';
import { ExtractionSchema, toAttributeMap } from '../analysis/schema.js';
import { prisma } from '../lib/db.js';
import { sourceImagePath } from '../lib/source-images.js';
import { convertMinor, DESTINATION_FEE_RATE } from '../config/marketplaces.js';
import { translateGameTitle } from '../localization/games.js';

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

const loadInventoryItem = (id: string, userId: string) =>
  prisma.inventoryItem.findFirst({
    where: { id, userId },
    include: {
      listing: { include: { analysis: true, images: { orderBy: { position: 'asc' } } } },
      listings: true,
    },
  });

type InventoryItem = NonNullable<Awaited<ReturnType<typeof loadInventoryItem>>>;

const eldoradoState = (state: string): string => {
  switch (state.toLowerCase()) {
    case 'active':
    case 'published':
      return 'published';
    case 'paused':
    case 'inactive':
      return 'paused';
    case 'sold':
      return 'sold';
    case 'closed':
      return 'closed';
    case 'deleted':
      return 'deleted';
    default:
      return 'error';
  }
};

const saleState = (
  state: string,
): 'completed' | 'pending_payout' | 'canceled' | 'refunded' | 'disputed' => {
  switch (state.toLowerCase()) {
    case 'completed':
      return 'completed';
    case 'canceled':
    case 'cancelled':
      return 'canceled';
    case 'refunded':
      return 'refunded';
    case 'disputed':
      return 'disputed';
    default:
      return 'pending_payout';
  }
};

const INTERNAL_GAME_IDS: Record<string, string> = {
  '21': 'pubg-mobile',
  '52': 'clash-royale',
  '339': 'car-parking-multiplayer',
  '340': 'standoff-2',
  '358': 'arknights-endfield',
  '179': 'eldorado-179',
  '166': 'eldorado-166',
};

const GAME_LABELS: Record<string, string> = {
  'clash-royale': 'Clash Royale',
  'pubg-mobile': 'PUBG Mobile',
  'car-parking-multiplayer': 'Car Parking Multiplayer',
  'arknights-endfield': 'Arknights: Endfield',
  'standoff-2': 'Standoff 2',
  'eldorado-179': 'Jujutsu Kaisen Phantom Parade',
  'eldorado-166': 'Arknights',
};

const internalGameId = (eldoradoGameId: string): string =>
  INTERNAL_GAME_IDS[eldoradoGameId] ?? `eldorado-${eldoradoGameId}`;

const draftFor = (item: InventoryItem) => {
  const parsed = ExtractionSchema.safeParse(item.listing.analysis?.extracted);
  const sourceAttributes =
    typeof item.listing.gameData === 'object' && item.listing.gameData !== null
      ? (item.listing.gameData as Record<string, number | boolean | string | null>)
      : {};
  const attributes = {
    ...sourceAttributes,
    ...(parsed.success ? toAttributeMap(parsed.data) : {}),
  };
  const storedTitle =
    typeof sourceAttributes.titleEn === 'string' ? sourceAttributes.titleEn.trim() : '';
  const sellerSummary = storedTitle || translateGameTitle(item.gameId, item.listing.sellerTitle);
  return buildDraft({
    gameName: GAME_LABELS[item.gameId] ?? item.gameId,
    sellerSummary,
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
  app.get('/api/destinations/eldorado/status', async (request) => {
    const client = await eldoradoClientForUser(request.user!.id);
    return {
      configured: client.configured,
      mode: client.configured ? 'ready_to_publish' : 'not_configured',
    };
  });

  app.get('/api/destinations/eldorado/listings', async (request) => {
    const eldoradoClient = await eldoradoClientForUser(request.user!.id);
    const rows = await prisma.marketplaceListing.findMany({
      where: { marketplace: 'eldorado', item: { userId: request.user!.id } },
      include: { item: { include: { listing: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const localItems = rows.map((row) => {
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
        gameLabel: GAME_LABELS[row.gameId] ?? row.gameId,
        title: row.title,
        marketplace: row.marketplace,
        source: 'gamestock' as const,
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
    });

    let remoteError: string | null = null;
    let remoteOffers: Awaited<ReturnType<typeof eldoradoClient.listOffers>> = [];
    let accountGames: Awaited<ReturnType<typeof eldoradoClient.listAccountGames>> = [];
    try {
      remoteOffers = await eldoradoClient.listOffers();
    } catch (error) {
      remoteError = error instanceof Error ? error.message : String(error);
    }
    try {
      accountGames = await eldoradoClient.listAccountGames();
    } catch (error) {
      remoteError ??= error instanceof Error ? error.message : String(error);
    }

    const localIds = new Set(rows.map((row) => row.externalId).filter(Boolean));
    const gamesById = new Map(accountGames.map((game) => [game.gameId, game]));
    const externalItems = remoteOffers
      .filter((offer) => !localIds.has(offer.id))
      .map((offer) => {
        const game = gamesById.get(offer.gameId);
        return {
          id: `eldorado:${offer.id}`,
          inventoryItemId: null,
          accountId: 'Внешний лот',
          gameId: internalGameId(offer.gameId),
          gameLabel: game?.gameName ?? `Игра Eldorado ${offer.gameId}`,
          title: offer.title,
          marketplace: 'eldorado',
          source: 'eldorado' as const,
          externalListingId: offer.id,
          url: game ? eldoradoOfferUrl(game.seoAlias, offer.id) : null,
          sellPrice: offer.price,
          purchasePrice: null,
          expectedProfit: null,
          status: eldoradoState(offer.state),
          createdAt: null,
          publishedAt: null,
          errorMessage: null,
        };
      });

    const items = [...externalItems, ...localItems];
    return {
      items,
      total: items.length,
      remoteError,
    };
  });

  app.get('/api/destinations/eldorado/sales', async (request, reply) => {
    const query = z.object({ gameId: z.string().optional() }).parse(request.query ?? {});
    try {
      const eldoradoClient = await eldoradoClientForUser(request.user!.id);
      const orders = (await eldoradoClient.listSellerOrders()).filter(
        (order) => order.category.toLowerCase() === 'account',
      );
      const offerIds = [...new Set(orders.map((order) => order.offerId))];
      const localListings = await prisma.marketplaceListing.findMany({
        where: {
          marketplace: 'eldorado',
          externalId: { in: offerIds },
          item: { userId: request.user!.id },
        },
        include: { item: { include: { listing: true } } },
      });
      const localByOfferId = new Map(
        localListings.flatMap((listing) =>
          listing.externalId ? [[listing.externalId, listing] as const] : [],
        ),
      );

      const items = orders.flatMap((order) => {
        const gameId = internalGameId(order.gameId);
        if (query.gameId && query.gameId !== gameId) return [];
        const local = localByOfferId.get(order.offerId);
        const status = saleState(order.state);
        const financiallySettled = status === 'completed' || status === 'pending_payout';
        const feeMinor =
          local && financiallySettled
            ? Math.round(order.totalPrice.amount * 100 * DESTINATION_FEE_RATE)
            : null;
        const purchaseInSaleCurrencyMinor = local
          ? convertMinor(local.purchaseMinor, local.purchaseCurrency, order.totalPrice.currency)
          : null;
        const netProfitMinor =
          feeMinor !== null && purchaseInSaleCurrencyMinor !== null
            ? Math.round(order.totalPrice.amount * 100) - feeMinor - purchaseInSaleCurrencyMinor
            : null;
        const roiPercent =
          netProfitMinor !== null && purchaseInSaleCurrencyMinor && purchaseInSaleCurrencyMinor > 0
            ? Math.round((netProfitMinor / purchaseInSaleCurrencyMinor) * 1_000) / 10
            : null;

        return [{
          id: order.id,
          listingId: local?.id ?? null,
          accountId: local?.item.listing.externalId ?? order.offerId,
          gameId,
          title: order.title,
          marketplace: 'eldorado' as const,
          purchasePrice: local
            ? { amount: local.purchaseMinor / 100, currency: local.purchaseCurrency }
            : null,
          salePrice: order.totalPrice,
          fees:
            feeMinor === null
              ? null
              : { amount: feeMinor / 100, currency: order.totalPrice.currency },
          netProfit:
            netProfitMinor === null
              ? null
              : { amount: netProfitMinor / 100, currency: order.totalPrice.currency },
          roiPercent,
          soldAt: order.stateChangedAt ?? order.createdAt,
          status,
          url: `https://www.eldorado.gg/order/${encodeURIComponent(order.id)}`,
        }];
      });

      return { items, total: items.length };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const status = error instanceof EldoradoApiError ? error.status : 502;
      return reply.code(status).send({ error: message });
    }
  });

  /**
   * A deliberate read-only verification endpoint. Creation and other mutations
   * will live in separate routes so a status check can never publish an offer.
   */
  app.get('/api/destinations/eldorado/offers', async (request, reply) => {
    try {
      const eldoradoClient = await eldoradoClientForUser(request.user!.id);
      const offers = await eldoradoClient.listOffers();
      return { offers, total: offers.length };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const status = error instanceof EldoradoApiError ? error.status : 502;
      return reply.code(status).send({ error: message });
    }
  });

  app.delete('/api/destinations/eldorado/offers/:offerId', async (request, reply) => {
    const { offerId } = request.params as { offerId: string };
    try {
      const eldoradoClient = await eldoradoClientForUser(request.user!.id);
      await eldoradoClient.deleteAccountOffer(offerId);
      return { deleted: true, offerId };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const status = error instanceof EldoradoApiError ? error.status : 502;
      return reply.code(status).send({ error: message });
    }
  });

  app.get('/api/inventory/:id/eldorado/preview', async (request, reply) => {
    const { id } = request.params as { id: string };
    const item = await loadInventoryItem(id, request.user!.id);
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
      const item = await loadInventoryItem(id, request.user!.id);
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
        const eldoradoClient = await eldoradoClientForUser(request.user!.id);
        const storedImages = item.listing.images.slice(0, 4);
        const imageInputs: Array<{ bytes: Buffer; mimeType: string; fileName: string }> = await Promise.all(
          storedImages.map(async (image) => ({
            bytes: await readFile(sourceImagePath(image.fileName)),
            mimeType: image.mimeType,
            fileName: image.fileName,
          })),
        );
        if (input.imageDataUrl) {
          const replacement = parseImage(input.imageDataUrl);
          imageInputs[0] = {
            ...replacement,
            fileName: input.imageFileName ?? 'account.jpg',
          };
        }
        if (imageInputs.length === 0) {
          return reply.code(422).send({ error: 'У позиции нет сохранённого фото аккаунта' });
        }
        const uploadedImages: EldoradoOfferImage[] = [];
        for (const imageInput of imageInputs) {
          uploadedImages.push(await eldoradoClient.uploadAccountImage(imageInput));
        }
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
          uploadedImages as [EldoradoOfferImage, ...EldoradoOfferImage[]],
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
              userId: request.user!.id,
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
    const item = await loadInventoryItem(id, request.user!.id);
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
      const eldoradoClient = await eldoradoClientForUser(request.user!.id);
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
            userId: request.user!.id,
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
