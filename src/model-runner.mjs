// src/model-runner.mjs
// @ts-check
import { spawnSync } from 'node:child_process';
import { evaluateCheck } from './check.mjs';

export function maskSecrets(str) {
  return String(str ?? '')
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, 'sk-…redacted')
    .replace(/Bearer\s+[A-Za-z0-9._-]{6,}/gi, 'Bearer …redacted')
    .replace(/\b[A-Fa-f0-9]{32,}\b/g, '…redacted');
}

/** @param {string} stdout @returns {{text:string, tokens:number|null, inputTokens:number|null, outputTokens:number|null, turns:number|null}} */
export function parseClaudeJson(stdout) {
  const s = (stdout ?? '').trim();
  if (s.startsWith('{')) {
    try {
      const j = JSON.parse(s);
      const text = (j.result ?? j.text ?? j.content ?? '').toString();
      const it = j.usage?.input_tokens, ot = j.usage?.output_tokens;
      const hasTokens = typeof it === 'number' || typeof ot === 'number';
      const inputTokens = hasTokens ? (typeof it === 'number' ? it : 0) : null;
      const outputTokens = hasTokens ? (typeof ot === 'number' ? ot : 0) : null;
      const tokens = hasTokens ? (inputTokens || 0) + (outputTokens || 0) : null;
      const turns = typeof j.num_turns === 'number' ? j.num_turns : null;
      return { text, tokens, inputTokens, outputTokens, turns };
    } catch { /* fall through */ }
  }
  return { text: s, tokens: null, inputTokens: null, outputTokens: null, turns: null };
}

/** @returns {object} */
export function runModel({ modelId, modelCfg, prompt, check, trial = 0, cwd = process.cwd(), env = process.env }) {
  const started = Date.now();
  const usesStdin = modelCfg.prompt_via === 'stdin';
  const args = [...modelCfg.args, ...(usesStdin ? [] : [prompt])];
  const res = spawnSync(modelCfg.bin, args, {
    input: usesStdin ? prompt : undefined, cwd, env, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
  });
  const latencyMs = Date.now() - started;
  const base = { model: modelId, trial, latencyMs, tokens: null, inputTokens: null, outputTokens: null, turns: null };
  if (res.error) return { ...base, outcome: 'error', output: '', error: maskSecrets(`spawn failed: ${res.error.message}`) };
  if (res.status !== 0) return { ...base, outcome: 'error', output: '', error: maskSecrets(`exit ${res.status}: ${(res.stderr || '').slice(0, 500)}`) };
  const parsed = modelCfg.parse === 'claude-json' ? parseClaudeJson(res.stdout) : { text: (res.stdout ?? '').trim(), tokens: null, inputTokens: null, outputTokens: null, turns: null };
  if (!parsed.text || !parsed.text.trim()) return { ...base, outcome: 'error', output: '', error: 'empty output' };
  return { ...base, outcome: evaluateCheck(check, parsed.text), output: parsed.text, tokens: parsed.tokens, inputTokens: parsed.inputTokens, outputTokens: parsed.outputTokens, turns: parsed.turns, error: null };
}
