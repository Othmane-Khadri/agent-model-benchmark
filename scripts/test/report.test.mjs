import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildResultsJson, renderHtml, writeReports, computeHeadline } from '../lib/report.mjs';

const perTask = [{
  taskId: 't1', prompt: 'Do X', category: 'coding',
  quality: { winner: 'fable', scoreFable: 8, scoreKimi: 6, rationale: 'clearer' },
  latency: { fable: 500, kimi: 900 },
  cost: { fable: { value: 0.01, estimated: false }, kimi: { value: 0.003, estimated: true } },
  outcome: { fable: 'pass', kimi: 'pass' },
  verbosity: { fable: { words: 2 }, kimi: { words: 2 } },
}];

test('computeHeadline mentions cheaper side and win count', () => {
  const h = computeHeadline(perTask);
  assert.match(h, /Kimi K3|Fable 5/);
  assert.match(h, /cheaper/i);
});

test('computeHeadline excludes errored tasks and reports them separately', () => {
  const withError = [...perTask, { taskId: 't2', prompt: 'Do Y', category: 'research', error: 'kimi produced no output' }];
  const h = computeHeadline(withError);
  assert.match(h, /won 1\/1/);            // denominator is judged tasks (1), not 2
  assert.match(h, /1 errored/);
});

test('computeHeadline counts a tie separately, not as an error', () => {
  const withTie = [...perTask, { taskId: 't3', prompt: 'Do Z', category: 'reasoning',
    quality: { winner: 'tie', scoreFable: 9, scoreKimi: 9, rationale: 'both correct' },
    cost: { fable: { value: 0.01 }, kimi: { value: 0.002 } } }];
  const h = computeHeadline(withTie);
  assert.match(h, /won 1\/2/);   // 2 judged tasks (1 fable win + 1 tie)
  assert.match(h, /1 tied/);
  assert.doesNotMatch(h, /errored/);
});

test('buildResultsJson carries tasks + headline + meta', () => {
  const r = buildResultsJson({ perTask, meta: { generatedBy: 'test', taskCount: 1 } });
  assert.equal(r.tasks.length, 1);
  assert.ok(r.headline.length > 0);
  assert.equal(r.meta.taskCount, 1);
});

test('renderHtml is self-contained and labels kimi cost estimated', () => {
  const html = renderHtml(buildResultsJson({ perTask, meta: {} }));
  assert.match(html, /<html/i);
  assert.ok(!/<script src=|<link /.test(html)); // no external assets
  assert.match(html, /estimated/i);
  assert.match(html, /Kimi K3/);
  assert.match(html, /Fable 5/);
});

test('renderHtml shows category + rationale + totals strip', () => {
  const html = renderHtml(buildResultsJson({ perTask, meta: {} }));
  assert.match(html, /coding/);
  assert.match(html, /clearer/);      // rationale surfaced
  assert.match(html, /Total cost/i);  // totals strip
});

test('writeReports writes both files', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bench-'));
  const { jsonPath, htmlPath } = writeReports(dir, buildResultsJson({ perTask, meta: {} }));
  assert.ok(JSON.parse(readFileSync(jsonPath, 'utf8')).tasks);
  assert.match(readFileSync(htmlPath, 'utf8'), /<html/i);
});
