import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createPasswordResetToken,
  hashPasswordResetToken,
  PASSWORD_RESET_MINUTES,
} from './reset-token.js';

test('password reset tokens are random, hashed and expire after the configured window', () => {
  const first = createPasswordResetToken();
  const second = createPasswordResetToken();
  assert.notEqual(first.token, second.token);
  assert.notEqual(first.token, first.tokenHash);
  assert.equal(first.tokenHash, hashPasswordResetToken(first.token));
  const remainingMinutes = (first.expiresAt.getTime() - Date.now()) / 60_000;
  assert.ok(remainingMinutes > PASSWORD_RESET_MINUTES - 1);
  assert.ok(remainingMinutes <= PASSWORD_RESET_MINUTES);
});
