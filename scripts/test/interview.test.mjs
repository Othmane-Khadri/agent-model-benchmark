import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { loadTasksFromDir, buildTasks, selectTasks, runInterview } from '../lib/interview.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('loadTasksFromDir reads the 4 starter tasks with asserts', () => {
  const tasks = loadTasksFromDir(join(root, 'starter-suite'));
  assert.equal(tasks.length, 4);
  assert.ok(tasks.every((t) => t.id && t.prompt));
  assert.ok(tasks.find((t) => t.id === 'coding-fizzbuzz').assert);
});

test('buildTasks falls back to starter suite when no skills dir given', async () => {
  const tasks = await buildTasks({ root });
  assert.equal(tasks.length, 4);
});

test('selectTasks maps chosen skill names + extras into tasks', () => {
  const found = [{ name: 'a', description: 'da' }, { name: 'b', description: 'db' }];
  const tasks = selectTasks({ found, answers: { chosenNames: ['a'], extras: [{ id: 'x', prompt: 'do x' }] } });
  assert.equal(tasks.length, 2);
  assert.ok(tasks.find((t) => t.id.includes('a')));
  assert.ok(tasks.find((t) => t.id === 'x'));
});

test('buildTasks uses scanned skills when skillsDir has them (non-interactive)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'sk-'));
  const s = join(dir, 'foo'); mkdirSync(s);
  writeFileSync(join(s, 'SKILL.md'), '---\nname: foo\ndescription: Do foo.\n---');
  const tasks = await buildTasks({ root, skillsDir: dir });
  assert.ok(tasks.length >= 1 && tasks[0].id.includes('foo'));
});

test('runInterview returns all skills when not a TTY (non-interactive default)', async () => {
  const found = [{ name: 'a', description: 'da' }];
  const ans = await runInterview(found, { isTTY: false });
  assert.deepEqual(ans.chosenNames, ['a']);
  assert.deepEqual(ans.extras, []);
});
