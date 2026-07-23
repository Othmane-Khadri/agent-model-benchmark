// src/check.mjs
// @ts-check
/** @param {{type:string,value?:string}} check @param {string} output @returns {"pass"|"fail"} */
export function evaluateCheck(check, output) {
  const text = output ?? '';
  switch (check?.type) {
    case 'none': return text.trim().length > 0 ? 'pass' : 'fail';
    case 'contains': return text.includes(check.value ?? '') ? 'pass' : 'fail';
    case 'regex': try { return new RegExp(check.value ?? '').test(text) ? 'pass' : 'fail'; } catch { return 'fail'; }
    default: return 'fail';
  }
}
