// test/pairing.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pairTrials, pairAutoVerdict } from '../src/pairing.mjs';

const t = (model, outcome, output = 'x') => ({ model, outcome, output, trial: 0, latencyMs: 1, tokens: null, turns: null, error: null });

test('pairTrials aligns by index and truncates to min length', () => {
  const pairs = pairTrials([t('f', 'pass'), t('f', 'fail')], [t('k', 'pass'), t('k', 'pass'), t('k', 'pass')]);
  assert.equal(pairs.length, 2);
  assert.equal(pairs[1].index, 1);
  assert.equal(pairs[1].fable.outcome, 'fail');
});

test('pairAutoVerdict: opponent errored', () => {
  assert.deepEqual(pairAutoVerdict(t('claude-fable-5', 'error', ''), t('kimi-k3', 'pass')),
    { winner: 'kimi-k3', reason: 'opponent-errored' });
  assert.deepEqual(pairAutoVerdict(t('claude-fable-5', 'pass'), t('kimi-k3', 'error', '')),
    { winner: 'claude-fable-5', reason: 'opponent-errored' });
});
test('pairAutoVerdict: both errored → tie', () => {
  assert.deepEqual(pairAutoVerdict(t('claude-fable-5', 'error', ''), t('kimi-k3', 'error', '')),
    { winner: 'tie', reason: 'both-errored' });
});
test('pairAutoVerdict: neither errored → null (judge decides)', () => {
  assert.equal(pairAutoVerdict(t('claude-fable-5', 'pass'), t('kimi-k3', 'fail')), null);
});
