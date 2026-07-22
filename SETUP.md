# Connect Kimi to Claude Code

You need the `kimi` CLI installed and authenticated. Then pick one of three ways to use it.

## 1. Install and authenticate the Kimi CLI
Install the Kimi Code CLI and sign in with your Kimi Code membership (OAuth). Confirm it works:
```
kimi -p "say hello"
```
If that prints a reply, you are connected. This kit delegates to that same CLI, so no extra API key is needed.

## 2. Point Claude Code itself at Kimi (optional)
You can run Claude Code powered by Kimi by setting the endpoint and model:
```
export ANTHROPIC_BASE_URL=https://api.kimi.com/coding/v1
export ANTHROPIC_API_KEY=your_kimi_console_key   # name only, never commit the value
claude --model kimi-for-coding
```
Do a one time skip-login step the first time (steps in the official guide: https://www.kimi.com/code/docs/en/third-party-tools/other-coding-agents.html). Use this when you want to drive Claude Code on Kimi directly. Never reuse a membership or Kimi Code key inside a standalone script; it is restricted to the Kimi CLI, Claude Code, and Roo Code.

## 3. Let Claude Code delegate to Kimi (what this kit uses)
Claude Code does not know Kimi exists unless you tell it. Add a note to your `CLAUDE.md` so it can delegate a subtask to Kimi:
```
The `kimi` CLI is installed and authenticated. To get a second-model opinion or
delegate a subtask, shell out with: kimi -p "the task". Read and analysis tasks
run clean; file-mutation tasks need Kimi's own non-interactive approval flag.
```
Now `node scripts/run.mjs` can run both models on your tasks.

## Notes
- Model naming: it is Kimi K3 (`kimi-k3` on the platform, `kimi-for-coding` on the plan). Do not use the discontinued K2 line or invent a version number.
- The blind Opus judge uses `ANTHROPIC_API_KEY` if you have one with credits. If you do not (for example you only have a Claude subscription and the `claude` CLI), the judge automatically falls back to your authed `claude` CLI, so no new key is required. The key value is never printed or written to a report.
