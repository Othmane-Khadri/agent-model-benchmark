// test/length.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lengthFlag } from '../src/length.mjs';

test('flags when winner is >1.5x longer on won tasks', () => {
  const r = lengthFlag('kimi-k3', [{ winnerLen: 300, loserLen: 100 }, { winnerLen: 320, loserLen: 100 }]);
  assert.equal(r.flag, true); assert.ok(r.ratio > 1.5);
});
test('no flag when lengths comparable', () => {
  const r = lengthFlag('kimi-k3', [{ winnerLen: 110, loserLen: 100 }]);
  assert.equal(r.flag, false);
});
test('no won tasks → no flag, null ratio', () => {
  assert.deepEqual(lengthFlag('kimi-k3', []), { flag: false, ratio: null });
});
