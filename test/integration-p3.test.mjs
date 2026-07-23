// test/integration-p3.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const SKILL = resolve(import.meta.dirname, '..');
const authed = (bin) => {
  if (spawnSync('command', ['-v', bin], { shell: true }).status !== 0) return false;
  const p = spawnSync(bin, ['-p', 'say OK'], { encoding: 'utf8', timeout: 60000, input: '' });
  return p.status === 0 && /\S/.test(p.stdout || '');
};

test('docs exist', () => {
  for (const f of ['SKILL.md', 'README.md', 'SETUP.md']) assert.ok(existsSync(join(SKILL, f)), `${f} present`);
});

test('P3 integration: real run emits routing artifacts', { skip: !(authed('claude') && authed('kimi')) }, () => {
  const out = mkdtempSync(join(tmpdir(), 'amb-p3int-'));
  execFileSync('node', ['scripts/run.mjs', '--trials', '2', '--judges', 'dual', '--out', out], { cwd: SKILL, encoding: 'utf8', timeout: 600000 });
  const runId = readdirSync(out).find(f => f.startsWith('2'));
  assert.ok(existsSync(join(out, runId, 'model-routing.json')));
  assert.ok(existsSync(join(out, runId, 'routing-snippet.md')));
});
