import type { CollectionRun } from '@gamestock/domain';
import { collect } from './collect.js';
import type { CollectOptions } from './collect.js';

const running = new Map<string, Promise<CollectionRun>>();

export const isCollectionRunning = (gameId?: string): boolean =>
  gameId ? running.has(gameId) : running.size > 0;

/** Starts one collection per game, or returns null when that game is already running. */
export const startCollection = (options: CollectOptions = {}): Promise<CollectionRun> | null => {
  const gameId = options.gameId ?? 'clash-royale';
  if (running.has(gameId)) return null;

  const pending = collect({ ...options, gameId }).finally(() => {
    running.delete(gameId);
  });
  running.set(gameId, pending);
  return pending;
};
