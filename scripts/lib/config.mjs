import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p) => JSON.parse(readFileSync(p, 'utf8'));

export function loadConfig(rootDir, override) {
  const models = override?.models ?? read(resolve(rootDir, 'config/models.json'));
  const pricing = override?.pricing ?? read(resolve(rootDir, 'config/pricing.json'));
  const metrics = override?.metrics ?? read(resolve(rootDir, 'config/metrics.json'));
  if (!models?.fable?.model) throw new Error('config/models.json: fable.model is required');
  if (!models?.judge?.model) throw new Error('config/models.json: judge.model is required');
  if (!models?.kimi?.cli) throw new Error('config/models.json: kimi.cli is required');
  return { models, pricing, metrics };
}
