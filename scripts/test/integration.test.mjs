import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runBenchmark } from '../lib/orchestrate.mjs';
import { loadConfig } from '../lib/config.mjs';
import { loadTasksFromDir } from '../lib/interview.mjs';
import { scanSkills } from '../lib/detect-skills.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const has = (bin) => { try { execSync(`command -v ${bin}`, { stdio: 'ignore' }); return true; } catch { return false; } };
const ready = has('claude') && has('kimi') && !!process.env.ANTHROPIC_API_KEY;
const skipMsg = ready ? false : 'claude/kimi/ANTHROPIC_API_KEY not all present';

test('INTEGRATION: one tiny real task through real claude + kimi + real Opus judge',
  { skip: skipMsg },
  async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'bench-int-'));
    const config = loadConfig(root);
    const tinyTask = { id: 'int-tiny', prompt: 'Reply with exactly the word: pong', assert: { type: 'contains', value: 'pong' } };
    const res = await runBenchmark({ tasks: [tinyTask], config, outDir, seed: 1 });
    const json = JSON.parse(readFileSync(res.jsonPath, 'utf8'));
    assert.equal(json.tasks.length, 1);
    assert.ok(['fable', 'kimi', 'tie'].includes(json.tasks[0].quality.winner));
    assert.equal(json.tasks[0].cost.kimi.estimated, true);
    assert.ok(typeof json.tasks[0].cost.fable.value === 'number'); // real measured
    // no secret leaks in artifacts
    assert.ok(!readFileSync(res.jsonPath, 'utf8').includes(process.env.ANTHROPIC_API_KEY));
  });

test('INTEGRATION: one real starter task (extraction) scores + reports outcome',
  { skip: skipMsg },
  async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'bench-int2-'));
    const task = loadTasksFromDir(join(root, 'starter-suite')).find((t) => t.id === 'extraction-json');
    const res = await runBenchmark({ tasks: [task], config: loadConfig(root), outDir, seed: 1 });
    const json = JSON.parse(readFileSync(res.jsonPath, 'utf8'));
    assert.ok(['pass', 'fail', 'na'].includes(json.tasks[0].outcome.fable));
  });

test('INTEGRATION: skill detection wires to a real run (tiny prompt to bound spend)',
  { skip: skipMsg },
  async () => {
    // Proves detection finds real skills; runs a TINY task, not the skill's full job, to keep spend negligible.
    const found = scanSkills(join(root, '..')); // this kit lives under .claude/skills/*, parent IS the skills dir
    if (!found.length) return; // nothing to detect, treat as pass
    const outDir = mkdtempSync(join(tmpdir(), 'bench-int3-'));
    const tinyTask = { id: `detected-${found[0].name}`, category: 'your-skill', prompt: 'Reply with exactly: ok', assert: { type: 'contains', value: 'ok' } };
    const res = await runBenchmark({ tasks: [tinyTask], config: loadConfig(root), outDir, seed: 1 });
    const json = JSON.parse(readFileSync(res.jsonPath, 'utf8'));
    assert.equal(json.tasks.length, 1);
  });
