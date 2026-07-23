// test/bootstrap.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pairedBootstrapCI, winRateCI, ciExcludes } from '../src/bootstrap.mjs';

test('deterministic for a fixed seed', () => {
  const a = pairedBootstrapCI([1, 2, 3, 4, 5], { seed: 42, resamples: 2000 });
  const b = pairedBootstrapCI([1, 2, 3, 4, 5], { seed: 42, resamples: 2000 });
  assert.deepEqual(a, b);
});
test('point is the sample mean', () => {
  const r = pairedBootstrapCI([2, 4, 6], { seed: 1 });
  assert.equal(r.point, 4);
});
test('a strong positive signal has a CI above zero', () => {
  const r = pairedBootstrapCI([5, 6, 5, 7, 6, 5, 6], { seed: 9, resamples: 5000 });
  assert.ok(r.lo > 0);
  assert.equal(ciExcludes(r, 0), true);
});
test('noise around zero crosses zero', () => {
  const r = pairedBootstrapCI([-1, 1, -1, 1, 0, -1, 1], { seed: 3, resamples: 5000 });
  assert.equal(ciExcludes(r, 0), false);
});
test('winRateCI on decisive kimi wins excludes 0.5', () => {
  const r = winRateCI([0, 0, 0, 0, 0, 0], { seed: 5, resamples: 3000 }); // kimi wins every task
  assert.ok(r.hi < 0.5);
  assert.equal(ciExcludes(r, 0.5), true);
});
