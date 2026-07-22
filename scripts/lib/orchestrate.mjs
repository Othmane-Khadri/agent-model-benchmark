import { runFable, runKimi } from './runner.mjs';
import { judge as judgeFn, makeDefaultJudge, mulberry32 } from './judge.mjs';
import { computeMetrics } from './metrics.mjs';
import { buildResultsJson, writeReports } from './report.mjs';

export const HARDCODED_TASK = {
  id: 'skeleton-text',
  prompt: 'In one sentence, explain what a GTM engineer does.',
  assert: null,
};

export async function runBenchmark(opts) {
  const { tasks, config, outDir, seed = 1, dryRun = false,
          exec, callAnthropic, log = () => {} } = opts;
  const rng = mulberry32(seed);

  if (dryRun) {
    log(`[dry-run] ${tasks.length} task(s), no CLI/judge calls:`);
    tasks.forEach((t) => log(`  - ${t.id}: ${t.prompt.slice(0, 60)}`));
    return { dryRun: true, tasks };
  }

  const callJudge = callAnthropic ?? makeDefaultJudge({ exec });

  const perTask = [];
  for (const task of tasks) {
    // One task that errors (e.g. a CLI hiccup or timeout) must not sink the whole
    // run — record it as errored and excluded, then keep going.
    try {
      log(`  running ${task.id} ...`);
      const fableRun = await runFable(task.prompt, { models: config.models, exec });
      const kimiRun = await runKimi(task.prompt, { models: config.models, pricing: config.pricing, exec });
      const verdict = await judgeFn(task, fableRun.output, kimiRun.output,
        { rng, callAnthropic: callJudge, model: config.models.judge.model });
      const m = computeMetrics({ fableRun, kimiRun, judge: verdict, task, metricsCfg: config.metrics });
      perTask.push({ ...m, taskId: task.id, prompt: task.prompt, category: task.category });
    } catch (err) {
      log(`  ! ${task.id} errored (excluded): ${err.message}`);
      perTask.push({ taskId: task.id, prompt: task.prompt, category: task.category, error: err.message });
    }
  }

  const resultsJson = buildResultsJson({ perTask, meta: { generatedBy: 'agent-model-benchmark', taskCount: tasks.length } });
  const { jsonPath, htmlPath } = writeReports(outDir, resultsJson);
  return { resultsJson, jsonPath, htmlPath };
}
