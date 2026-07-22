import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function computeHeadline(perTask) {
  // Judged = tasks with a verdict (fable win / kimi win / tie). Ties and errors
  // are reported separately, never silently counted as a loss.
  const judged = perTask.filter((t) => t.quality && ['fable', 'kimi', 'tie'].includes(t.quality.winner));
  const n = judged.length || 1;
  let fableWins = 0, kimiWins = 0, ties = 0, fableCost = 0, kimiCost = 0;
  for (const t of judged) {
    if (t.quality.winner === 'fable') fableWins++;
    else if (t.quality.winner === 'kimi') kimiWins++;
    else ties++;
    fableCost += t.cost?.fable?.value || 0;
    kimiCost += t.cost?.kimi?.value || 0;
  }
  const errored = perTask.filter((t) => t.error).length;
  const cheaper = kimiCost <= fableCost ? 'Kimi K3' : 'Fable 5';
  const hi = Math.max(fableCost, kimiCost), lo = Math.min(fableCost, kimiCost);
  const pct = hi > 0 ? Math.round((1 - lo / hi) * 100) : 0;
  const extras = [];
  if (ties) extras.push(`${ties} tied`);
  if (errored) extras.push(`${errored} errored`);
  const suffix = extras.length ? ` (${extras.join(', ')})` : '';
  return `Fable 5 won ${fableWins}/${n}, Kimi K3 won ${kimiWins}/${n}; ${cheaper} cheaper by ~${pct}% on our estimate (Kimi cost estimated, excludes reasoning tokens)${suffix}.`;
}

export function buildResultsJson({ perTask, meta = {} }) {
  return { meta: { generatedAt: null, ...meta }, headline: computeHeadline(perTask), tasks: perTask };
}

export function renderHtml(resultsJson) {
  const t = resultsJson.tasks;
  const totFable = t.reduce((s, x) => s + (x.cost?.fable?.value || 0), 0);
  const totKimi = t.reduce((s, x) => s + (x.cost?.kimi?.value || 0), 0);
  const avg = (sel) => t.length ? Math.round(t.reduce((s, x) => s + (sel(x) || 0), 0) / t.length) : 0;
  const rows = t.map((x) => `
    <tr><td>${esc(x.taskId)}</td><td>${esc(x.category ?? '-')}</td>
    <td>${esc(x.quality?.winner ?? '-')}</td>
    <td>${esc(x.quality?.scoreFable ?? '-')} / ${esc(x.quality?.scoreKimi ?? '-')}</td>
    <td>${esc(x.latency?.fable ?? '-')}ms / ${esc(x.latency?.kimi ?? '-')}ms</td>
    <td>$${(x.cost?.fable?.value ?? 0).toFixed(4)} / $${(x.cost?.kimi?.value ?? 0).toFixed(4)} <em>(kimi est.)</em></td>
    <td>${esc(x.outcome?.fable ?? '-')} / ${esc(x.outcome?.kimi ?? '-')}</td>
    <td>${x.error ? '<strong>errored (excluded):</strong> ' + esc(x.error) : esc(x.quality?.rationale ?? '')}</td></tr>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Agent Model Benchmark — Fable 5 vs Kimi K3</title>
<style>body{font-family:ui-sans-serif,system-ui,sans-serif;max-width:1000px;margin:2rem auto;padding:0 1rem;color:#111}h1{font-size:1.4rem}.verdict{background:#faf5ff;border:1px solid #e9d5ff;border-radius:12px;padding:1rem;margin:1rem 0}.totals{display:flex;gap:1.5rem;flex-wrap:wrap;margin:1rem 0;font-size:.9rem}.totals div{background:#fafafa;border:1px solid #eee;border-radius:8px;padding:.5rem .8rem}table{border-collapse:collapse;width:100%;font-size:.85rem}th,td{border:1px solid #eee;padding:.45rem;text-align:left;vertical-align:top}th{background:#fafafa}em{color:#888}.legend{color:#666;font-size:.8rem;margin-top:1rem}</style></head>
<body><h1>Fable 5 vs Kimi K3 — your own agent</h1>
<div class="verdict">${esc(resultsJson.headline)}</div>
<div class="totals"><div><strong>Total cost</strong><br>Fable 5 $${totFable.toFixed(4)} · Kimi K3 $${totKimi.toFixed(4)} (est.)</div>
<div><strong>Avg latency</strong><br>Fable ${avg((x) => x.latency?.fable)}ms · Kimi ${avg((x) => x.latency?.kimi)}ms</div></div>
<table><thead><tr><th>Task</th><th>Category</th><th>Winner</th><th>Quality (F/K)</th><th>Latency (F/K)</th><th>Cost (F/K)</th><th>Outcome (F/K)</th><th>Why</th></tr></thead><tbody>${rows}</tbody></table>
<p class="legend">F = Fable 5 (<code>claude-fable-5</code>), K = Kimi K3 (<code>kimi-k3</code> / <code>kimi-for-coding</code>). Fable cost measured from the Claude CLI; <strong>Kimi cost is estimated</strong>, never measured.</p>
</body></html>`;
}

export function writeReports(outDir, resultsJson) {
  const jsonPath = join(outDir, 'results.json');
  const htmlPath = join(outDir, 'results.html');
  writeFileSync(jsonPath, JSON.stringify(resultsJson, null, 2));
  writeFileSync(htmlPath, renderHtml(resultsJson));
  return { jsonPath, htmlPath };
}
