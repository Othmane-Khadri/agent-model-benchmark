// src/judge.mjs
// @ts-check
const DEFAULT = 'claude-fable-5', CHALLENGER = 'kimi-k3';

export function truncate(s, n = 4000) { return s.length > n ? s.slice(0, n) + `\n…[truncated ${s.length - n} chars]` : s; }

export function genericJudgePrompt(task, outA, outB) {
  return `You are grading two answers to the same task. Length is NOT quality.
TASK (${task.category}): ${task.prompt}
--- ANSWER A ---
${truncate(outA)}
--- ANSWER B ---
${truncate(outB)}
Reply ONLY with JSON:
{"output_a":{"criteria":{"quality":{"reason":"...","score":1-5}},"overall":1-5},
 "output_b":{"criteria":{"quality":{"reason":"...","score":1-5}},"overall":1-5},
 "winner":"a"|"b"|"tie"}`;
}

/** @param {"a"|"b"|"tie"} raw @param {"ab"|"ba"} order */
export function mapOrderVerdict(raw, order) {
  if (raw === 'tie') return 'tie';
  if (order === 'ab') return raw === 'a' ? DEFAULT : CHALLENGER;
  return raw === 'a' ? CHALLENGER : DEFAULT; // order === 'ba'
}

export function familyVerdict(rawAB, rawBA) {
  const w1 = mapOrderVerdict(rawAB, 'ab'), w2 = mapOrderVerdict(rawBA, 'ba');
  const consistent = w1 === w2 && w1 !== 'tie';
  return { winner: consistent ? w1 : 'tie', position_consistent: consistent };
}

export function judgeConsensus(familyVerdicts) {
  const live = familyVerdicts.filter(v => !v.excluded);
  if (!live.length) return { winner: 'tie', agreement: false, excluded: true, per_family: familyVerdicts };
  const winners = live.map(v => v.winner);
  const allConsistent = live.every(v => v.position_consistent);
  const decisive = allConsistent && winners.every(w => w === winners[0]) && winners[0] !== 'tie';
  return { winner: decisive ? winners[0] : 'tie', agreement: decisive, excluded: false, per_family: familyVerdicts };
}
