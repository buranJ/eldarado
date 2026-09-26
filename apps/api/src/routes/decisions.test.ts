import assert from 'node:assert/strict';
import test from 'node:test';
import { isDecidableStatus } from './decisions.js';

test('allows an operator to override a deterministic pre-filter rejection', () => {
  assert.equal(isDecidableStatus('prefiltered_out'), true);
});

test('does not allow incomplete collection states into inventory', () => {
  assert.equal(isDecidableStatus('collected'), false);
  assert.equal(isDecidableStatus('details_pending'), false);
});
