import { execCapture } from './exec.mjs';
import { estimateKimiCost } from './metrics.mjs';

export function parseClaudeJson(stdout) {
  let obj;
  try { obj = JSON.parse(stdout); }
  catch { throw new Error('runner: failed to parse claude --output-format json stdout'); }
  if (obj == null || typeof obj.result !== 'string') {
    throw new Error('runner: claude JSON missing string `result`');
  }
  return {
    result: obj.result,
    costUsd: typeof obj.total_cost_usd === 'number' ? obj.total_cost_usd : 0,
    durationMs: typeof obj.duration_ms === 'number' ? obj.duration_ms : null,
    usage: obj.usage ?? null,
  };
}

export async function runFable(prompt, { models, exec = execCapture }) {
  const { cli, model } = models.fable;
  const args = ['-p', prompt, '--model', model, '--output-format', 'json'];
  const res = await exec(cli, args, { timeoutMs: 180000 });
  if (res.code !== 0 || !String(res.stdout || '').trim()) {
    throw new Error(`runner: "${cli}" produced no output (exit ${res.code}). Is it installed and on PATH? stderr: ${String(res.stderr || '').slice(0, 300)}`);
  }
  const parsed = parseClaudeJson(res.stdout);
  return {
    cli, model,
    output: parsed.result,
    durationMs: parsed.durationMs ?? res.durationMs,
    costUsd: parsed.costUsd,
    usage: parsed.usage,
  };
}

// The kimi CLI decorates -p stdout with a leading "• " bullet and can append a
// "To resume this session: kimi -r ..." trailer. Those are CLI chrome, not the
// model's answer — strip them so quality/format scoring reflects the content
// (notably: the bullet otherwise breaks strict-JSON tasks). The bullet quirk is
// still documented in the guide as a real gotcha for piping kimi -p output.
export function stripKimiChrome(stdout) {
  let out = String(stdout || '');
  out = out.replace(/^\s*(?:•\s*)+/, '');
  out = out.replace(/\n?\s*To resume this session:.*$/s, '');
  return out.trim();
}

export async function runKimi(prompt, { models, pricing, exec = execCapture }) {
  const { cli, modelLabel } = models.kimi;
  const res = await exec(cli, ['-p', prompt], { timeoutMs: 180000 });
  const output = stripKimiChrome(res.stdout);
  if (res.code !== 0 || output === '') {
    throw new Error(`runner: "${cli}" produced no output (exit ${res.code}). Is the kimi CLI installed (~/.kimi-code/bin) and logged in? stderr: ${String(res.stderr || '').slice(0, 300)}`);
  }
  const { cost } = estimateKimiCost(prompt, output, pricing);
  return { cli, modelLabel: modelLabel ?? 'kimi-k3', output, durationMs: res.durationMs, costUsd: cost, estimated: true };
}
