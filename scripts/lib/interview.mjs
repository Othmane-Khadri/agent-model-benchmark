import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { scanSkills, skillToTask } from './detect-skills.mjs';

export function loadTasksFromDir(dir) {
  return readdirSync(dir).filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')))
    .filter((t) => t && t.id && t.prompt)
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function defaultMetrics() {
  return { quality: true, latency: true, cost: true, outcome: true, verbosity: true };
}

export function selectTasks({ found, answers }) {
  const chosen = new Set(answers?.chosenNames ?? found.map((f) => f.name));
  const skillTasks = found.filter((f) => chosen.has(f.name)).map(skillToTask);
  const extras = (answers?.extras ?? []).filter((e) => e && e.id && e.prompt);
  return [...skillTasks, ...extras];
}

export async function runInterview(found, { input, output, isTTY = false } = /** @type {{input?: any, output?: any, isTTY?: boolean}} */ ({})) {
  if (!isTTY) return { chosenNames: found.map((f) => f.name), extras: [] };
  const rl = createInterface({ input: input ?? process.stdin, output: output ?? process.stdout });
  const ask = (q) => new Promise((res) => rl.question(q, res));
  const write = (s) => (output ?? process.stdout).write(s);
  write(`\nFound ${found.length} skill(s):\n`);
  found.forEach((f, i) => write(`  ${i + 1}. ${f.name} — ${f.description}\n`));
  const pick = (await ask('Benchmark which? (comma numbers, or "all") [all]: ')).trim();
  let chosenNames = found.map((f) => f.name);
  if (pick && pick.toLowerCase() !== 'all') {
    const idx = pick.split(',').map((s) => parseInt(s, 10) - 1).filter((n) => found[n]);
    chosenNames = idx.map((n) => found[n].name);
  }
  const extraPrompt = (await ask('Anything else to benchmark? (one prompt, or blank): ')).trim();
  const extras = extraPrompt ? [{ id: 'extra-1', prompt: extraPrompt, assert: null }] : [];
  rl.close();
  return { chosenNames, extras };
}

export async function buildTasks({ root, skillsDir, answers } = /** @type {{root?: string, skillsDir?: string, answers?: any}} */ ({})) {
  if (skillsDir) {
    const found = scanSkills(skillsDir);
    if (found.length) return selectTasks({ found, answers });
  }
  return loadTasksFromDir(join(root, 'starter-suite')); // empty-dir fallback
}
