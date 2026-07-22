import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execCapture } from '../lib/exec.mjs';

test('execCapture captures stdout, exit code, and a duration', async () => {
  const r = await execCapture(process.execPath, ['-e', 'process.stdout.write("hi")']);
  assert.equal(r.stdout, 'hi');
  assert.equal(r.code, 0);
  assert.ok(r.durationMs >= 0);
});

test('execCapture returns non-zero code without throwing', async () => {
  const r = await execCapture(process.execPath, ['-e', 'process.exit(3)']);
  assert.equal(r.code, 3);
});
