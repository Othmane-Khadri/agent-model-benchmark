import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateTokens, estimateKimiCost, verbosity, checkOutcome, computeMetrics } from '../lib/metrics.mjs';

const pricing = { 'kimi-for-coding': { inputPerM: 1.5, outputPerM: 8 } };

test('estimateTokens ~ chars/4', () => { assert.equal(estimateTokens('abcdefgh'), 2); assert.equal(estimateTokens(''), 1); });

test('estimateKimiCost flags estimated and is > 0', () => {
  const { cost, estimated } = estimateKimiCost('prompt here', 'a long output '.repeat(10), pricing);
  assert.equal(estimated, true);
  assert.ok(cost > 0);
});

test('verbosity counts chars and words', () => {
  const v = verbosity('one two three');
  assert.equal(v.words, 3);
  assert.equal(v.chars, 13);
});

test('checkOutcome: na when no assert, pass/fail on contains', () => {
  assert.equal(checkOutcome({}, 'x'), 'na');
  assert.equal(checkOutcome({ assert: { type: 'contains', value: 'cat' } }, 'a cat sat'), 'pass');
  assert.equal(checkOutcome({ assert: { type: 'contains', value: 'dog' } }, 'a cat sat'), 'fail');
  assert.equal(checkOutcome({ assert: { type: 'regex', value: '^\\d+$' } }, '42'), 'pass');
});

test('computeMetrics assembles quality/latency/cost/outcome/verbosity', () => {
  const m = computeMetrics({
    fableRun: { output: 'fable out', durationMs: 500, costUsd: 0.01 },
    kimiRun: { output: 'kimi out', durationMs: 900, costUsd: 0.003, estimated: true },
    judge: { winner: 'fable', scoreFable: 8, scoreKimi: 6, rationale: 'clearer' },
    task: { id: 't1', assert: { type: 'contains', value: 'out' } },
    metricsCfg: { quality: true, latency: true, cost: true, outcome: true, verbosity: true },
  });
  assert.equal(m.quality.winner, 'fable');
  assert.equal(m.latency.fable, 500);
  assert.equal(m.cost.kimi.estimated, true);
  assert.equal(m.outcome.fable, 'pass');
  assert.equal(m.verbosity.kimi.words, 2);
});
