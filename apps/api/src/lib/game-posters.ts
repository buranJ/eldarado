import { fileURLToPath } from 'node:url';

/** Original illustrations used only when a source listing has no account screenshots. */
const POSTER_GAME_IDS = new Set([
  'zenless-zone-zero',
  'world-of-warships',
  'wow-mists-of-pandaria-classic',
  'world-of-warcraft',
  'world-of-tanks',
  'whiteout-survival',
  'warframe',
  'wardogs',
  '8-ball-pool',
  'aniimo',
  'apex-legends',
  'black-desert-online',
]);

export const hasGamePoster = (gameId: string): boolean => POSTER_GAME_IDS.has(gameId);

export const gamePosterPath = (gameId: string): string | null =>
  hasGamePoster(gameId)
    ? fileURLToPath(new URL(`../../assets/posters/${gameId}.jpg`, import.meta.url))
    : null;

export const gamePosterUrl = (gameId: string): string | null =>
  hasGamePoster(gameId) ? `/api/game-posters/${encodeURIComponent(gameId)}` : null;
