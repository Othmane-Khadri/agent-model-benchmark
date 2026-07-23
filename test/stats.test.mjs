// test/stats.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mean, median, percentile } from '../src/stats.mjs';

test('mean', () => { assert.equal(mean([1, 2, 3, 4]), 2.5); });
test('median odd', () => { assert.equal(median([3, 1, 2]), 2); });
test('median even', () => { assert.equal(median([1, 2, 3, 4]), 2.5); });
test('percentile p50 == median', () => { assert.equal(percentile([1, 2, 3, 4], 50), median([1, 2, 3, 4])); });
test('percentile p0 and p100', () => {
  assert.equal(percentile([10, 20, 30], 0), 10);
  assert.equal(percentile([10, 20, 30], 100), 30);
});
test('percentile p95 interpolates', () => {
  // sorted [1..10], rank = 0.95*(10-1)=8.55 → 9 + 0.55*(10-9)=9.55
  assert.ok(Math.abs(percentile([1,2,3,4,5,6,7,8,9,10], 95) - 9.55) < 1e-9);
});
test('empty → null', () => {
  assert.equal(mean([]), null); assert.equal(median([]), null); assert.equal(percentile([], 50), null);
});
