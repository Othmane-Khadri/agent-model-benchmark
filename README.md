# agent-model-benchmark v2

Benchmark two agent models — the default `claude-fable-5` against the challenger `kimi-k3` — on your own tasks, and turn the result into live per-category model routing. The whole thing runs locally, spawns the `claude` and `kimi` CLIs you already have, and produces a verdict that survives 2026 benchmarking standards instead of a single-run vibe check.

## Quick start

```bash
npm install
node scripts/run.mjs --trials 3 --judges dual          # honest mode (default)
node scripts/run.mjs --trials 1 --judges single         # smoke test — NOT a verdict
node scripts/run.mjs --dry-run                          # preview run + judge-call counts, spawns nothing
```

Every run writes to `runs/<run-id>/`:

- `results.json` — the full machine-readable result (schema 2)
- `results.html` — a human-readable table + headline
- `model-routing.json` — the routing decision per task category
- `routing-snippet.md` — a paste-ready CLAUDE.md block
- `<task-id>.trials.json` — the raw per-trial transcripts

`<run-id>` is `YYYYMMDD-HHMMSS-<seed>`.

## Flags

| Flag | Default | Meaning |
|---|---|---|
| `--trials N` | `3` | How many times each model runs each task. Reliability (pass@k / pass^k) needs N>1. |
| `--judges dual\|single` | `dual` | `dual` = Claude + Kimi judge panel (cross-family, the honest default). `single` = Claude judge only; documented as a smoke test, never a verdict, and it can never emit a confident routing rule. |
| `--dry-run` | off | Print the planned model-run count and an upper bound on judge calls, then exit. Spawns nothing, writes nothing. |
| `--seed N` | `1234` | Seeds task order and all bootstrap resampling. Same seed → identical numbers. |
| `--tasks PATH` | `config/tasks/p1-smoke.json` | The task set. `config/tasks/sample.json` spans all six categories. |
| `--out DIR` | `runs` | Where run directories are written. |
| `--models PATH` | `config/models.json` | Model id → CLI binary + args mapping. |
| `--prices PATH` | `config/prices.json` | Per-model $/Mtok + cost basis. |

Default mode is the honest mode: `--trials 3 --judges dual`. `--trials 1 --judges single` is a smoke test, not a verdict.

## Methodology (what makes the verdict trustworthy)

1. **Dual-order judging.** Every pair is judged twice with the two answers swapped (A=fable then A=kimi). A win only stands if both orders agree; a flip becomes a tie. This cancels position bias.
2. **Dual-family judging.** In `dual` mode both a Claude judge and a Kimi judge score every pair. A decisive win requires *every* family to name the *same* winner and be position-consistent; any disagreement is an honest tie. This cancels same-family favoritism.
3. **Trials.** Each model runs each task `--trials` times. We report `pass@k` (any trial passed — best-of-k reliability) and `pass^k` (every trial passed — tau-bench style, the harsher bar).
4. **Errors are failures.** The trial outcome enum is exactly `pass | fail | error`. An `error` (empty output, non-zero exit) counts as a failed trial in pass@k, pass^k, and the win math. A pair is only *excluded* from judging for a provable harness-side failure (e.g. the judge itself is unreachable), and every exclusion is logged with its reason.
5. **Routing artifact.** Tasks are grouped by category; each category gets a routing rule gated behind three independent checks (see below). A category that fails any gate routes to the default with `confidence: "insufficient-evidence"` — an explicit unknown beats a noisy rule.
6. **Paired bootstrap CI + honest TIE.** The per-task quality delta is bootstrapped (seeded, deterministic) into a 95% confidence interval. If that interval crosses zero the headline prints `TIE — no statistically meaningful winner`, never a fake winner.
7. **Anchored per-category rubrics.** Judges score against G-Eval-style rubrics with 3–4 named criteria per category, each anchored at 1/3/5, and are told to give reasoning *before* scores and that length is not quality.
8. **Length-bias control.** If the run-level winner's outputs are more than 1.5× longer than the loser's on the tasks it won, the run raises a `length_flag` so a verbosity artifact can't masquerade as quality.
9. **Latency + cost + transcripts.** Per model we report latency median and p95, and a cost-per-solved-task figure computed from `config/prices.json` and per-trial token counts. Raw transcripts are saved per task.

### Emission gates (routing to the challenger)

