// test/judge.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapOrderVerdict, familyVerdict, judgeConsensus } from '../src/judge.mjs';

test('mapOrderVerdict honors order', () => {
  assert.equal(mapOrderVerdict('a', 'ab'), 'claude-fable-5');
  assert.equal(mapOrderVerdict('a', 'ba'), 'kimi-k3');
  assert.equal(mapOrderVerdict('tie', 'ab'), 'tie');
});
test('familyVerdict: agreeing orders → decisive', () => {
  assert.deepEqual(familyVerdict('a', 'b'), { winner: 'claude-fable-5', position_consistent: true }); // ab:a=fable, ba:b=fable
});
test('familyVerdict: order flip → tie', () => {
  const v = familyVerdict('a', 'a'); // ab:a=fable, ba:a=kimi → disagree
  assert.equal(v.winner, 'tie'); assert.equal(v.position_consistent, false);
});
test('judgeConsensus: both families agree → decisive', () => {
  const r = judgeConsensus([
    { winner: 'kimi-k3', position_consistent: true, excluded: null },
    { winner: 'kimi-k3', position_consistent: true, excluded: null },
  ]);
  assert.equal(r.winner, 'kimi-k3'); assert.equal(r.agreement, true);
});
test('judgeConsensus: families disagree → tie, agreement false', () => {
  const r = judgeConsensus([
    { winner: 'kimi-k3', position_consistent: true, excluded: null },
    { winner: 'claude-fable-5', position_consistent: true, excluded: null },
  ]);
  assert.equal(r.winner, 'tie'); assert.equal(r.agreement, false);
});
test('judgeConsensus: an excluded family is dropped', () => {
  const r = judgeConsensus([
    { winner: 'kimi-k3', position_consistent: true, excluded: null },
    { winner: 'tie', position_consistent: false, excluded: { reason: 'judge unreachable' } },
  ]);
  assert.equal(r.winner, 'kimi-k3'); assert.equal(r.agreement, true);
});
test('judgeConsensus: all excluded → tie', () => {
  const r = judgeConsensus([{ excluded: { reason: 'x' } }, { excluded: { reason: 'y' } }]);
  assert.equal(r.winner, 'tie'); assert.equal(r.excluded, true); assert.equal(r.agreement, false);
});
