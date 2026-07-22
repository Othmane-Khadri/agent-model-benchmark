---
name: agent-model-benchmark
description: Benchmark two coding models on your OWN Claude Code skills and pick the cheaper-good-enough one. Use when the user says "benchmark Kimi vs Fable", "which model is better for my agent", "is Kimi K3 good enough", "compare claude-fable-5 and kimi-for-coding on my skills", "run the model benchmark", or "should I switch to the cheaper model". Runs both models headless via their own CLIs (no new API key), blind-judges the outputs with Opus, and reports quality, latency, real Fable cost, and an estimated Kimi cost per task. Read-only benchmark; never sends anything.
version: 1.0.0
---

# Agent Model Benchmark

Run Fable 5 (`claude-fable-5`) and Kimi K3 (`kimi-k3` / `kimi-for-coding`) on the same tasks, from your own skills, and see who wins on quality, speed, and cost.

## Quickstart
1. Read `SETUP.md` once to point Claude Code at Kimi.
2. From the kit: `node scripts/run.mjs` (add `--dry-run` to preview tasks, `--skills-dir <path>` to target a repo's skills).
3. Open `results.html` for the verdict.

## What it measures
Quality (blind Opus judge, 1 to 10 plus reason), latency (both real), cost (Fable measured, Kimi estimated and always labeled), outcome pass/fail on checkable tasks, and verbosity.

## Honesty rules
Kimi cost is an estimate from plan-credit pricing, never a measured number. Model ids and prices live in `config/`. No key value is ever printed.
