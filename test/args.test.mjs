// test/args.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs } from '../src/args.mjs';

test('defaults', () => {
  const a = parseArgs([]);
  assert.equal(a.trials, 3); assert.equal(a.judges, 'dual');
  assert.equal(a.dryRun, false); assert.equal(a.seed, 1234);
});
test('parses trials/judges/dry-run/seed/tasks', () => {
  const a = parseArgs(['--trials', '5', '--judges', 'single', '--dry-run', '--seed', '7', '--tasks', 'config/tasks/sample.json']);
  assert.equal(a.trials, 5); assert.equal(a.judges, 'single');
  assert.equal(a.dryRun, true); assert.equal(a.seed, 7);
  assert.equal(a.tasksPath, 'config/tasks/sample.json');
});
test('invalid judges throws', () => { assert.throws(() => parseArgs(['--judges', 'triple']), /invalid --judges/); });
test('invalid trials throws', () => { assert.throws(() => parseArgs(['--trials', '0']), /invalid --trials/); });
test('unknown flag throws', () => { assert.throws(() => parseArgs(['--wat']), /unknown flag/); });
