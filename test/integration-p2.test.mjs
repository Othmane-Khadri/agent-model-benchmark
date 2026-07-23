// test/integration-p2.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const SKILL = resolve(import.meta.dirname, '..');
const authed = (bin) => {
  if (spawnSync('command', ['-v', bin], { shell: true }).status !== 0) return false;
  const p = spawnSync(bin, ['-p', 'say OK'], { encoding: 'utf8', timeout: 60000, input: '' });
  return p.status === 0 && /\S/.test(p.stdout || '');
};

test('P2 integration: real dual-family judging emits CI + agreement', { skip: !(authed('claude') && authed('kimi')) }, () => {
  const out = mkdtempSync(join(tmpdir(), 'amb-p2int-'));
  execFileSync('node', ['scripts/run.mjs', '--trials', '2', '--judges', 'dual', '--out', out], { cwd: SKILL, encoding: 'utf8', timeout: 600000 });
  const runId = readdirSync(out).find(f => f.startsWith('2'));
  const raw = readFileSync(join(out, runId, 'results.json'), 'utf8');
  const results = JSON.parse(raw);
  assert.ok('quality_delta_ci' in results && 'agreement_rate' in results);
  assert.ok(typeof results.headline === 'string' && results.headline.length > 0);
  assert.doesNotMatch(raw, /sk-[A-Za-z0-9_-]{8,}/);
});
