import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runBenchmark, HARDCODED_TASK } from '../lib/orchestrate.mjs';
import { loadConfig } from '../lib/config.mjs';
import { loadTasksFromDir, buildTasks } from '../lib/interview.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');

// exec shim: route 'claude'/'kimi' to the fake fixtures via node, else real
function makeExec() {
  return async (cmd, args) => {
    const { execCapture } = await import('../lib/exec.mjs');
    if (cmd === 'claude') return execCapture(process.execPath, [join(here, 'fixtures/fake-claude.mjs'), ...args]);
    if (cmd === 'kimi') return execCapture(process.execPath, [join(here, 'fixtures/fake-kimi.mjs'), ...args]);
    return execCapture(cmd, args);
  };
}

test('runBenchmark end-to-end against fake CLIs: $0, deterministic, renders reports', async () => {
  const outDir = mkdtempSync(join(tmpdir(), 'bench-run-'));
  const config = loadConfig(root);
  const callAnthropic = async () => JSON.stringify({ winner: 'A', scoreA: 8, scoreB: 6, rationale: 'A clearer' });
  const res = await runBenchmark({
    tasks: [HARDCODED_TASK], config, outDir, seed: 7,
    exec: makeExec(), callAnthropic, log: () => {},
  });
  const json = JSON.parse(readFileSync(res.jsonPath, 'utf8'));
  assert.equal(json.tasks.length, 1);
  assert.equal(json.tasks[0].cost.fable.value, 0); // fake claude reports $0
  assert.equal(json.tasks[0].cost.kimi.estimated, true);
  assert.ok(json.headline.includes('Fable 5') || json.headline.includes('Kimi K3'));
  assert.match(readFileSync(res.htmlPath, 'utf8'), /<html/i);
});

test('runBenchmark --dry-run makes no calls', async () => {
  let called = false;
  const res = await runBenchmark({
    tasks: [HARDCODED_TASK], config: loadConfig(root), outDir: tmpdir(), dryRun: true,
    exec: async () => { called = true; return { stdout: '', code: 0, durationMs: 0 }; },
    callAnthropic: async () => { called = true; return '{}'; },
  });
  assert.equal(res.dryRun, true);
  assert.equal(called, false);
});

test('runBenchmark over the 4-task starter suite renders a per-task table', async () => {
  const outDir = mkdtempSync(join(tmpdir(), 'bench-suite-'));
  const tasks = loadTasksFromDir(join(root, 'starter-suite'));
  const config = loadConfig(root);
  const callAnthropic = async () => JSON.stringify({ winner: 'B', scoreA: 6, scoreB: 7, rationale: 'B tighter' });
  const res = await runBenchmark({ tasks, config, outDir, seed: 3, exec: makeExec(), callAnthropic });
  const json = JSON.parse(readFileSync(res.jsonPath, 'utf8'));
  assert.equal(json.tasks.length, 4);
  const html = readFileSync(res.htmlPath, 'utf8');
  assert.ok((html.match(/<tr>/g) || []).length >= 5); // header + 4 rows
});

test('run over a --skills-dir benchmarks the scanned skills', async () => {
  const sdir = mkdtempSync(join(tmpdir(), 'skills2-'));
  const one = join(sdir, 'greeter'); mkdirSync(one);
  writeFileSync(join(one, 'SKILL.md'), '---\nname: greeter\ndescription: Greet the user.\n---');
  const outDir = mkdtempSync(join(tmpdir(), 'bench-sk-'));
  const tasks = await buildTasks({ root, skillsDir: sdir });
  const callAnthropic = async () => JSON.stringify({ winner: 'A', scoreA: 7, scoreB: 7, rationale: 'tie-ish' });
  const res = await runBenchmark({ tasks, config: loadConfig(root), outDir, seed: 5, exec: makeExec(), callAnthropic });
  const json = JSON.parse(readFileSync(res.jsonPath, 'utf8'));
  assert.ok(json.tasks[0].taskId.includes('greeter'));
});

test('dry-run over a skills dir lists the skill tasks without calls', async () => {
  const sdir = mkdtempSync(join(tmpdir(), 'skills3-'));
  const one = join(sdir, 'summ'); mkdirSync(one);
  writeFileSync(join(one, 'SKILL.md'), '---\nname: summ\ndescription: Summarize text.\n---');
  const tasks = await buildTasks({ root, skillsDir: sdir });
  let called = false;
  const res = await runBenchmark({ tasks, config: loadConfig(root), outDir: tmpdir(), dryRun: true,
    exec: async () => { called = true; return { stdout: '', code: 0, durationMs: 0 }; },
    callAnthropic: async () => { called = true; return '{}'; } });
  assert.equal(res.dryRun, true);
  assert.equal(called, false);
});
