#!/usr/bin/env node
// Mock `kimi -p <prompt>`
const args = process.argv.slice(2);
const prompt = args[args.indexOf('-p') + 1] || '';
process.stdout.write(`KIMI handled: ${prompt.slice(0, 40)}`);
