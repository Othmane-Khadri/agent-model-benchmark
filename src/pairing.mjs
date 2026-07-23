// src/pairing.mjs
// @ts-check
export function pairTrials(fableTrials, kimiTrials) {
  const n = Math.min(fableTrials.length, kimiTrials.length);
  const out = [];
  for (let i = 0; i < n; i++) out.push({ index: i, fable: fableTrials[i], kimi: kimiTrials[i] });
  return out;
}

export function pairAutoVerdict(fable, kimi) {
  const fe = fable.outcome === 'error', ke = kimi.outcome === 'error';
  if (fe && ke) return { winner: 'tie', reason: 'both-errored' };
  if (fe) return { winner: kimi.model, reason: 'opponent-errored' };
  if (ke) return { winner: fable.model, reason: 'opponent-errored' };
  return null;
}
