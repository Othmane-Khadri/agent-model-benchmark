import { test } from 'node:test';
import assert from 'node:assert/strict';
import { callAnthropicApi, makeDefaultJudge, callJudgeViaCli } from '../lib/judge.mjs';

test('callAnthropicApi posts to Anthropic and returns text content', async () => {
  let captured = null;
  const fetchImpl = async (url, opts) => {
    captured = { url, headers: opts.headers, body: JSON.parse(opts.body) };
    return { ok: true, json: async () => ({ content: [{ type: 'text', text: 'VERDICT' }] }) };
  };
  const out = await callAnthropicApi('sys', 'usr', 'claude-opus-4-8', { apiKey: 'sk-secret', fetchImpl });
  assert.equal(out, 'VERDICT');
  assert.ok(captured.url.includes('api.anthropic.com'));
  assert.equal(captured.body.model, 'claude-opus-4-8');
  assert.equal(captured.headers['x-api-key'], 'sk-secret'); // sent in header, not our logs
});

test('callAnthropicApi throws a clean error on non-ok without leaking the key', async () => {
  const fetchImpl = async () => ({ ok: false, status: 401, text: async () => 'unauthorized' });
  await assert.rejects(() => callAnthropicApi('s', 'u', 'claude-opus-4-8', { apiKey: 'sk-secret', fetchImpl }),
    (e) => !String(e.message).includes('sk-secret'));
});

test('callJudgeViaCli shells the authed claude CLI and returns its result text', async () => {
  let seen = null;
  const exec = async (cmd, args) => { seen = { cmd, args }; return { stdout: JSON.stringify({ result: '{"winner":"A","scoreA":7,"scoreB":6,"rationale":"ok"}' }), code: 0, durationMs: 5 }; };
  const out = await callJudgeViaCli('sys', 'usr', 'claude-opus-4-8', { exec });
  assert.equal(seen.cmd, 'claude');
  assert.ok(seen.args.includes('claude-opus-4-8'));
  assert.match(out, /winner/);
});

test('makeDefaultJudge falls back to the CLI when no API key is set', async () => {
  let usedCli = false;
  const exec = async () => { usedCli = true; return { stdout: JSON.stringify({ result: '{"winner":"B","scoreA":5,"scoreB":8,"rationale":"cli"}' }), code: 0, durationMs: 5 }; };
  const call = makeDefaultJudge({ exec, apiKey: undefined });
  const out = await call('sys', 'usr', 'claude-opus-4-8');
  assert.equal(usedCli, true);
  assert.match(out, /cli/);
});
