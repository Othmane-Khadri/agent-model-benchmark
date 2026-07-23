// test/rng.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../src/rng.mjs';

test('makeRng is deterministic for a fixed seed', () => {
  const a = makeRng(1234), b = makeRng(1234);
  const seqA = [a(), a(), a()], seqB = [b(), b(), b()];
  assert.deepEqual(seqA, seqB);
});

test('makeRng returns values in [0,1)', () => {
  const r = makeRng(7);
  for (let i = 0; i < 1000; i++) { const v = r(); assert.ok(v >= 0 && v < 1); }
});

test('different seeds diverge', () => {
  assert.notEqual(makeRng(1)(), makeRng(2)());
});
