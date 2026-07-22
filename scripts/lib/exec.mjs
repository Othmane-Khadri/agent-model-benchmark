import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { delimiter } from 'node:path';

// A non-interactive/background child does not load the user's shell profile, so
// agent CLIs installed outside the default PATH (notably the kimi CLI at
// ~/.kimi-code/bin) are invisible and spawn fails silently. Prepend the standard
// install locations so a bare `kimi` / `claude` resolves for us and for cloners.
export function augmentedPath(env = process.env) {
  const home = homedir();
  const known = [
    `${home}/.kimi-code/bin`,   // kimi CLI default install (code.kimi.com/install.sh)
    '/opt/homebrew/bin', '/usr/local/bin',
    `${home}/.local/bin`, `${home}/bin`,
  ];
  const current = (env.PATH || '').split(delimiter).filter(Boolean);
  const merged = [...current];
  for (const dir of known) if (!merged.includes(dir)) merged.push(dir);
  return merged.join(delimiter);
}

export function execCapture(command, args = [], opts = /** @type {{env?: Record<string,string>, cwd?: string, timeoutMs?: number, input?: string}} */ ({})) {
  return new Promise((resolveP) => {
    const start = process.hrtime.bigint();
    const mergedEnv = { ...process.env, ...(opts.env || {}) };
    const child = spawn(command, args, {
      env: { ...mergedEnv, PATH: augmentedPath(mergedEnv) },
      cwd: opts.cwd,
    });
    let stdout = '', stderr = '';
    let timer = null;
    if (opts.timeoutMs) timer = setTimeout(() => child.kill('SIGKILL'), opts.timeoutMs);
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    if (opts.input != null) { child.stdin.write(opts.input); child.stdin.end(); }
    const finish = (code) => {
      if (timer) clearTimeout(timer);
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      resolveP({ stdout, stderr, code: code ?? -1, durationMs });
    };
    child.on('close', (code) => finish(code));
    child.on('error', (err) => { stderr += String(err?.message || err); finish(-1); });
  });
}
