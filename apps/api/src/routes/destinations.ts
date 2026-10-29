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
import {
  loadAccountOfferOptions,
  inferTradeEnvironmentId,
  resolveAccountOfferSelection,
} from '../adapters/destination/eldorado/offer-options.js';
import { buildDraft } from '../adapters/destination/draft.js';
import { ExtractionSchema, toAttributeMap } from '../analysis/schema.js';
import { prisma } from '../lib/db.js';
import { sourceImagePath } from '../lib/source-images.js';
import { gamePosterPath, gamePosterUrl } from '../lib/game-posters.js';
import {
  convertMinor,
  DESTINATION_FEE_RATE,
  recommendedResaleMinor,
} from '../config/marketplaces.js';
import { translateGameTitle } from '../localization/games.js';
import { calculateSaleFinancials } from '../sales/financials.js';
import { soldOfferIdsFromOrders, syncLocalEldoradoSaleStatuses } from '../sales/sync-local-statuses.js';

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
  tradeEnvironmentId: z.string().max(100).nullable().optional(),
  offerAttributes: z.record(z.string(), z.string().max(100)).optional(),
  numericAttributes: z.record(z.string(), z.number().finite()).optional(),
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
  '154': 'honkai-impact-3rd',
  '37': 'rust',
  '17': 'league-of-legends',
  '55': 'mobile-legends',
  '18': 'clash-of-clans',
  '194': 'zenless-zone-zero',
  '190': 'wuthering-waves',
  '330': 'world-of-warships',
  '14': 'wow-mists-of-pandaria-classic',
  '0': 'world-of-warcraft',
  '240': 'world-of-tanks',
  '208': 'whiteout-survival',
  '323': 'where-winds-meet',
  '325': 'watcher-of-realms',
  '11': 'warframe',
  '474': 'wardogs',
  '80': 'war-thunder',
  '77': '8-ball-pool',
  '426': 'afk-journey',
  '41': 'albion-online',
  '319': 'arc-raiders',
  '478': 'aniimo',
  '321': 'arena-breakout',
  '33': 'apex-legends',
  '24': 'black-desert-online',
};

