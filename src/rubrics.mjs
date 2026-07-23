// src/rubrics.mjs
// @ts-check
import { truncate } from './judge.mjs';

const A = (one, three, five) => ({ '1': one, '3': three, '5': five });
export const RUBRICS = {
  writing: { criteria: [
    { name: 'clarity', anchors: A('confusing/rambling', 'mostly clear', 'crisp and easy') },
    { name: 'relevance', anchors: A('off-task', 'partially on-task', 'fully answers the ask') },
    { name: 'voice', anchors: A('generic/robotic', 'acceptable tone', 'distinct, apt tone') }] },
  coding: { criteria: [
    { name: 'correctness', anchors: A('wrong/does not run', 'runs with bugs', 'correct & runs') },
    { name: 'completeness', anchors: A('misses requirements', 'covers the core', 'covers all requirements') },
    { name: 'quality', anchors: A('unreadable', 'workable', 'clean, idiomatic') }] },
  extraction: { criteria: [
    { name: 'accuracy', anchors: A('wrong values', 'some correct', 'all values correct') },
    { name: 'format', anchors: A('ignores format', 'close to asked format', 'exact format') },
    { name: 'noise', anchors: A('lots of extra text', 'minor extras', 'only the asked output') }] },
  reasoning: { criteria: [
    { name: 'validity', anchors: A('logically wrong', 'partly sound', 'fully sound') },
    { name: 'conclusion', anchors: A('wrong answer', 'partially right', 'correct answer') },
    { name: 'transparency', anchors: A('no steps', 'some steps', 'clear steps') }] },
  research: { criteria: [
    { name: 'coverage', anchors: A('misses key points', 'covers some', 'covers the landscape') },
    { name: 'accuracy', anchors: A('inaccurate', 'mostly accurate', 'accurate & specific') },
    { name: 'grounding', anchors: A('unsupported', 'some support', 'well-supported claims') }] },
  'tool-use': { criteria: [
    { name: 'selection', anchors: A('wrong tool/approach', 'workable approach', 'right tool/approach') },
    { name: 'execution', anchors: A('fails the task', 'partial', 'completes the task') },
    { name: 'efficiency', anchors: A('wasteful/looping', 'acceptable', 'direct and minimal') }] },
};
const GENERIC = { criteria: [
  { name: 'quality', anchors: A('poor', 'acceptable', 'excellent') },
  { name: 'relevance', anchors: A('off-task', 'partial', 'fully on-task') },
  { name: 'reliability', anchors: A('unusable', 'usable', 'dependable') }] };

export function rubricFor(category) { return RUBRICS[category] || GENERIC; }

export function anchoredJudgePrompt(task, outA, outB) {
  const r = rubricFor(task.category);
  const crit = r.criteria.map(c => `- ${c.name}: 1=${c.anchors['1']}; 3=${c.anchors['3']}; 5=${c.anchors['5']}`).join('\n');
  const shape = r.criteria.map(c => `"${c.name}":{"reason":"...","score":1-5}`).join(',');
  return `You are grading two answers to the same task. Length is NOT quality — do not reward verbosity.
TASK (${task.category}): ${task.prompt}
CRITERIA (score each 1-5 using these anchors):
${crit}
--- ANSWER A ---
${truncate(outA)}
--- ANSWER B ---
${truncate(outB)}
Give your reasoning BEFORE each score. Reply ONLY with JSON:
{"output_a":{"criteria":{${shape}},"overall":1-5},
 "output_b":{"criteria":{${shape}},"overall":1-5},
 "winner":"a"|"b"|"tie"}`;
}
