// test/routing.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRouting, routingSnippet } from '../src/routing.mjs';

const base = (over = {}) => ({
  category: 'coding', nTasks: 4, trials: 3,
  winRateForDefault: 0.15, winRateCI: { point: 0.15, lo: 0.02, hi: 0.30 }, // kimi clearly wins, excludes 0.5
  passHatK: { default: 0.6, challenger: 0.9 },
  perFamilyWinRateForDefault: { claude: 0.2, kimi: 0.25 },
  costPerSolved: { default: 0.42, challenger: 0.11 },
  ...over,
});
const build = (cat) => buildRouting({ runId: 'r1', date: '2026-07-23', defaultModel: 'claude-fable-5', challenger: 'kimi-k3', categories: [cat] });

test('all gates pass → route to challenger, high confidence', () => {
  const rule = build(base()).rules[0];
  assert.equal(rule.route_to, 'kimi-k3'); assert.equal(rule.confidence, 'high');
  assert.equal(rule.fallback, 'claude-fable-5');
});
test('gate1 fails (CI straddles 0.5) → insufficient-evidence, default', () => {
  const rule = build(base({ winRateCI: { point: 0.4, lo: 0.3, hi: 0.6 } })).rules[0];
  assert.equal(rule.route_to, 'claude-fable-5'); assert.equal(rule.confidence, 'insufficient-evidence');
});
test('gate2 fails (challenger pass^k worse) → insufficient-evidence', () => {
  const rule = build(base({ passHatK: { default: 0.9, challenger: 0.5 } })).rules[0];
  assert.equal(rule.confidence, 'insufficient-evidence'); assert.equal(rule.route_to, 'claude-fable-5');
});
test('gate3 fails (one family disagrees) → insufficient-evidence', () => {
  const rule = build(base({ perFamilyWinRateForDefault: { claude: 0.2, kimi: 0.7 } })).rules[0];
  assert.equal(rule.confidence, 'insufficient-evidence');
});
test('clear default win → route default, high confidence', () => {
  const rule = build(base({
    winRateForDefault: 0.85, winRateCI: { point: 0.85, lo: 0.7, hi: 0.98 },
    passHatK: { default: 0.95, challenger: 0.6 }, perFamilyWinRateForDefault: { claude: 0.8, kimi: 0.82 },
  })).rules[0];
  assert.equal(rule.route_to, 'claude-fable-5'); assert.equal(rule.confidence, 'high');
});
test('routing object shape + snippet', () => {
  const routing = build(base());
  assert.equal(routing.version, '2026-07-23'); assert.equal(routing.default_model, 'claude-fable-5');
  assert.ok(routing.rules[0].evidence.ci95 && routing.rules[0].cost_per_solved_usd.basis);
  const snip = routingSnippet(routing);
  assert.match(snip, /Model routing/); assert.match(snip, /kimi/); assert.match(snip, /Re-benchmark monthly/);
});
