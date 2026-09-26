import { prisma } from '../lib/db.js';
import { collect } from './collect.js';
import type { CollectOptions } from './collect.js';
import { Sentry } from '../instrumentation.js';

const POLL_INTERVAL_MS = 1_000;
const RETRY_DELAY_MS = 5_000;

export interface CollectionWorker {
  stop(): Promise<void>;
}

/** A job is considered active while queued or being processed. */
export const isCollectionRunning = async (gameId?: string): Promise<boolean> =>
  (await prisma.collectionJob.count({
    where: {
      status: { in: ['queued', 'running'] },
      ...(gameId ? { gameId } : {}),
    },
  })) > 0;

/** Adds one durable collection job per game. */
export const enqueueCollection = async (
  options: CollectOptions = {},
): Promise<{ id: string; status: string } | null> => {
  const gameId = options.gameId ?? 'clash-royale';
  const existing = await prisma.collectionJob.findFirst({
    where: { gameId, status: { in: ['queued', 'running'] } },
    orderBy: { createdAt: 'asc' },
    select: { id: true, status: true },
  });
  if (existing) return null;

  return prisma.collectionJob.create({
    data: {
      gameId,
      marketplace: options.marketplace ?? 'funpay',
      pruneMissing: options.pruneMissing ?? false,
    },
    select: { id: true, status: true },
  });
};

const sleep = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

/** Starts the durable single-consumer worker and recovers interrupted jobs. */
export const startCollectionWorker = async (
  log: (message: string) => void,
): Promise<CollectionWorker> => {
  let stopping = false;
  let active: Promise<void> | null = null;

  const recovered = await prisma.collectionJob.updateMany({
    where: { status: 'running' },
    data: {
      status: 'queued',
      error: 'Задание восстановлено после перезапуска сервера',
      startedAt: null,
    },
  });
  if (recovered.count > 0) log(`Очередь сбора: восстановлено заданий ${recovered.count}`);

  const runNext = async (): Promise<boolean> => {
    const job = await prisma.collectionJob.findFirst({
      where: { status: 'queued' },
      orderBy: { createdAt: 'asc' },
    });
    if (!job) return false;

    const claimed = await prisma.collectionJob.updateMany({
      where: { id: job.id, status: 'queued' },
      data: {
        status: 'running',
        attempts: { increment: 1 },
        startedAt: new Date(),
        finishedAt: null,
        error: null,
      },
    });
    if (claimed.count === 0) return true;

    log(`Очередь сбора: старт ${job.gameId}, попытка ${job.attempts + 1}/${job.maxAttempts}`);
    try {
      const run = await collect({
        gameId: job.gameId,
        marketplace: job.marketplace,
        pruneMissing: job.pruneMissing,
      });
      await prisma.collectionJob.update({
        where: { id: job.id },
        data: { status: 'completed', finishedAt: new Date(), error: null },
      });
      log(
        `Очередь сбора: готово ${job.gameId} — увидено ${run.seen}, ` +
          `прошло фильтр ${run.passed}, удалено ${run.disappeared}`,
      );
    } catch (error) {
      Sentry.captureException(error, { tags: { worker: 'collection', gameId: job.gameId } });
      const message = error instanceof Error ? error.message : String(error);
      const shouldRetry = job.attempts + 1 < job.maxAttempts;
      await prisma.collectionJob.update({
        where: { id: job.id },
        data: {
          status: shouldRetry ? 'queued' : 'failed',
          error: message,
          startedAt: shouldRetry ? null : undefined,
          finishedAt: shouldRetry ? null : new Date(),
        },
      });
      log(`Очередь сбора: ${shouldRetry ? 'повтор' : 'ошибка'} ${job.gameId} — ${message}`);
      if (shouldRetry) await sleep(RETRY_DELAY_MS);
    }
    return true;
  };

  const loop = async (): Promise<void> => {
    while (!stopping) {
      try {
        const found = await runNext();
        if (!found) await sleep(POLL_INTERVAL_MS);
      } catch (error) {
        Sentry.captureException(error, { tags: { worker: 'collection-loop' } });
        log(`Очередь сбора: ошибка рабочего цикла — ${error instanceof Error ? error.message : error}`);
        await sleep(RETRY_DELAY_MS);
      }
    }
  };
  active = loop();

  return {
    stop: async () => {
      stopping = true;
      await active;
    },
  };
};
