# Kimi K3 vs Fable 5 Benchmark

Is the cheap model good enough for *your* work? This kit runs Fable 5 and Kimi K3 on your own Claude Code skills and scores them head to head. No new API key beyond what you already use.

## Why
Leaderboards do not tell you which model is better for the agent you actually run. Kimi K3 is roughly a third of Fable 5's price, so the honest question is whether the cheaper one is good enough for your tasks. This answers it with your skills, not a generic benchmark.

## Models
- Fable 5 = `claude-fable-5` (run via the `claude` CLI, real cost read from the CLI).
- Kimi K3 = `kimi-k3` on the platform, `kimi-for-coding` on the Kimi Code membership plan (run via the `kimi` CLI). Kimi cost is **estimated** from plan-credit pricing and always labeled as such.

## Install
```
npm install        # only a TypeScript devDep, for typecheck
```

## Run
```
node scripts/run.mjs --dry-run          # preview the tasks, no calls
node scripts/run.mjs                     # benchmark ./.claude/skills, or the starter suite if empty
node scripts/run.mjs --skills-dir path   # target another repo's skills
```
Open the generated `results.html`.

## Setup Kimi
See `SETUP.md` for the three ways to give Claude Code access to Kimi.

## The judge, and "no new key"
Scoring uses a blind Opus judge. It uses `ANTHROPIC_API_KEY` if you have one with credits; otherwise it falls back to your already-authed `claude` CLI, so a Claude subscription is enough and no new key is required.

## Metrics
| Metric | Fable 5 | Kimi K3 |
|---|---|---|
| Quality | blind Opus judge | blind Opus judge |
| Latency | measured | measured |
| Cost | measured | estimated |
| Outcome | pass/fail | pass/fail |
| Verbosity | measured | measured |

Everything is configurable in `config/metrics.json`, `config/models.json`, `config/pricing.json`.

## Sample report
A real run's output lives in [`examples/sample-results.html`](examples/sample-results.html) so you can see the verdict format before spending anything.

---
Built at [Yalc](https://yalc.ai), GTM AI agents that run your outbound from Claude Code.
