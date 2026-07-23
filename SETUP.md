# Setup

## Prerequisites

- **Node ≥18.** The dev box runs Node 25; anything from 18 up works. Check with `node --version`.
- **The `claude` CLI, authenticated.** This is the runner for `claude-fable-5` and the Claude judge. Confirm it works non-interactively:
  ```bash
  claude -p "say OK"
  ```
  You should get a short reply on a zero exit. If it errors or prints nothing, log in / re-auth the Claude CLI first.
- **The `kimi` CLI, authenticated.** This is the runner for `kimi-k3` and the Kimi judge. Confirm:
  ```bash
  kimi -p "say OK"
  ```
  Same expectation — a short reply, zero exit.

## Install

```bash
npm install
```

Only dev dependency is TypeScript (for `npm run typecheck`). The runtime has zero dependencies.

## Verify

```bash
npm test          # runs the whole node:test suite
npm run typecheck # tsc --noEmit over src/, scripts/, test/
```

The **unit** and **automation** tests run against deterministic mock CLIs, cost nothing, and must always pass. The **integration** tests (`test/integration-*.test.mjs`) spawn the *real* `claude` / `kimi` CLIs; they **auto-skip** (they do not fail) when either CLI is missing or unauthenticated. A skipped integration test is a normal, acceptable outcome on an un-authed box — a green or skipped result both clear the gate.

> Note: on Node 25, `node --test <dir>/` directory discovery can misbehave; if `npm test` looks off, run `node --test 'test/*.test.mjs'` explicitly. The mock-driven automation tests are the source of truth and are fully deterministic.

## First run

```bash
node scripts/run.mjs --dry-run                 # preview: model-run + judge-call counts, spawns nothing
node scripts/run.mjs --trials 3 --judges dual  # the real honest-mode run
```

Open `runs/<run-id>/results.html` for the verdict, and paste `runs/<run-id>/routing-snippet.md` into a CLAUDE.md to route by category.

## Cost note

Fable's cost is computed from real token counts returned by the Claude CLI and published Anthropic pricing. **Kimi's cost is always an estimate** — it bills through a membership plan with no per-token invoice, so its dollar figure is derived from output length and is labeled `estimated` everywhere it appears. Treat it as directional, not an invoice.
