// scripts/report.mjs
// @ts-check
import { writeFileSync } from 'node:fs';

/** Render results object → HTML string. Kept dependency-free + XSS-safe via escape. */
export function renderHtml(results) {
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const rows = results.tasks.map(t => {
    const trialCells = t.trials.map(tr => `${esc(tr.model.split('-')[0])} t${tr.trial}: ${esc(tr.outcome)}`).join('<br>');
    return `<tr><td>${esc(t.id)}</td><td>${esc(t.category)}</td>
      <td>${(t.pass_at_k ?? 0)}</td><td>${(t.pass_hat_k ?? 0)}</td>
      <td>${(t.flip_rate ?? 0).toFixed(2)}</td><td>${trialCells}</td></tr>`;
  }).join('\n');
  const head = results.headline ? `<h2>${esc(results.headline)}</h2>` : '';
  const meta = `<p>win rate ${(results.win_rate ?? 0).toFixed(2)} · agreement ${results.agreement_rate == null ? 'n/a' : results.agreement_rate.toFixed(2)} · qΔ CI [${results.quality_delta_ci?.lo?.toFixed?.(2) ?? '—'}, ${results.quality_delta_ci?.hi?.toFixed?.(2) ?? '—'}]</p>`;
  const warn = results.judges_mode === 'single' ? `<p style="color:#a00">single-family judge: Claude-favorable results contested</p>` : '';
  const lenNote = results.length_flag?.flag ? `<p style="color:#a60">length-bias flag: winner outputs ${results.length_flag.ratio?.toFixed?.(2)}× longer on won tasks</p>` : '';
  return `<!doctype html><meta charset=utf8><title>agent-model-benchmark ${esc(results.run_id)}</title>
<style>body{font:14px system-ui;margin:2rem}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:4px 8px}</style>
<h1>agent-model-benchmark — schema ${results.schema}</h1>${head}${meta}${warn}${lenNote}
<p>run: ${esc(results.run_id)} · seed ${results.seed} · trials ${results.trials} · judges ${esc(results.judges_mode)}</p>
<table><tr><th>task</th><th>category</th><th>pass@k</th><th>pass^k</th><th>flip rate</th><th>trials</th></tr>${rows}</table>`;
}

export function writeReport(path, results) { writeFileSync(path, renderHtml(results)); }
