// test/rubrics.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RUBRICS, rubricFor, anchoredJudgePrompt } from '../src/rubrics.mjs';

const CATS = ['writing', 'coding', 'extraction', 'reasoning', 'research', 'tool-use'];
test('all six categories resolve to 3-4 anchored criteria', () => {
  for (const c of CATS) {
    const r = rubricFor(c);
    assert.ok(r.criteria.length >= 3 && r.criteria.length <= 4, `${c} criteria count`);
    for (const cr of r.criteria) { assert.ok(cr.name); assert.ok(cr.anchors['1'] && cr.anchors['3'] && cr.anchors['5']); }
  }
});
test('unknown category falls back, never throws', () => {
  const r = rubricFor('astrology');
  assert.ok(r.criteria.length >= 3);
});
test('anchoredJudgePrompt interpolates category criteria + demands reason-before-score', () => {
  const p = anchoredJudgePrompt({ category: 'coding', prompt: 'write fizzbuzz', check: { type: 'none' } }, 'A out', 'B out');
  assert.match(p, /correctness|compiles|runs/i);
  assert.match(p, /reason/i);
  assert.match(p, /"winner"/);
  assert.ok(p.indexOf('reason') < p.indexOf('score') || /reasoning BEFORE/i.test(p));
});
test('anchoredJudgePrompt truncates long outputs', () => {
  const p = anchoredJudgePrompt({ category: 'writing', prompt: 'x' }, 'z'.repeat(5000), 'short');
  assert.match(p, /truncated \d+ chars/);
});
