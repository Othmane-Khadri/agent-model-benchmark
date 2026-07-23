// src/length.mjs
// @ts-check
export function lengthFlag(winner, wonTasks) {
  if (!wonTasks.length) return { flag: false, ratio: null };
  const m = (sel) => wonTasks.reduce((a, t) => a + sel(t), 0) / wonTasks.length;
  const wl = m(t => t.winnerLen), ll = m(t => t.loserLen) || 1;
  const ratio = wl / ll;
  return { flag: ratio > 1.5, ratio };
}
