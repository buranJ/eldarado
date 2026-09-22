import type { CollectionRun } from '@gamestock/domain';
import { collect } from './collect.js';
import type { CollectOptions } from './collect.js';

let running: Promise<CollectionRun> | null = null;

export const isCollectionRunning = (): boolean => running !== null;

/** Starts one shared collection run, or returns null when another run is active. */
export const startCollection = (options: CollectOptions = {}): Promise<CollectionRun> | null => {
  if (running) return null;

  running = collect(options).finally(() => {
    running = null;
  });
  return running;
};
