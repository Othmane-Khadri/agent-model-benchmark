---
name: agent-model-benchmark
description: Benchmark two agent models (claude-fable-5 vs kimi-k3) on your own tasks with 2026-valid methodology — trials, dual-order + dual-family judging, errors-as-failures, bootstrap CIs, honest TIE — and emit a model-routing.json + paste-ready CLAUDE.md snippet that routes each task category to the right model. Use when the user says "benchmark the models", "which model for which task", "fable vs kimi", "should I route X to kimi", or "re-run the model benchmark".
---

# agent-model-benchmark v2

Honest mode (default): `node scripts/run.mjs --trials 3 --judges dual`
Smoke test (not a verdict): `node scripts/run.mjs --trials 1 --judges single`
Preview cost: `node scripts/run.mjs --dry-run`

Outputs land in `runs/<run-id>/`: `results.json` (schema 2), `results.html`, `model-routing.json`, `routing-snippet.md`, and per-task transcripts.

Paste `routing-snippet.md` into a CLAUDE.md to make an agent route by category. Re-benchmark monthly.

See README.md for the methodology and SETUP.md for prerequisites.