const GAME_LABELS: Record<string, string> = {
  'clash-royale': 'Clash Royale',
  'pubg-mobile': 'PUBG Mobile',
  'car-parking-multiplayer': 'Car Parking Multiplayer',
  'arknights-endfield': 'Arknights: Endfield',
  'standoff-2': 'Standoff 2',
  'eldorado-179': 'Jujutsu Kaisen Phantom Parade',
  'eldorado-166': 'Arknights',
  'honkai-impact-3rd': 'Honkai Impact 3rd',
  rust: 'Rust',
  'league-of-legends': 'League of Legends',
  'mobile-legends': 'Mobile Legends',
  'clash-of-clans': 'Clash of Clans',
  'zenless-zone-zero': 'Zenless Zone Zero',
  'wuthering-waves': 'Wuthering Waves',
  'world-of-warships': 'World of Warships',
  'wow-mists-of-pandaria-classic': 'World of Warcraft Mists of Pandaria Classic',
  'world-of-warcraft': 'World of Warcraft',
  'world-of-tanks': 'World of Tanks',
  'whiteout-survival': 'Whiteout Survival',
  'where-winds-meet': 'Where Winds Meet',
  'watcher-of-realms': 'Watcher of Realms',
  warframe: 'Warframe',
  wardogs: 'WARDOGS',
  'war-thunder': 'War Thunder',
  '8-ball-pool': '8 Ball Pool',
  'afk-journey': 'AFK Journey',
  'albion-online': 'Albion Online',
  'arc-raiders': 'ARC Raiders',
  aniimo: 'Aniimo',
  'arena-breakout': 'Arena Breakout',
  'apex-legends': 'Apex Legends',
  'black-desert-online': 'Black Desert Online',
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
  const draft = buildDraft({
    gameName: GAME_LABELS[item.gameId] ?? item.gameId,
    sellerSummary,
    sellMinor: item.manualMinor ?? recommendedResaleMinor(item),
    currency: item.purchaseCurrency,
    attributes,
    autoDelivery: true,
  });
  if (item.listing.images.length === 0 && gamePosterPath(item.gameId)) {
    draft.description += '\n\nCover image is an illustration, not a screenshot of this account.';
  }
  return draft;
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
  app.get('/api/game-posters/:gameId', async (request, reply) => {
    const { gameId } = request.params as { gameId: string };
    const path = gamePosterPath(gameId);
    if (!path) return reply.code(404).send({ error: 'Постер игры не найден' });
    return reply.type('image/jpeg').header('Cache-Control', 'private, max-age=86400').send(await readFile(path));
  });

  app.get('/api/destinations/eldorado/status', async (request) => {
    const client = await eldoradoClientForUser(request.user!.id);
    return {
      configured: client.configured,
      mode: client.configured ? 'ready_to_publish' : 'not_configured',
    };
  });

  app.get('/api/destinations/eldorado/listings', async (request) => {
    const eldoradoClient = await eldoradoClientForUser(request.user!.id);
    try {
      await syncLocalEldoradoSaleStatuses(request.user!.id);
    } catch (error) {
      request.log.warn({ err: error }, 'Не удалось обновить статусы продаж Eldorado');
    }
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
        sourceUrl: row.item.listing.url,
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
          sourceUrl: null,
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

      await Promise.all(
        orders.map(async (order) => {
          const status = saleState(order.state);
          const totalMinor = Math.round(order.totalPrice.amount * 100);
          const actualFee = order.fee?.currency === order.totalPrice.currency
            ? Math.round(order.fee.amount * 100)
            : null;
          const estimatedFee = Math.round(totalMinor * DESTINATION_FEE_RATE);
          await prisma.eldoradoSaleSnapshot.upsert({
            where: {
              userId_externalId: { userId: request.user!.id, externalId: order.id },
            },
            create: {
              userId: request.user!.id,
              externalId: order.id,
              offerId: order.offerId,
              gameId: internalGameId(order.gameId),
              title: order.title,
              status,
              totalMinor,
              currency: order.totalPrice.currency,
              feeMinor: actualFee ?? estimatedFee,
              feeEstimated: actualFee === null,
              remoteCreatedAt: new Date(order.createdAt),
              remoteStateChangedAt: order.stateChangedAt ? new Date(order.stateChangedAt) : null,
            },
            update: {
              offerId: order.offerId,
              title: order.title,
              status,
              totalMinor,
              currency: order.totalPrice.currency,
              feeMinor: actualFee ?? estimatedFee,
              feeEstimated: actualFee === null,
              remoteStateChangedAt: order.stateChangedAt ? new Date(order.stateChangedAt) : null,
            },
          });
        }),
      );

      // Multiple orders may reference the same offer (for example, one canceled
      // and one completed). Resolve the offer once so parallel writes cannot
      // randomly replace a confirmed sale with a canceled order's state.
      const soldListings = [...soldOfferIdsFromOrders(orders)]
        .map((offerId) => localByOfferId.get(offerId))
        .filter((listing): listing is NonNullable<typeof listing> => Boolean(listing));
      if (soldListings.length > 0) {
        await prisma.$transaction([
          prisma.marketplaceListing.updateMany({
            where: { id: { in: soldListings.map((listing) => listing.id) } },
            data: { status: 'sold', error: null },
          }),
          prisma.inventoryItem.updateMany({
            where: { id: { in: soldListings.map((listing) => listing.itemId) }, userId: request.user!.id },
            data: { status: 'sold' },
          }),
        ]);
      }

      const items = orders.flatMap((order) => {
        const gameId = internalGameId(order.gameId);
        if (query.gameId && query.gameId !== gameId) return [];
        const local = localByOfferId.get(order.offerId);
        const status = saleState(order.state);
        const actualFeeMinor = order.fee?.currency === order.totalPrice.currency
          ? Math.round(order.fee.amount * 100)
          : null;
        const financials = calculateSaleFinancials({
          status,
          totalMinor: Math.round(order.totalPrice.amount * 100),
          saleCurrency: order.totalPrice.currency,
          purchaseMinor: local?.purchaseMinor ?? null,
          purchaseCurrency: local?.purchaseCurrency ?? null,
          actualFeeMinor,
        });

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
            financials.feeMinor === null
              ? null
              : { amount: financials.feeMinor / 100, currency: order.totalPrice.currency },
          feeEstimated: financials.feeEstimated,
          netProfit:
            financials.netProfitMinor === null
              ? null
              : { amount: financials.netProfitMinor / 100, currency: order.totalPrice.currency },
          roiPercent: financials.roiPercent,
          soldAt: order.stateChangedAt ?? order.createdAt,
          status,
          lastVerifiedAt: new Date().toISOString(),
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
    try {
      const options = await loadAccountOfferOptions(game.gameId);
      const draft = draftFor(item);
      const fallbackPoster = item.listing.images.length === 0 ? gamePosterUrl(item.gameId) : null;
      return {
        title: draft.title,
        description: draft.description,
        gameId: game.gameId,
        currency: 'USD',
        automaticDelivery: true,
        sourceImageUrls: fallbackPoster
          ? [fallbackPoster]
          : item.listing.images.map(
              (image) => `/api/listings/${item.listing.id}/images/${image.position}`,
            ),
        fallbackPoster: Boolean(fallbackPoster),
        ...options,
        defaultTradeEnvironmentId:
          game.tradeEnvironmentId ?? inferTradeEnvironmentId(options, item.listing.gameData),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const status = error instanceof EldoradoApiError ? error.status : 502;
      return reply.code(status).send({ error: message });
    }
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
        const offerOptions = await loadAccountOfferOptions(game.gameId);
        const selection = resolveAccountOfferSelection(
          offerOptions,
          input,
          game.tradeEnvironmentId ?? inferTradeEnvironmentId(offerOptions, item.listing.gameData) ?? undefined,
        );
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
          const path = gamePosterPath(item.gameId);
          if (path) {
            imageInputs.push({
              bytes: await readFile(path),
              mimeType: 'image/jpeg',
              fileName: `${item.gameId}-illustrative-poster.jpg`,
            });
          }
        }
        if (imageInputs.length === 0) {
          return reply.code(422).send({ error: 'У позиции нет сохранённого фото аккаунта' });
        }
        const usesPoster = storedImages.length === 0 && !input.imageDataUrl;
        const uploadedImages: EldoradoOfferImage[] = [];
        for (const imageInput of imageInputs) {
          uploadedImages.push(await eldoradoClient.uploadAccountImage(imageInput));
        }
        const draft = draftFor(item);
        const posterNote = 'Cover image is an illustration, not a screenshot of this account.';
        const description = usesPoster && !input.description.includes(posterNote)
          ? `${input.description.trim().slice(0, 2_000 - posterNote.length - 2)}\n\n${posterNote}`.trim()
          : !usesPoster && storedImages.length === 0
            ? input.description.replace(`\n\n${posterNote}`, '').replace(posterNote, '').trim()
            : input.description;
        const payload = buildAccountOfferPayload(
          game.gameId,
          draft,
          {
            title: input.title,
            description,
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
          selection.tradeEnvironmentId,
          selection.offerAttributes,
        );
        const offerId = await eldoradoClient.createAccountOffer(payload);
        const publishedAt = new Date();
        const sellMinor = Math.round(input.priceUsd * 100);

        const persistPublication = () => prisma.$transaction(async (tx) => {
          const existingPublication = await tx.marketplaceListing.findUnique({
            where: { marketplace_externalId: { marketplace: 'eldorado', externalId: offerId } },
            select: { id: true },
          });
          await tx.marketplaceListing.upsert({
            where: { marketplace_externalId: { marketplace: 'eldorado', externalId: offerId } },
            create: {
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
            update: {
              status: 'published',
              error: null,
              publishedAt,
            },
          });
          await tx.inventoryItem.update({ where: { id: item.id }, data: { status: 'listed' } });
          if (!existingPublication) {
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
          }
        });

        try {
          await persistPublication();
        } catch (firstError) {
          request.log.warn({ err: firstError, offerId }, 'Повторное сохранение опубликованного лота');
          try {
            await persistPublication();
          } catch (secondError) {
            request.log.error({ err: secondError, offerId }, 'Не удалось сохранить опубликованный лот');
            try {
              await eldoradoClient.deleteAccountOffer(offerId);
            } catch (cleanupError) {
              request.log.error({ err: cleanupError, offerId }, 'Не удалось удалить несохранённый лот');
              throw new Error(
                `Лот создан на Eldorado, но не сохранён в GameStock. Удалите лот ${offerId} вручную`,
              );
            }
            throw new Error('Eldorado принял лот, но GameStock не смог его сохранить. Лот автоматически удалён; повторите публикацию');
          }
        }

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
