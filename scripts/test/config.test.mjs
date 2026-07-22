import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { loadConfig } from '../lib/config.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('loadConfig returns models/pricing/metrics with exact model ids', () => {
  const cfg = loadConfig(root);
  assert.equal(cfg.models.fable.model, 'claude-fable-5');
  assert.equal(cfg.models.judge.model, 'claude-opus-4-8');
  assert.equal(cfg.models.kimi.cli, 'kimi');
  assert.equal(typeof cfg.pricing['kimi-for-coding'].outputPerM, 'number');
  assert.equal(cfg.metrics.quality, true);
});

test('loadConfig throws when fable model id is missing', () => {
  assert.throws(() => loadConfig(root, { models: { fable: {}, judge: {}, kimi: {} } }),
    /fable\.model/);
});
