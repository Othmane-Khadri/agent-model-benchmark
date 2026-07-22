export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomizeAB(fableOut, kimiOut, rng) {
  const fableIsA = rng() < 0.5;
  return fableIsA
    ? { A: fableOut, B: kimiOut, aIs: 'fable' }
    : { A: kimiOut, B: fableOut, aIs: 'kimi' };
}

export function buildJudgePrompt(task, A, B) {
  const system = 'You are a blind, impartial evaluator of two AI assistant answers. You do not know which model produced which. Score each on how well it satisfies the task: correctness, completeness, instruction-following, and clarity. Respond ONLY with minified JSON: {"winner":"A"|"B"|"tie","scoreA":1-10,"scoreB":1-10,"rationale":"one sentence"}.';
  const user = `TASK:\n${task.prompt}\n\n--- ANSWER A ---\n${A}\n\n--- ANSWER B ---\n${B}\n\nReturn the JSON verdict now.`;
  return { system, user };
}

function parseVerdict(text) {
  const match = String(text).match(/\{[\s\S]*\}/);
  if (!match) throw new Error('judge: no JSON verdict found in response');
  return JSON.parse(match[0]);
}

export async function judge(task, fableOut, kimiOut, { rng, callAnthropic, model }) {
  const { A, B, aIs } = randomizeAB(fableOut, kimiOut, rng);
  const { system, user } = buildJudgePrompt(task, A, B);
  const raw = await callAnthropic(system, user, model);
  const v = parseVerdict(raw);
  const bIs = aIs === 'fable' ? 'kimi' : 'fable';
  const scoreFable = aIs === 'fable' ? v.scoreA : v.scoreB;
  const scoreKimi = aIs === 'fable' ? v.scoreB : v.scoreA;
  let winner = 'tie';
  if (v.winner === 'A') winner = aIs;
  else if (v.winner === 'B') winner = bIs;
  return { winner, scoreFable, scoreKimi, rationale: v.rationale ?? '' };
}

import { execCapture } from './exec.mjs';

export async function callAnthropicApi(system, user, model, opts = /** @type {{apiKey?: string, fetchImpl?: any}} */ ({})) {
  const apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY;
  const fetchImpl = opts.fetchImpl ?? fetch;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
  const res = await fetchImpl('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 512,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) {
    const detail = typeof res.text === 'function' ? await res.text() : '';
    throw new Error(`Anthropic API error ${res.status}: ${detail}`.slice(0, 300));
  }
  const data = await res.json();
  const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  return text;
}

// Fallback judge transport: use the already-authed `claude` CLI (no separate API
// key or credits required). Honors the kit's "no new API key" promise for users
// on a Claude subscription whose ANTHROPIC_API_KEY is unset or out of credits.
export async function callJudgeViaCli(system, user, model, opts = /** @type {{exec?: any}} */ ({})) {
  const exec = opts.exec ?? execCapture;
  const combined = `${system}\n\n${user}`;
  const res = await exec('claude', ['-p', combined, '--model', model, '--output-format', 'json'], { timeoutMs: 180000 });
  try {
    const parsed = JSON.parse(res.stdout);
    if (typeof parsed.result === 'string') return parsed.result;
  } catch { /* not JSON — return raw stdout below */ }
  return res.stdout;
}

// Default judge caller: API-first (as the spec mandates), CLI fallback on a
// missing key or a non-ok API response. Mirrors the repo's API-first-with-fallback doctrine.
export function makeDefaultJudge(opts = /** @type {{exec?: any, apiKey?: string}} */ ({})) {
  const exec = opts.exec;
  const apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY;
  return async (system, user, model) => {
    if (apiKey) {
      try { return await callAnthropicApi(system, user, model, { apiKey }); }
      catch { /* fall through to the authed CLI */ }
    }
    return callJudgeViaCli(system, user, model, { exec });
  };
}
