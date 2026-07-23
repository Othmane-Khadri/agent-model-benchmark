// src/stats.mjs
// @ts-check
export function mean(nums) { return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null; }

export function median(nums) { return percentile(nums, 50); }

/** Linear-interpolation percentile. @param {number[]} nums @param {number} p 0..100 */
export function percentile(nums, p) {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  if (s.length === 1) return s[0];
  const rank = (p / 100) * (s.length - 1);
  const lo = Math.floor(rank), hi = Math.ceil(rank);
  if (lo === hi) return s[lo];
  return s[lo] + (rank - lo) * (s[hi] - s[lo]);
}
