import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (f) => readFileSync(join(root, f), 'utf8');

test('SETUP.md documents the three Kimi connection methods + CLAUDE.md snippet', () => {
  const s = read('SETUP.md');
  assert.match(s, /kimi CLI/i);
  assert.match(s, /api\.kimi\.com\/coding\/v1/);
  assert.match(s, /claude --model kimi-for-coding/);
  assert.match(s, /kimi -p/);
  assert.match(s, /CLAUDE\.md/);
});

test('docs use exact model strings and never "Kimi 3"/"K2 Thinking"', () => {
  for (const f of ['SKILL.md', 'README.md', 'SETUP.md']) {
    const s = read(f);
    assert.ok(!/Kimi 3\b/.test(s), `${f} uses forbidden "Kimi 3"`);
    assert.ok(!/K2 Thinking/i.test(s), `${f} uses forbidden "K2 Thinking"`);
  }
  assert.match(read('README.md'), /claude-fable-5/);
});

test('no em dash in shipped docs (house style)', () => {
  for (const f of ['SKILL.md', 'README.md', 'SETUP.md']) {
    assert.ok(!read(f).includes('—'), `${f} contains an em dash`);
  }
});

test('README states Kimi cost is estimated', () => {
  assert.match(read('README.md'), /estimated/i);
});

test('no file embeds a real-looking secret value', () => {
  for (const f of ['SKILL.md', 'README.md', 'SETUP.md']) {
    assert.ok(!/sk-[a-zA-Z0-9]{20,}/.test(read(f)), `${f} looks like it contains a key`);
  }
});
