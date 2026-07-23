// src/judge-parse.mjs
// @ts-check
/** Parse a judge reply that should be a single JSON object, tolerating
 * surrounding prose. Tries whole-string parse first, then the first-brace
 * to last-brace slice. Returns the parsed object or null. */
export function extractJudgeJson(text) {
  const s = String(text ?? '').trim();
  if (!s) return null;
  try { return JSON.parse(s); } catch {}
  const first = s.indexOf('{'), last = s.lastIndexOf('}');
  if (first === -1 || last <= first) return null;
  try { return JSON.parse(s.slice(first, last + 1)); } catch { return null; }
}
