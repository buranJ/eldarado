import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { gamePosterPath, hasGamePoster } from './game-posters.js';

test('each fallback poster is present and cannot be requested for an unknown game', async () => {
  for (const gameId of [
    'zenless-zone-zero', 'world-of-warships', 'wow-mists-of-pandaria-classic',
    'world-of-warcraft', 'world-of-tanks', 'whiteout-survival', 'warframe',
    'wardogs', '8-ball-pool', 'aniimo', 'apex-legends', 'black-desert-online',
  ]) {
    assert.equal(hasGamePoster(gameId), true);
    const bytes = await readFile(gamePosterPath(gameId)!);
    assert.ok(bytes.length > 10_000 && bytes.length < 10 * 1024 * 1024);
    assert.deepEqual([...bytes.subarray(0, 2)], [0xff, 0xd8]);
  }
  assert.equal(gamePosterPath('../not-a-game'), null);
  assert.equal(hasGamePoster('where-winds-meet'), false);
});
