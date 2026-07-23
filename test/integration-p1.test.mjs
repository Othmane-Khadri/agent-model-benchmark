// test/integration-p1.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const SKILL = resolve(import.meta.dirname, '..');
function authed(bin) {
  const which = spawnSync('command', ['-v', bin], { shell: true, encoding: 'utf8' });
  if (which.status !== 0) return false;
  const probe = spawnSync(bin, ['-p', 'say OK'], { encoding: 'utf8', timeout: 60000, input: '' });
  return probe.status === 0 && /\S/.test(probe.stdout || '');
}

test('P1 integration: one real task, single judge, no secrets', { skip: !(authed('claude') && authed('kimi')) }, () => {
  const out = mkdtempSync(join(tmpdir(), 'amb-int-'));
  execFileSync('node', ['scripts/run.mjs', '--trials', '2', '--judges', 'single', '--out', out], { cwd: SKILL, encoding: 'utf8', timeout: 300000 });
  const runId = readdirSync(out)[0];
  const raw = readFileSync(join(out, runId, 'results.json'), 'utf8');
  const results = JSON.parse(raw);
  assert.equal(results.schema, 2);
  assert.ok(results.tasks_full[0].trials.length === 4);
  assert.doesNotMatch(raw, /sk-[A-Za-z0-9_-]{8,}/, 'no api keys in results');
  assert.doesNotMatch(raw, /Bearer\s+[A-Za-z0-9._-]{6,}/i, 'no bearer tokens in results');
});
