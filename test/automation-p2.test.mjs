// test/automation-p2.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const SKILL = resolve(import.meta.dirname, '..');
const MOCK = join(SKILL, 'test/fixtures/mock-bin');
for (const b of ['claude', 'kimi']) chmodSync(join(MOCK, b), 0o755);

test('P2 automation: family disagreement → agreement<1 and TIE headline', () => {
  const out = mkdtempSync(join(tmpdir(), 'amb-p2-'));
  execFileSync('node', ['scripts/run.mjs', '--trials', '2', '--judges', 'dual', '--out', out], {
    cwd: SKILL, encoding: 'utf8',
    env: { ...process.env, PATH: `${MOCK}:${process.env.PATH}`, MOCK_COUNTER_FILE: join(out, 'c'),
      MOCK_MODEL_OUTPUT: '2019', MOCK_KIMI_OUTPUT: '2019',
      MOCK_JUDGE_WINNER: 'a', MOCK_JUDGE_WINNER_KIMI: 'b' },
  });
  const runId = readdirSync(out).find(f => f.startsWith('2'));
  const results = JSON.parse(readFileSync(join(out, runId, 'results.json'), 'utf8'));
  assert.ok(results.agreement_rate < 1, 'families disagreed');
  assert.match(results.headline, /TIE/);
  const anyPair = results.tasks_full[0].verdicts.find(v => v.overall);
  assert.equal(anyPair.agreement, false);
});
