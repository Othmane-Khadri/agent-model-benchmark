export function estimateTokens(text) {
  return Math.max(1, Math.ceil((text ? String(text).length : 0) / 4));
}

export function estimateKimiCost(promptText, outputText, pricing) {
  const p = pricing['kimi-for-coding'] || { inputPerM: 0, outputPerM: 0 };
  const inTok = estimateTokens(promptText), outTok = estimateTokens(outputText);
  const cost = (inTok / 1e6) * p.inputPerM + (outTok / 1e6) * p.outputPerM;
  return { cost, estimated: true };
}

export function verbosity(text) {
  const s = text ? String(text) : '';
  const words = s.trim() ? s.trim().split(/\s+/).length : 0;
  return { chars: s.length, words };
}

export function checkOutcome(task, output) {
  const a = task?.assert;
  if (!a) return 'na';
  const out = output == null ? '' : String(output);
  if (a.type === 'contains') return out.includes(a.value) ? 'pass' : 'fail';
  if (a.type === 'regex') return new RegExp(a.value).test(out) ? 'pass' : 'fail';
  return 'na';
}

export function computeMetrics({ fableRun, kimiRun, judge, task, metricsCfg = /** @type {Record<string, boolean>} */ ({}) }) {
  const m = { taskId: task?.id };
  if (metricsCfg.quality !== false) m.quality = judge ? { winner: judge.winner, scoreFable: judge.scoreFable, scoreKimi: judge.scoreKimi, rationale: judge.rationale } : null;
  if (metricsCfg.latency !== false) m.latency = { fable: fableRun?.durationMs ?? null, kimi: kimiRun?.durationMs ?? null };
  if (metricsCfg.cost !== false) m.cost = { fable: { value: fableRun?.costUsd ?? null, estimated: false }, kimi: { value: kimiRun?.costUsd ?? null, estimated: true } };
  if (metricsCfg.outcome !== false) m.outcome = { fable: checkOutcome(task, fableRun?.output), kimi: checkOutcome(task, kimiRun?.output) };
  if (metricsCfg.verbosity !== false) m.verbosity = { fable: verbosity(fableRun?.output), kimi: verbosity(kimiRun?.output) };
  return m;
}
