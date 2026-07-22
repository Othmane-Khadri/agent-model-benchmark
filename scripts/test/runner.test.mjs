import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseClaudeJson, runFable, runKimi, stripKimiChrome } from '../lib/runner.mjs';

const models = { fable: { cli: 'claude', model: 'claude-fable-5', outputFormat: 'json' }, kimi: { cli: 'kimi', modelLabel: 'kimi-k3' } };
const pricing = { 'claude-fable-5': { inputPerM: 5, outputPerM: 25 }, 'kimi-for-coding': { inputPerM: 1.5, outputPerM: 8 } };

test('parseClaudeJson extracts result, cost, usage', () => {
  const stdout = JSON.stringify({ result: 'hello', total_cost_usd: 0.0021, duration_ms: 1234, usage: { input_tokens: 10, output_tokens: 4 } });
  const p = parseClaudeJson(stdout);
  assert.equal(p.result, 'hello');
  assert.equal(p.costUsd, 0.0021);
  assert.equal(p.durationMs, 1234);
  assert.equal(p.usage.output_tokens, 4);
});

test('parseClaudeJson throws on garbage', () => {
  assert.throws(() => parseClaudeJson('not json'), /parse/i);
});

test('runFable shells claude with model + json flags and returns real cost', async () => {
  let seen = null;
  const exec = async (cmd, args) => { seen = { cmd, args }; return { stdout: JSON.stringify({ result: 'A', total_cost_usd: 0.01, duration_ms: 500, usage: {} }), code: 0, durationMs: 700 }; };
  const r = await runFable('do X', { models, exec });
  assert.equal(seen.cmd, 'claude');
  assert.ok(seen.args.includes('claude-fable-5'));
  assert.ok(seen.args.includes('json'));
  assert.equal(r.costUsd, 0.01);
  assert.equal(r.output, 'A');
});

test('runKimi shells kimi -p, uses wall-clock latency and flags estimated cost', async () => {
  const exec = async (cmd, args) => { assert.equal(cmd, 'kimi'); assert.ok(args.includes('-p')); return { stdout: 'B answer', code: 0, durationMs: 900 }; };
  const r = await runKimi('do X', { models, pricing, exec });
  assert.equal(r.output, 'B answer');
  assert.equal(r.durationMs, 900);
  assert.equal(r.estimated, true);
  assert.ok(r.costUsd >= 0);
});

// Regression: a CLI that never ran (command-not-found / empty stdout / nonzero exit)
// must FAIL LOUD, never be silently scored as an empty answer that loses.
test('runKimi throws when the CLI is missing (empty stdout, nonzero exit)', async () => {
  const exec = async () => ({ stdout: '', stderr: 'spawn kimi ENOENT', code: -1, durationMs: 3 });
  await assert.rejects(() => runKimi('do X', { models, pricing, exec }), /no output/i);
});

test('runKimi throws on empty output even with a zero exit code', async () => {
  const exec = async () => ({ stdout: '   \n', stderr: '', code: 0, durationMs: 5 });
  await assert.rejects(() => runKimi('do X', { models, pricing, exec }), /no output/i);
});

test('runFable throws when the CLI produces no output', async () => {
  const exec = async () => ({ stdout: '', stderr: 'spawn claude ENOENT', code: -1, durationMs: 3 });
  await assert.rejects(() => runFable('do X', { models, exec }), /no output/i);
});

test('stripKimiChrome removes the leading bullet and resume trailer', () => {
  assert.equal(stripKimiChrome('• {"a":1}'), '{"a":1}');
  assert.equal(stripKimiChrome('•  hello world'), 'hello world');
  assert.equal(stripKimiChrome('answer\n\nTo resume this session: kimi -r session_abc'), 'answer');
  assert.equal(stripKimiChrome('no chrome here'), 'no chrome here');
});

test('runKimi strips the bullet so strict output is scored on content', async () => {
  const exec = async () => ({ stdout: '• {"name":"Acme"}', code: 0, durationMs: 800 });
  const r = await runKimi('emit json', { models, pricing, exec });
  assert.equal(r.output, '{"name":"Acme"}');
});
