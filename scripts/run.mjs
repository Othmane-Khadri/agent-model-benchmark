// scripts/run.mjs
// @ts-check
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from '../src/args.mjs';
import { runModel } from '../src/model-runner.mjs';
import { pairTrials, pairAutoVerdict } from '../src/pairing.mjs';
import { passAtK, passHatK, errorRate, aggregateRate } from '../src/scoring.mjs';
import { buildRouting, routingSnippet } from '../src/routing.mjs';
import { writeReport } from './report.mjs';
import { extractJudgeJson } from '../src/judge-parse.mjs';
import { familyVerdict, judgeConsensus } from '../src/judge.mjs';
import { anchoredJudgePrompt } from '../src/rubrics.mjs';
import { pairedBootstrapCI, winRateCI, ciExcludes } from '../src/bootstrap.mjs';
import { lengthFlag } from '../src/length.mjs';
import { median, percentile } from '../src/stats.mjs';

// mean output length (chars) for a model across its non-error trials on a task
function avgLenByModel(trials, model) {
  const xs = trials.filter(t => t.model === model && t.outcome !== 'error').map(t => t.output.length);
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

const DEFAULT = 'claude-fable-5', CHALLENGER = 'kimi-k3';
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

const mean2 = (x, y) => { const xs = [x, y].filter(v => v != null); return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null; };
const meanArr = (xs) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
function mergeOveralls(fams) {
  const acc = { 'claude-fable-5': [], 'kimi-k3': [] };
  for (const f of fams) if (!f.excluded && f.overall) for (const m of Object.keys(acc)) if (f.overall[m] != null) acc[m].push(f.overall[m]);
  return { 'claude-fable-5': meanArr(acc['claude-fable-5']) ?? null, 'kimi-k3': meanArr(acc['kimi-k3']) ?? null };
}

// per-task delta = mean(fable overall) - mean(kimi overall) across that task's decisive verdicts
function taskQualityDelta(tr) {
  const fs = [], ks = [];
  for (const v of tr.verdicts) if (v.overall) { if (v.overall[DEFAULT] != null) fs.push(v.overall[DEFAULT]); if (v.overall[CHALLENGER] != null) ks.push(v.overall[CHALLENGER]); }
  const m = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  return m(fs) - m(ks);
}
// per-task win share: fable=1, tie=0.5, kimi=0, averaged over decisive verdicts
function taskWinShare(tr) {
  const dec = tr.verdicts.filter(v => !v.excluded && v.reason !== 'both-errored');
  if (!dec.length) return 0.5;
  const s = dec.reduce((acc, v) => acc + (v.winner === DEFAULT ? 1 : v.winner === CHALLENGER ? 0 : 0.5), 0);
  return s / dec.length;
}

function callJudge(judgeCfg, prompt) {
  // Reuse runModel's spawn path by faking a model cfg; judge output is text/JSON.
  const r = runModel({ modelId: 'judge', modelCfg: judgeCfg, prompt, check: { type: 'none' } });
  if (r.outcome === 'error') return { ok: false, reason: r.error };
  const j = extractJudgeJson(r.output);
  if (!j || j.winner == null) return { ok: false, reason: 'judge JSON parse failed' };
  return { ok: true, winner: j.winner, a: j.output_a?.overall ?? null, b: j.output_b?.overall ?? null };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const modelsCfg = readJson(args.models);
  const tasksCfg = readJson(args.tasksPath);
  const pricesCfg = readJson(args.prices);
  const fableCfg = modelsCfg.models[DEFAULT], kimiCfg = modelsCfg.models[CHALLENGER];
  const judgeList = args.judges === 'dual'
    ? [modelsCfg.judges.claude, modelsCfg.judges.kimi]
    : [modelsCfg.judges.claude];

  // --dry-run: count only.
  if (args.dryRun) {
    const decisivePairsUpperBound = tasksCfg.tasks.length * args.trials; // worst case: no auto-verdicts
    const judgeCalls = decisivePairsUpperBound * judgeList.length * 2; // ×2 for dual order
    console.log(`[dry-run] tasks=${tasksCfg.tasks.length} trials=${args.trials} judges=${args.judges}`);
    console.log(`[dry-run] model runs=${tasksCfg.tasks.length * args.trials * 2}, judge calls ≤ ${judgeCalls}`);
    return;
  }

  const t0 = Date.now();
  const runId = `${new Date(t0).toISOString().replace(/[-:T.]/g, '').slice(0, 14)}-${args.seed}`;
  const runDir = join(args.out, runId);
  mkdirSync(runDir, { recursive: true });

  const taskResults = [];
  for (const task of tasksCfg.tasks) {
    const fableTrials = [], kimiTrials = [];
    for (let i = 0; i < args.trials; i++) {
      fableTrials.push(runModel({ modelId: DEFAULT, modelCfg: fableCfg, prompt: task.prompt, check: task.check, trial: i }));
      kimiTrials.push(runModel({ modelId: CHALLENGER, modelCfg: kimiCfg, prompt: task.prompt, check: task.check, trial: i }));
    }
    const pairs = pairTrials(fableTrials, kimiTrials);
    const verdicts = [];
    let flips = 0, decisive = 0;
    for (const p of pairs) {
      const auto = pairAutoVerdict(p.fable, p.kimi);
      if (auto) { verdicts.push({ index: p.index, winner: auto.winner, position_consistent: true, excluded: null, reason: auto.reason }); continue; }
      // dual-order, all families in judgeList
      const familyResults = judgeList.map(j => {
        const ab = callJudge(j, anchoredJudgePrompt(task, p.fable.output, p.kimi.output));
        const ba = callJudge(j, anchoredJudgePrompt(task, p.kimi.output, p.fable.output));
        if (!ab.ok || !ba.ok) return { excluded: { reason: ab.reason || ba.reason || 'judge unreachable' }, family: j.family };
        const fv = familyVerdict(ab.winner, ba.winner);
        return { ...fv, excluded: null, family: j.family,
          overall: { [DEFAULT]: mean2(ab.a, ba.b), [CHALLENGER]: mean2(ab.b, ba.a) } };
      });
      const consensus = judgeConsensus(familyResults);
      if (familyResults.every(f => f.excluded)) { verdicts.push({ index: p.index, winner: 'tie', position_consistent: false, agreement: false, excluded: familyResults[0].excluded }); continue; }
      decisive++;
      if (!consensus.agreement && !familyResults.some(f => f.excluded)) flips++; // count any non-agreement as a "flip/disagreement"
      verdicts.push({ index: p.index, winner: consensus.winner, agreement: consensus.agreement,
        position_consistent: familyResults.every(f => f.excluded || f['position_consistent']),
        per_family: familyResults.map(f => ({ family: f['family'], winner: f['winner'] ?? 'excluded', position_consistent: !!f['position_consistent'] })),
        overall: mergeOveralls(familyResults), judged: true });
    }
    const fableOutcomes = fableTrials.map(t => t.outcome), kimiOutcomes = kimiTrials.map(t => t.outcome);
    taskResults.push({
      id: task.id, category: task.category,
      trials: [...fableTrials, ...kimiTrials],
      verdicts,
      pass_at_k: { [DEFAULT]: passAtK(fableOutcomes), [CHALLENGER]: passAtK(kimiOutcomes) },
      pass_hat_k: { [DEFAULT]: passHatK(fableOutcomes), [CHALLENGER]: passHatK(kimiOutcomes) },
      error_rate: { [DEFAULT]: errorRate(fableOutcomes), [CHALLENGER]: errorRate(kimiOutcomes) },
      flip_rate: decisive ? flips / decisive : 0,
      avg_length: { [DEFAULT]: avgLenByModel(fableTrials, DEFAULT), [CHALLENGER]: avgLenByModel(kimiTrials, CHALLENGER) },
      latency_median_ms: { [DEFAULT]: median(fableTrials.map(t => t.latencyMs)), [CHALLENGER]: median(kimiTrials.map(t => t.latencyMs)) },
    });
    // transcripts
    writeFileSync(join(runDir, `${task.id}.trials.json`), JSON.stringify([...fableTrials, ...kimiTrials], null, 2));
  }

  const perTaskDelta = taskResults.map(taskQualityDelta);
  const perTaskWin = taskResults.map(taskWinShare);
  const qCI = pairedBootstrapCI(perTaskDelta, { seed: args.seed });
  const wCI = winRateCI(perTaskWin, { seed: args.seed });
  const nTasks = taskResults.length;
  let headline;
  if (ciExcludes(qCI, 0)) headline = `${qCI.point > 0 ? DEFAULT : CHALLENGER} wins (95% CI [${qCI.lo.toFixed(2)}, ${qCI.hi.toFixed(2)}] on n=${nTasks} tasks)`;
  else headline = `TIE — no statistically meaningful winner on n=${nTasks} tasks`;

  const allDecisive = taskResults.flatMap(t => t.verdicts.filter(v => v.judged));
  const agreementRate = allDecisive.length ? allDecisive.filter(v => v.agreement).length / allDecisive.length : null;

  // length-bias: on the tasks the run-level winner won, is that model's output >1.5x longer?
  const runWinner = ciExcludes(qCI, 0) ? (qCI.point > 0 ? DEFAULT : CHALLENGER) : null;
  let lenFlag = { flag: false, ratio: null };
  if (runWinner) {
    const loser = runWinner === DEFAULT ? CHALLENGER : DEFAULT;
    const wonTasks = taskResults
      .filter(t => (taskWinShare(t) > 0.5) === (runWinner === DEFAULT))
      .map(t => ({ winnerLen: avgLenByModel(t.trials, runWinner), loserLen: avgLenByModel(t.trials, loser) }));
    lenFlag = lengthFlag(runWinner, wonTasks);
  }
  const allTrialsForLen = taskResults.flatMap(t => t.trials);
  const lengthByModel = {
    [DEFAULT]: avgLenByModel(allTrialsForLen, DEFAULT),
    [CHALLENGER]: avgLenByModel(allTrialsForLen, CHALLENGER),
  };

  // latency percentiles + cost-per-solved. kimi tokens are null → estimated from output length.
  const allTrials = taskResults.flatMap(t => t.trials);
  function costOfTrial(model, trial) {
    const p = pricesCfg.prices[model]; if (!p) return { usd: 0, estimated: true };
    const toks = trial.tokens; // fable: real; kimi: null
    if (toks == null) {
      // kimi has no input token measure — estimate from output length at output rate only
      const est = trial.output.length / 4; // ~4 chars/token, output-heavy assumption
      return { usd: (est / 1e6) * p.output_per_mtok_usd, estimated: true };
    }
    // use split input/output rates when available
    const inp = trial.inputTokens, out = trial.outputTokens;
    if (typeof inp === 'number' && typeof out === 'number') {
      const usd = (inp / 1e6) * p.input_per_mtok_usd + (out / 1e6) * p.output_per_mtok_usd;
      return { usd, estimated: !!p.estimated };
    }
    // fallback: combined tokens at output rate (backward compat if splits somehow missing)
    return { usd: (toks / 1e6) * p.output_per_mtok_usd, estimated: !!p.estimated };
  }
  function modelLatency(model) {
    const xs = allTrials.filter(t => t.model === model).map(t => t.latencyMs);
    return { median: median(xs), p95: percentile(xs, 95) };
  }
  function modelCostPerSolved(model) {
    const totalCost = allTrials.filter(t => t.model === model).reduce((a, t) => a + costOfTrial(model, t).usd, 0);
    const solved = taskResults.filter(t => t.trials.some(tr => tr.model === model && tr.outcome === 'pass')).length;
    const estimated = pricesCfg.prices[model]?.estimated || allTrials.some(t => t.model === model && t.tokens == null);
    return { total_usd: totalCost, solved_tasks: solved, cost_per_solved_usd: solved ? totalCost / solved : null, estimated };
  }
  const latency = { [DEFAULT]: modelLatency(DEFAULT), [CHALLENGER]: modelLatency(CHALLENGER) };
  const cost = { [DEFAULT]: modelCostPerSolved(DEFAULT), [CHALLENGER]: modelCostPerSolved(CHALLENGER) };
  const costBasis = { as_of: pricesCfg.as_of, sources: Object.fromEntries(Object.entries(pricesCfg.prices).map(([m, p]) => [m, { basis: p.basis, estimated: !!p.estimated }])) };

  const results = {
    schema: 2, run_id: runId, seed: args.seed, trials: args.trials, judges_mode: args.judges,
    default_model: DEFAULT, challenger: CHALLENGER, duration_ms: Date.now() - t0,
    headline,
    win_rate: perTaskWin.reduce((a, b) => a + b, 0) / (perTaskWin.length || 1),
    win_rate_ci: wCI, quality_delta_ci: qCI, agreement_rate: agreementRate,
    length_flag: lenFlag, length_by_model: lengthByModel,
    latency, cost, cost_basis: costBasis,
    tasks: taskResults.map(t => ({ id: t.id, category: t.category, flip_rate: t.flip_rate, pass_at_k: t.pass_at_k[DEFAULT], pass_hat_k: t.pass_hat_k[DEFAULT], trials: t.trials })),
    tasks_full: taskResults,
  };

  // per-category routing evidence → model-routing.json + routing-snippet.md (gated)
  const byCat = {};
  for (const t of taskResults) (byCat[t.category] ||= []).push(t);
  const categories = Object.entries(byCat).map(([category, ts]) => {
    const winShares = ts.map(taskWinShare);
    const wr = winShares.reduce((a, b) => a + b, 0) / winShares.length;
    const wrCI = winRateCI(winShares, { seed: args.seed });
    // per-family win share for default across this category's decisive verdicts
    const famShare = (fam) => {
      const vs = ts.flatMap(t => t.verdicts).filter(v => v.per_family).flatMap(v => v.per_family).filter(pf => pf.family === fam && pf.winner !== 'excluded');
      if (!vs.length) return 0.5;
      return vs.reduce((a, pf) => a + (pf.winner === DEFAULT ? 1 : pf.winner === CHALLENGER ? 0 : 0.5), 0) / vs.length;
    };
    return {
      category, nTasks: ts.length, trials: args.trials,
      winRateForDefault: wr, winRateCI: wrCI,
      passHatK: { default: aggregateRate(ts.map(t => t.pass_hat_k[DEFAULT])), challenger: aggregateRate(ts.map(t => t.pass_hat_k[CHALLENGER])) },
      perFamilyWinRateForDefault: { claude: famShare('claude'), kimi: famShare('kimi') },
      costPerSolved: { default: cost[DEFAULT].cost_per_solved_usd ?? 0, challenger: cost[CHALLENGER].cost_per_solved_usd ?? 0 },
    };
  });
  const routing = buildRouting({ runId, date: new Date(t0).toISOString().slice(0, 10), defaultModel: DEFAULT, challenger: CHALLENGER, categories });
  writeFileSync(join(runDir, 'model-routing.json'), JSON.stringify(routing, null, 2));
  writeFileSync(join(runDir, 'routing-snippet.md'), routingSnippet(routing));
  results.routing = routing;

  writeFileSync(join(runDir, 'results.json'), JSON.stringify(results, null, 2));
  writeReport(join(runDir, 'results.html'), results);
  console.log(`wrote ${join(runDir, 'results.json')} and results.html`);
}

main();
