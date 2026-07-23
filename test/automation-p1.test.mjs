// test/automation-p1.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, readdirSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const SKILL = resolve(import.meta.dirname, '..');
const MOCK = join(SKILL, 'test/fixtures/mock-bin');
for (const b of ['claude', 'kimi']) chmodSync(join(MOCK, b), 0o755);

function runCli(extraEnv, argv) {
  const out = mkdtempSync(join(tmpdir(), 'amb-'));
  const counter = join(out, 'counter');
  execFileSync('node', ['scripts/run.mjs', '--out', out, ...argv], {
    cwd: SKILL, encoding: 'utf8',
    env: { ...process.env, PATH: `${MOCK}:${process.env.PATH}`, MOCK_COUNTER_FILE: counter, ...extraEnv },
  });
  const runId = readdirSync(out)[0];
  return { dir: join(out, runId), results: JSON.parse(readFileSync(join(out, runId, 'results.json'), 'utf8')) };
}

test('P1 automation: schema 2, per-trial table, pass@k/pass^k, flip rate, html', () => {
  const { dir, results } = runCli({ MOCK_MODEL_OUTPUT: '2019', MOCK_JUDGE_WINNER: 'a' }, ['--trials', '3', '--judges', 'single']);
  assert.equal(results.schema, 2);
  assert.equal(results.trials, 3);
  const t = results.tasks_full[0];
  assert.equal(t.trials.length, 6); // 3 fable + 3 kimi
  assert.equal(t.pass_hat_k['claude-fable-5'], 1); // all pass (contains 2019)
  assert.ok('flip_rate' in t);
  const html = readFileSync(join(dir, 'results.html'), 'utf8');
  assert.match(html, /schema 2/);
});

test('P1 automation: scripted error trial counts as failure (pass^k=0)', () => {
  // trial 0 of the fable model errors (exit 3)
  const { results } = runCli({ MOCK_MODEL_OUTPUT: '2019', MOCK_MODEL_ERROR_TRIAL: '0', MOCK_JUDGE_WINNER: 'a' }, ['--trials', '2', '--judges', 'single']);
  const t = results.tasks_full[0];
  const fableErrors = t.error_rate['claude-fable-5'];
  assert.ok(fableErrors > 0, 'error trial recorded');
  assert.equal(t.pass_hat_k['claude-fable-5'], 0, 'error breaks pass^k');
});

test('P1 automation: --dry-run spawns nothing and writes nothing', () => {
  const out = mkdtempSync(join(tmpdir(), 'amb-dry-'));
  const stdout = execFileSync('node', ['scripts/run.mjs', '--dry-run', '--out', out], { cwd: SKILL, encoding: 'utf8', env: { ...process.env, PATH: `${MOCK}:${process.env.PATH}` } });
  assert.match(stdout, /\[dry-run\]/);
  assert.equal(readdirSync(out).length, 0);
});
