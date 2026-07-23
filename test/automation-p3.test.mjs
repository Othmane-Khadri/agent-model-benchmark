// test/automation-p3.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, existsSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const SKILL = resolve(import.meta.dirname, '..');
const MOCK = join(SKILL, 'test/fixtures/mock-bin');
for (const b of ['claude', 'kimi']) chmodSync(join(MOCK, b), 0o755);

test('P3 automation: routing artifacts + gates + latency + cost', () => {
  const out = mkdtempSync(join(tmpdir(), 'amb-p3-'));
  execFileSync('node', ['scripts/run.mjs', '--tasks', 'config/tasks/sample.json', '--trials', '2', '--judges', 'dual', '--out', out], {
    cwd: SKILL, encoding: 'utf8',
    env: { ...process.env, PATH: `${MOCK}:${process.env.PATH}`, MOCK_COUNTER_FILE: join(out, 'c'),
      MOCK_MODEL_OUTPUT: 'def fizzbuzz 2011 even wc -l', MOCK_KIMI_OUTPUT: 'def fizzbuzz 2011 even wc -l',
      // claude-judge picks 'b': in A=fable-first order, B=kimi → kimi wins; kimi-judge picks 'a': in A=kimi-first (ba) order, A=kimi → kimi wins; both families favor kimi.
      MOCK_JUDGE_WINNER: 'b', MOCK_JUDGE_WINNER_KIMI: 'a' },
  });
  const runId = readdirSync(out).find(f => f.startsWith('2'));
  const dir = join(out, runId);
  assert.ok(existsSync(join(dir, 'model-routing.json')), 'routing json emitted');
  assert.ok(existsSync(join(dir, 'routing-snippet.md')), 'snippet emitted');
  const routing = JSON.parse(readFileSync(join(dir, 'model-routing.json'), 'utf8'));
  assert.equal(routing.default_model, 'claude-fable-5');
  assert.ok(routing.rules.length >= 6, 'a rule per category');
  assert.ok(routing.rules.some(r => r.confidence === 'insufficient-evidence'), 'single-task categories are insufficient-evidence');
  const results = JSON.parse(readFileSync(join(dir, 'results.json'), 'utf8'));
  assert.ok(results.latency['claude-fable-5'].p95 != null);
  assert.equal(results.cost['kimi-k3'].estimated, true);
  assert.match(readFileSync(join(dir, 'routing-snippet.md'), 'utf8'), /Re-benchmark monthly/);
});
