// test/model-runner.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseClaudeJson, maskSecrets } from '../src/model-runner.mjs';

test('parseClaudeJson reads claude -p JSON', () => {
  const j = JSON.stringify({ result: 'the answer is 2019', usage: { input_tokens: 10, output_tokens: 5 }, num_turns: 2 });
  const r = parseClaudeJson(j);
  assert.equal(r.text, 'the answer is 2019');
  assert.equal(r.tokens, 15);
  assert.equal(r.inputTokens, 10);
  assert.equal(r.outputTokens, 5);
  assert.equal(r.turns, 2);
});
test('parseClaudeJson falls back to raw text', () => {
  const r = parseClaudeJson('2019');
  assert.equal(r.text, '2019'); assert.equal(r.tokens, null); assert.equal(r.turns, null);
  assert.equal(r.inputTokens, null); assert.equal(r.outputTokens, null);
});
test('maskSecrets redacts keys and bearer tokens', () => {
  assert.ok(!maskSecrets('key=sk-ant-abc123DEF456ghi789jkl012').includes('abc123'));
  assert.ok(maskSecrets('Authorization: Bearer supersecrettoken').includes('Bearer …redacted'));
});