A category routes to `kimi-k3` with `confidence: "high"` only when **all three** gates pass, independently:

- **g1** — the win-rate CI excludes 0.5 *and* kimi is favored (win rate for the default < 0.5).
- **g2** — kimi's `pass^k` is at least as good as the default's.
- **g3** — *both* judge families favor kimi.

A symmetric set of gates routes a clearly-default-winning category to `claude-fable-5` with high confidence. Anything else → default, `insufficient-evidence`. Because g3 requires both families, a `--judges single` run can never clear it — single-family runs are a smoke test and must not emit a confident routing rule.

## `results.json` (schema 2) fields

Top level:

- `schema` — always `2`.
- `run_id`, `seed`, `trials`, `judges_mode` — the run parameters.
- `default_model` (`claude-fable-5`), `challenger` (`kimi-k3`).
- `duration_ms` — wall-clock time.
- `headline` — the honest one-line verdict (winner-with-CI or `TIE`).
- `win_rate` — mean per-task win share for the default (fable=1, tie=0.5, kimi=0).
- `win_rate_ci`, `quality_delta_ci` — `{point, lo, hi}` bootstrap intervals.
- `agreement_rate` — fraction of decisive pairs where the judge families agreed.
- `length_flag` — `{flag, ratio}` length-bias signal for the winner.
- `length_by_model` — mean output length (chars) per model.
- `latency` — per model `{median, p95}` in ms.
- `cost` — per model `{total_usd, solved_tasks, cost_per_solved_usd, estimated}`. **Kimi is always `estimated: true`.**
- `cost_basis` — `{as_of, sources}` naming each price's source and whether it is estimated.
- `routing` — the same object written to `model-routing.json`.
- `tasks` — a compact per-task view for the HTML report.
- `tasks_full` — the full per-task structure: trials, verdicts, pass@k / pass^k / error_rate per model, flip_rate, avg_length, latency_median_ms.

## Hard rules

- **No secrets, ever.** API keys, tokens, and auth headers are masked on sight and never land in stdout, `results.json`, transcripts, or HTML.
- **Kimi cost is always labeled `estimated`** — in `results.json`, `cost_basis`, the routing JSON, and the HTML. Kimi bills through a membership plan with no per-token invoice, so its dollar figure is an estimate from output length, not a real charge.
- **Models and prices live in `config/`** — never hardcoded in `src/` or `scripts/`.
- **Never emit a confident routing rule that fails a gate.** Fail-loud, then fall back to the default with `insufficient-evidence`.
- **Never declare a winner whose quality-delta CI crosses zero** — print `TIE`.
- **Fail loud on empty CLI output** — a model process that returns empty stdout on a zero exit is an `error` trial.

## Sample

### A real run (Kimi K3 vs Claude Fable 5, 11 tasks, dual judges)

`examples/real-run-results.html` / `.json` is the output of an actual run against the live `claude` and `kimi` CLIs: 11 tasks (5 real Claude Code skills + 6 coding/reasoning probes), 3 trials each, judged by both Opus and K3 in both orders. `examples/real-run-model-routing.json` and `real-run-routing-snippet.md` are the routing policy it emitted.

What it found, and why it is worth reading before you trust any single-judge benchmark:

- **Correctness parity.** On all 5 tasks with objective checks (regex, strict JSON, merge-intervals, bug-fix, train-reasoning), both models passed every trial (`pass^k = 1`).
- **The two judge families agreed only 48% of the time.** A Claude judge and a Kimi judge disagree on the winner more than half the time. Any single-judge benchmark is coin-flipping half its verdicts.
- **Position bias was severe** — on some tasks the verdict flipped 100% of the time when the answer order was swapped. Single-order judging would have declared confident winners on pure slot noise.
- **Fable 5 has a real but modest quality edge** (win rate 71%, 95% CI excludes a tie, and it is *not* a length artifact), but **no single task had a clean consensus winner** once both families had to agree across both orders.
- **The routing policy routed nothing to Kimi** — every category came back `insufficient-evidence`. An explicit "not enough evidence to switch" beats a confident-but-noisy rule.

### Shape demo (no API calls)

`examples/sample-results.json` / `.html` is a reproducible snapshot from the bundled deterministic mock CLIs using `config/tasks/sample.json` — a **shape demo, not a performance claim**, so you can see the exact output format without running anything.
