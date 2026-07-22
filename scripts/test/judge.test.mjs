import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, randomizeAB, buildJudgePrompt, judge } from '../lib/judge.mjs';

test('mulberry32 is deterministic for a seed', () => {
  const a = mulberry32(42), b = mulberry32(42);
  assert.equal(a(), b());
});

test('randomizeAB assigns A/B and records which is fable', () => {
  const r = randomizeAB('F', 'K', () => 0.1);
  assert.ok(r.aIs === 'fable' || r.aIs === 'kimi');
  const both = [r.A, r.B].sort().join('');
  assert.equal(both, 'FK');
});

test('buildJudgePrompt is blind — no model names leak', () => {
  const { system, user } = buildJudgePrompt({ prompt: 'Do X' }, 'ans A', 'ans B');
  const blob = (system + user).toLowerCase();
  assert.ok(!blob.includes('fable'));
  assert.ok(!blob.includes('kimi'));
  assert.ok(user.includes('ans A') && user.includes('ans B'));
});

test('judge maps blind A/B verdict back to real models', async () => {
  // Force A=fable via rng<0.5, judge picks "A"
  const callAnthropic = async () => JSON.stringify({ winner: 'A', scoreA: 9, scoreB: 5, rationale: 'A clearer' });
  const v = await judge({ prompt: 'Do X' }, 'F', 'K', { rng: () => 0.2, callAnthropic, model: 'claude-opus-4-8' });
  assert.equal(v.winner, 'fable');
  assert.equal(v.scoreFable, 9);
  assert.equal(v.scoreKimi, 5);
});
