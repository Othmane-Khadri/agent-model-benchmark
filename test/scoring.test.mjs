// test/scoring.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { passAtK, passHatK, errorRate, aggregateRate } from '../src/scoring.mjs';

test('passAtK: any pass wins', () => {
  assert.equal(passAtK(['fail', 'pass', 'error']), 1);
  assert.equal(passAtK(['fail', 'error', 'fail']), 0);
});
test('passHatK: all must pass, error breaks it', () => {
  assert.equal(passHatK(['pass', 'pass', 'pass']), 1);
  assert.equal(passHatK(['pass', 'error', 'pass']), 0);
  assert.equal(passHatK(['pass', 'fail', 'pass']), 0);
});
test('errorRate counts errors as failed trials', () => {
  assert.equal(errorRate(['error', 'pass', 'error', 'pass']), 0.5);
});
test('aggregateRate averages per-task 0/1', () => {
  assert.equal(aggregateRate([1, 0, 1, 1]), 0.75);
  assert.equal(aggregateRate([]), null);
});
