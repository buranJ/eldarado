import type { DestinationAdapter } from './types.js';
import { manualAdapter } from './manual/index.js';
import { env } from '../../lib/env.js';

const ADAPTERS: DestinationAdapter[] = [manualAdapter];

/**
 * Picks the adapter for a marketplace. Once the Eldorado Seller API is wired
 * up, its adapter registers here and takes over automatically when a key is
 * present — nothing else in the pipeline changes.
 */
export const getDestinationAdapter = (marketplace: string): DestinationAdapter => {
  const automated = ADAPTERS.find((a) => a.id === marketplace && a.automated);
  if (automated && env.eldoradoClientId && env.eldoradoClientSecret) return automated;

  const adapter = ADAPTERS.find((a) => a.id === marketplace);
  if (!adapter) throw new Error(`Площадка продажи ${marketplace} не настроена`);
  return adapter;
};
