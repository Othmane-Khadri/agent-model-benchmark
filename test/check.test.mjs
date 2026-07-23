// test/check.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCheck } from '../src/check.mjs';

test('contains pass/fail', () => {
  assert.equal(evaluateCheck({ type: 'contains', value: 'hello' }, 'oh hello there'), 'pass');
  assert.equal(evaluateCheck({ type: 'contains', value: 'zzz' }, 'oh hello there'), 'fail');
});
test('regex pass/fail', () => {
  assert.equal(evaluateCheck({ type: 'regex', value: '\\d{3}' }, 'code 200 ok'), 'pass');
  assert.equal(evaluateCheck({ type: 'regex', value: '^\\d+$' }, 'not a number'), 'fail');
});
test('none → pass on non-empty, fail on empty', () => {
  assert.equal(evaluateCheck({ type: 'none' }, 'anything'), 'pass');
  assert.equal(evaluateCheck({ type: 'none' }, '   '), 'fail');
});
test('unknown type → fail (loud but safe)', () => {
  assert.equal(evaluateCheck({ type: 'bogus' }, 'x'), 'fail');
});
