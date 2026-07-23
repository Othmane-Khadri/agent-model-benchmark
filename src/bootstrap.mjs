// src/bootstrap.mjs
// @ts-check
import { makeRng } from './rng.mjs';

function bootMean(sample, { resamples, seed, ci }) {
  const rnd = makeRng(seed);
  const n = sample.length;
  const point = n ? sample.reduce((a, b) => a + b, 0) / n : null;
  if (!n) return { point, lo: null, hi: null };
  const means = new Array(resamples);
  for (let r = 0; r < resamples; r++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += sample[(rnd() * n) | 0];
    means[r] = s / n;
  }
  means.sort((a, b) => a - b);
  const lopct = (1 - ci) / 2, hipct = 1 - lopct;
  // nearest-rank integer index — intentionally different from stats.mjs linear-interp percentile
  const at = (p) => means[Math.min(resamples - 1, Math.max(0, Math.floor(p * (resamples - 1))))];
  return { point, lo: at(lopct), hi: at(hipct) };
}

export function pairedBootstrapCI(deltas, { resamples = 10000, seed = 1234, ci = 0.95 } = {}) {
  return bootMean(deltas, { resamples, seed, ci });
}
export function winRateCI(perTaskWin, { resamples = 10000, seed = 1234, ci = 0.95 } = {}) {
  return bootMean(perTaskWin, { resamples, seed, ci });
}
export function ciExcludes(ci, value) {
  if (ci.lo == null || ci.hi == null) return false;
  return value < ci.lo || value > ci.hi;
}
