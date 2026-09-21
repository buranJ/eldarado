import { createHash } from 'node:crypto';

/** Stable hash over the fields that decide whether a listing needs re-analysis. */
export const contentHash = (input: Record<string, unknown>): string =>
  createHash('sha1').update(JSON.stringify(input, Object.keys(input).sort())).digest('hex');
