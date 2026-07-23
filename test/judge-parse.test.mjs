// test/judge-parse.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractJudgeJson } from '../src/judge-parse.mjs';

test('(a) clean JSON object parses correctly', () => {
  const input = '{"output_a":{"criteria":{},"overall":4},"output_b":{"criteria":{},"overall":3},"winner":"a"}';
  const result = extractJudgeJson(input);
  assert.equal(result.winner, 'a');
  assert.equal(result.output_a.overall, 4);
  assert.equal(result.output_b.overall, 3);
});

test('(b) JSON with surrounding prose parses correctly', () => {
  const input = 'Here is my evaluation:\n{"output_a":{"criteria":{},"overall":5},"output_b":{"criteria":{},"overall":2},"winner":"a"}\nThat concludes the review.';
  const result = extractJudgeJson(input);
  assert.equal(result.winner, 'a');
  assert.equal(result.output_a.overall, 5);
});

test('(c) nested reason string containing } still parses correctly', () => {
  const obj = {
    output_a: { criteria: { quality: { reason: 'the set {a,b} was right', score: 5 } }, overall: 4 },
    output_b: { criteria: { quality: { reason: 'not as good', score: 3 } }, overall: 3 },
    winner: 'a',
  };
  const input = JSON.stringify(obj);
  const result = extractJudgeJson(input);
  assert.equal(result.winner, 'a');
  assert.equal(result.output_a.criteria.quality.reason, 'the set {a,b} was right');
});

test('(c) JSON with prose AND nested } in string value parses winner correctly', () => {
  const obj = {
    output_a: { criteria: {}, overall: 4 },
    output_b: { criteria: {}, overall: 3 },
    winner: 'a',
    reason: 'the set {a,b} was right',
  };
  const input = `Thinking...\n${JSON.stringify(obj)}\nDone.`;
  const result = extractJudgeJson(input);
  assert.equal(result.winner, 'a');
});

test('(d) empty string returns null', () => {
  assert.equal(extractJudgeJson(''), null);
});

test('(d) null/undefined returns null', () => {
  assert.equal(extractJudgeJson(null), null);
  assert.equal(extractJudgeJson(undefined), null);
});

test('(d) garbage/non-JSON returns null', () => {
  assert.equal(extractJudgeJson('this is not json at all'), null);
  assert.equal(extractJudgeJson('{ broken json {{'), null);
});

test('tie winner parses correctly', () => {
  const input = '{"output_a":{"criteria":{},"overall":3},"output_b":{"criteria":{},"overall":3},"winner":"tie"}';
  const result = extractJudgeJson(input);
  assert.equal(result.winner, 'tie');
});
