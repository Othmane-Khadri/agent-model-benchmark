// src/args.mjs
// @ts-check
export function parseArgs(argv) {
  const a = { trials: 3, judges: 'dual', dryRun: false, seed: 1234,
    tasksPath: 'config/tasks/p1-smoke.json', out: 'runs',
    models: 'config/models.json', prices: 'config/prices.json' };
  for (let i = 0; i < argv.length; i++) {
    const f = argv[i];
    const next = () => argv[++i];
    switch (f) {
      case '--trials': { const n = Number(next()); if (!Number.isInteger(n) || n < 1) throw new Error('invalid --trials'); a.trials = n; break; }
      case '--judges': { const v = next(); if (v !== 'dual' && v !== 'single') throw new Error('invalid --judges'); a.judges = v; break; }
      case '--dry-run': a.dryRun = true; break;
      case '--seed': a.seed = Number(next()); break;
      case '--tasks': a.tasksPath = next(); break;
      case '--out': a.out = next(); break;
      case '--models': a.models = next(); break;
      case '--prices': a.prices = next(); break;
      default: throw new Error(`unknown flag: ${f}`);
    }
  }
  return a;
}
