import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

function frontmatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  const out = {};
  if (m) for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return out;
}

export function scanSkills(skillsDir) {
  if (!existsSync(skillsDir)) return [];
  const out = [];
  for (const entry of readdirSync(skillsDir)) {
    const p = join(skillsDir, entry);
    if (!statSync(p).isDirectory()) continue;
    const skillMd = join(p, 'SKILL.md');
    if (!existsSync(skillMd)) continue;
    const fm = frontmatter(readFileSync(skillMd, 'utf8'));
    out.push({ name: fm.name || entry, path: p, description: fm.description || '' });
  }
  return out;
}

// Reduce a SKILL.md description to its core job: drop the "Use when the user
// says ..." trigger list and the "Side-effecting — ..." disclosure, and strip
// wrapping quotes. Those are Claude-Code plumbing, not the task itself.
export function cleanJob(description) {
  let d = String(description || '').trim().replace(/^["']+|["']+$/g, '');
  d = d.split(/\bUse when\b/i)[0];
  d = d.split(/\bSide-?effecting\b/i)[0];
  d = d.trim().replace(/[."'\s]+$/g, '');
  return d || String(description || '').trim();
}

export function skillToTask(skill) {
  // Phrase the task as a self-contained instruction. Do NOT say "run the X
  // skill": an agentic CLI (claude -p / kimi -p) then tries to LOCATE and invoke
  // a skill by that name instead of just doing the work, which biases the
  // comparison and can error out. A plain task is treated identically by both.
  const job = cleanJob(skill.description);
  return {
    id: `your-skill-${skill.name}`,
    category: 'your-skill',
    prompt: `Complete the following task once, on a realistic example input that you invent. Return only the finished deliverable — no preamble, no explanation, and do not look for files or tools.\n\nTask: ${job}.`,
    assert: null,
  };
}
