import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scanSkills, skillToTask, cleanJob } from '../lib/detect-skills.mjs';

function fixtureSkills() {
  const dir = mkdtempSync(join(tmpdir(), 'skills-'));
  const a = join(dir, 'reddit-writer'); mkdirSync(a);
  writeFileSync(join(a, 'SKILL.md'), '---\nname: reddit-writer\ndescription: Write a Reddit thread in brand voice.\n---\nbody');
  mkdirSync(join(dir, 'not-a-skill')); // no SKILL.md -> skipped
  return dir;
}

test('scanSkills reads frontmatter and skips dirs without SKILL.md', () => {
  const found = scanSkills(fixtureSkills());
  assert.equal(found.length, 1);
  assert.equal(found[0].name, 'reddit-writer');
  assert.match(found[0].description, /Reddit thread/);
});

test('skillToTask builds a self-contained task without skill-invocation framing', () => {
  const t = skillToTask({ name: 'reddit-writer', description: 'Write a Reddit thread in brand voice.' });
  assert.ok(t.id.includes('reddit-writer'));
  assert.match(t.prompt, /Reddit thread/i);
  // Must NOT tell the model to "run the skill" — that makes an agentic CLI hunt
  // for a skill file instead of doing the work.
  assert.doesNotMatch(t.prompt, /running the|this skill/i);
});

test('cleanJob strips trigger list and side-effect disclosure', () => {
  const desc = 'Generate a personalized outbound message. Use when the user says "personalize this". Side-effecting — calls Anthropic.';
  const job = cleanJob(desc);
  assert.match(job, /personalized outbound message/i);
  assert.doesNotMatch(job, /Use when|Side-?effecting/i);
});
