import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { loadConfig } from './lib/config.mjs';
import { runBenchmark, HARDCODED_TASK } from './lib/orchestrate.mjs';
import { scanSkills } from './lib/detect-skills.mjs';
import { runInterview, buildTasks } from './lib/interview.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const a = { dryRun: false, out: root, seed: 1, yes: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dry-run') a.dryRun = true;
    else if (argv[i] === '--yes') a.yes = true;
    else if (argv[i] === '--out') a.out = resolve(argv[++i]);
    else if (argv[i] === '--seed') a.seed = Number(argv[++i]);
    else if (argv[i] === '--skills-dir') a.skillsDir = resolve(argv[++i]);
  }
  return a;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = loadConfig(root);

  const skillsDir = args.skillsDir ?? resolve(process.cwd(), '.claude/skills');
  const found = scanSkills(skillsDir);
  let answers;
  if (found.length && !args.yes) {
    answers = await runInterview(found, { isTTY: process.stdin.isTTY });
  }
  const tasks = (await buildTasks({ root, skillsDir, answers })) || [HARDCODED_TASK];

  const res = await runBenchmark({ tasks, config, outDir: args.out, seed: args.seed, dryRun: args.dryRun, log: console.log });
  if (res.dryRun) { console.log('Dry run complete — no calls made.'); return; }
  console.log(`\nVerdict: ${res.resultsJson.headline}`);
  console.log(`results.json -> ${res.jsonPath}`);
  console.log(`results.html -> ${res.htmlPath}`);
}

main().catch((e) => { console.error('benchmark failed:', e.message); process.exit(1); });
