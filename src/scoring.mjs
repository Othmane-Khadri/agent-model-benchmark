// src/scoring.mjs
// @ts-check
export function passAtK(outcomes) { return outcomes.some(o => o === 'pass') ? 1 : 0; }
export function passHatK(outcomes) { return outcomes.length > 0 && outcomes.every(o => o === 'pass') ? 1 : 0; }
export function errorRate(outcomes) { return outcomes.length ? outcomes.filter(o => o === 'error').length / outcomes.length : 0; }
export function aggregateRate(vals) { return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null; }
