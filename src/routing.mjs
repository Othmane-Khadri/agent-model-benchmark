// src/routing.mjs
// @ts-check
import { ciExcludes } from './bootstrap.mjs';

export function buildRouting({ runId, date, defaultModel, challenger, categories }) {
  const rules = categories.map(c => {
    const kimiFavored = c.winRateForDefault < 0.5;
    const g1 = ciExcludes(c.winRateCI, 0.5);
    // route-to-challenger gates
    const cg2 = c.passHatK.challenger >= c.passHatK.default;
    const cg3 = c.perFamilyWinRateForDefault.claude < 0.5 && c.perFamilyWinRateForDefault.kimi < 0.5;
    // route-to-default (keep) gates
    const dg2 = c.passHatK.default >= c.passHatK.challenger;
    const dg3 = c.perFamilyWinRateForDefault.claude > 0.5 && c.perFamilyWinRateForDefault.kimi > 0.5;

    let route_to = defaultModel, confidence = 'insufficient-evidence';
    if (g1 && kimiFavored && cg2 && cg3) { route_to = challenger; confidence = 'high'; }
    else if (g1 && !kimiFavored && dg2 && dg3) { route_to = defaultModel; confidence = 'high'; }

    return {
      category: c.category, route_to, confidence,
      evidence: {
        win_rate: c.winRateForDefault, ci95: [c.winRateCI.lo, c.winRateCI.hi],
        n_tasks: c.nTasks, trials: c.trials,
        pass_hat_k: { [defaultModel]: c.passHatK.default, [challenger]: c.passHatK.challenger },
      },
      cost_per_solved_usd: { [defaultModel]: c.costPerSolved.default, [challenger]: c.costPerSolved.challenger, basis: 'kimi estimated' },
      fallback: defaultModel,
    };
  });
  return { version: date, source_run: runId, default_model: defaultModel, rules };
}

export function routingSnippet(routing) {
  const toKimi = routing.rules.filter(r => r.route_to !== routing.default_model && r.confidence === 'high').map(r => r.category);
  const keep = routing.rules.filter(r => !toKimi.includes(r.category)).map(r => r.category);
  const kimiLine = toKimi.length ? `route ${toKimi.join(', ')} to kimi via \`kimi -p\`` : 'route nothing to kimi (no category cleared the gates)';
  const keepLine = keep.length ? `keep ${keep.join(', ')} on the default model (${routing.default_model})` : '';
  return `## Model routing, derived from a benchmark run on ${routing.version}
${kimiLine}; ${keepLine}. Re-benchmark monthly.
Source run: ${routing.source_run}. Rules with confidence "insufficient-evidence" stay on the default — an explicit unknown beats a noisy rule.`;
}
