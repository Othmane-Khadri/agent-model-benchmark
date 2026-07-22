#!/usr/bin/env node
// Mock `claude -p <prompt> --model .. --output-format json`
const args = process.argv.slice(2);
const prompt = args[args.indexOf('-p') + 1] || '';
process.stdout.write(JSON.stringify({
  result: `FABLE handled: ${prompt.slice(0, 40)}`,
  total_cost_usd: 0, duration_ms: 12, usage: { input_tokens: 5, output_tokens: 8 },
}));
