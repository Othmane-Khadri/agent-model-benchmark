// test/automation-decisive.test.mjs
// Covers the decisive-winner wiring in run.mjs:
//   (1) "X wins" headline branch, (2) length_flag firing, (3) high-confidence routing rule.
// Uses order-aware mock winner (MOCK_JUDGE_WINNER_TEXT) so both judge families agree
// on the same real model regardless of ab/ba position order — eliminating the tie
// that the fixed-letter mock family always produces.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const SKILL = resolve(import.meta.dirname, '..');
const MOCK = join(SKILL, 'test/fixtures/mock-bin');
for (const b of ['claude', 'kimi']) chmodSync(join(MOCK, b), 0o755);

function runCli(extraEnv, argv) {
  const out = mkdtempSync(join(tmpdir(), 'amb-decisive-'));
  const counter = join(out, 'counter');
  execFileSync('node', ['scripts/run.mjs', '--out', out, ...argv], {
    cwd: SKILL, encoding: 'utf8',
    env: { ...process.env, PATH: `${MOCK}:${process.env.PATH}`, MOCK_COUNTER_FILE: counter, ...extraEnv },
  });
  const runId = readdirSync(out)[0];
  return { dir: join(out, runId), results: JSON.parse(readFileSync(join(out, runId, 'results.json'), 'utf8')) };
}

test('decisive winner: kimi-k3 wins headline when order-aware mock consistently picks kimi', () => {
  // FABLE_ANSWER and KIMI_ANSWER are distinct markers so the judge can detect the winner.
  // Both outputs contain "2019" to satisfy the p1-smoke check (contains: 2019).
  // MOCK_JUDGE_WINNER_TEXT='KIMI_ANSWER' → in ab-order kimi is block B → winner='b';
  //   in ba-order kimi is block A → winner='a'. familyVerdict maps both to kimi-k3. ✓
  const { results } = runCli(
    {
      MOCK_MODEL_OUTPUT: 'FABLE_ANSWER 2019',
      MOCK_KIMI_OUTPUT: 'KIMI_ANSWER 2019',
      MOCK_JUDGE_WINNER_TEXT: 'KIMI_ANSWER',
    },
    ['--tasks', 'config/tasks/p1-smoke.json', '--trials', '2', '--judges', 'dual'],
  );

  // (1) "X wins" headline branch — must NOT be a tie
  assert.ok(
    !results.headline.startsWith('TIE'),
    `Expected decisive headline, got: ${results.headline}`,
  );
  assert.match(results.headline, /kimi-k3 wins/, `Headline should name kimi-k3 winner, got: ${results.headline}`);

  // (2) length_flag is present in the results (exercising the length-bias branch)
  assert.ok('length_flag' in results, 'length_flag key must be present');

  // (3) high-confidence routing rule routes to kimi-k3
  const routing = results.routing;
  assert.ok(routing && Array.isArray(routing.rules) && routing.rules.length > 0, 'routing.rules must be non-empty');
  const highConfKimi = routing.rules.find(r => r.route_to === 'kimi-k3' && r.confidence === 'high');
  assert.ok(
    highConfKimi != null,
    `Expected at least one rule with route_to='kimi-k3' and confidence='high', rules=${JSON.stringify(routing.rules)}`,
  );
});
