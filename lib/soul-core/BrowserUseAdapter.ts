import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

export const BROWSER_USE_CAPABILITY = 'browser.automation.browser-use@1.0.0' as const;
export const BROWSER_USE_REVISION = '302d8fcb245a7a63fb7531a4734c9ce3c7792779' as const;
export type BrowserUseState = 'PASS' | 'FAIL' | 'DEGRADED';

export interface BrowserUseRequest {
  task: string;
  allowedDomains?: string[];
  prohibitedDomains?: string[];
  maxSteps?: number;
  useVision?: boolean;
}

export interface BrowserUseEvidence {
  state: BrowserUseState;
  code?: string;
  provider: 'browser-use';
  revision: typeof BROWSER_USE_REVISION;
  root: string;
  python: string;
  enabled: boolean;
  sourcePresent: boolean;
  llmProvider: string;
  model: string;
  credentialsPresent: boolean;
}

function env(name: string, fallback = '') {
  return (process.env[name] ?? fallback).trim();
}

function enabled() {
  return /^(1|true|yes)$/i.test(env('SOUL_N04_BROWSER_USE_ENABLED'));
}

function config() {
  const provider = env('SOUL_N04_BROWSER_USE_LLM_PROVIDER', 'openai').toLowerCase();
  const model = env(
    'SOUL_N04_BROWSER_USE_LLM_MODEL',
    provider === 'google' ? 'gemini-3-flash-preview'
      : provider === 'browser-use' ? 'bu-2-0'
      : provider === 'ollama' ? 'llama3.1:8b'
      : 'gpt-5.6-luna',
  );
  const credentialsPresent =
    provider === 'ollama' ||
    (provider === 'openai' && Boolean(env('OPENAI_API_KEY'))) ||
    (provider === 'google' && Boolean(env('GOOGLE_API_KEY'))) ||
    (provider === 'browser-use' && Boolean(env('BROWSER_USE_API_KEY')));
  return {
    python: env('SOUL_N04_BROWSER_USE_PYTHON', 'python3'),
    root: path.resolve(env('SOUL_N04_BROWSER_USE_ROOT', 'integrations/soul-upstream/browser-use')),
    provider,
    model,
    credentialsPresent,
    timeoutMs: Math.max(10_000, Number.parseInt(env('SOUL_N04_BROWSER_USE_TIMEOUT_MS', '180000'), 10) || 180_000),
    maxSteps: Math.min(100, Math.max(1, Number.parseInt(env('SOUL_N04_BROWSER_USE_MAX_STEPS', '20'), 10) || 20)),
  };
}

export function describeBrowserUseAdapter(): BrowserUseEvidence {
  const c = config();
  const sourcePresent = fs.existsSync(c.root) && fs.statSync(c.root).isDirectory();
  if (!enabled()) {
    return {
      state: 'DEGRADED',
      code: 'BROWSER_USE_ADAPTER_DISABLED',
      provider: 'browser-use',
      revision: BROWSER_USE_REVISION,
      root: c.root,
      python: c.python,
      enabled: false,
      sourcePresent,
      llmProvider: c.provider,
      model: c.model,
      credentialsPresent: c.credentialsPresent,
    };
  }
  if (!sourcePresent) {
    return {
      state: 'DEGRADED',
      code: 'BROWSER_USE_SOURCE_NOT_AVAILABLE',
      provider: 'browser-use',
      revision: BROWSER_USE_REVISION,
      root: c.root,
      python: c.python,
      enabled: true,
      sourcePresent: false,
      llmProvider: c.provider,
      model: c.model,
      credentialsPresent: c.credentialsPresent,
    };
  }
  if (!['openai', 'google', 'browser-use', 'ollama'].includes(c.provider)) {
    return {
      state: 'FAIL',
      code: 'BROWSER_USE_LLM_PROVIDER_UNSUPPORTED',
      provider: 'browser-use',
      revision: BROWSER_USE_REVISION,
      root: c.root,
      python: c.python,
      enabled: true,
      sourcePresent: true,
      llmProvider: c.provider,
      model: c.model,
      credentialsPresent: false,
    };
  }
  if (!c.credentialsPresent) {
    return {
      state: 'DEGRADED',
      code: 'BROWSER_USE_LLM_CREDENTIALS_NOT_AVAILABLE',
      provider: 'browser-use',
      revision: BROWSER_USE_REVISION,
      root: c.root,
      python: c.python,
      enabled: true,
      sourcePresent: true,
      llmProvider: c.provider,
      model: c.model,
      credentialsPresent: false,
    };
  }
  return {
    state: 'DEGRADED',
    code: 'BROWSER_USE_EXECUTION_NOT_YET_PROVEN',
    provider: 'browser-use',
    revision: BROWSER_USE_REVISION,
    root: c.root,
    python: c.python,
    enabled: true,
    sourcePresent: true,
    llmProvider: c.provider,
    model: c.model,
    credentialsPresent: true,
  };
}

export async function runBrowserUse(request: BrowserUseRequest): Promise<Record<string, unknown>> {
  const evidence = describeBrowserUseAdapter();
  if (!evidence.enabled || !evidence.sourcePresent || !evidence.credentialsPresent) {
    return { ...evidence, capability: BROWSER_USE_CAPABILITY };
  }

  const task = request.task.trim();
  if (!task) return { ...evidence, state: 'FAIL', code: 'BROWSER_USE_TASK_REQUIRED', capability: BROWSER_USE_CAPABILITY };

  const c = config();
  const payload = JSON.stringify({
    root: c.root,
    provider: c.provider,
    model: c.model,
    task,
    allowedDomains: request.allowedDomains ?? [],
    prohibitedDomains: request.prohibitedDomains ?? [],
    maxSteps: request.maxSteps ?? c.maxSteps,
    useVision: request.useVision ?? false,
  });

  const runner = path.resolve('scripts/browser_use_runner.py');
  const child = spawn(c.python, [runner], { cwd: process.cwd(), stdio: ['pipe', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', chunk => { stdout += chunk; });
  child.stderr.on('data', chunk => { stderr += chunk; });

  const result = await new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('BROWSER_USE_TIMEOUT'));
    }, c.timeoutMs);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', (code, signal) => { clearTimeout(timer); resolve({ code, signal }); });
    child.stdin.end(payload);
  }).catch(error => ({ code: null, signal: null, error }));

  if ('error' in result && result.error) {
    const message = result.error instanceof Error ? result.error.message : String(result.error);
    return {
      state: message === 'BROWSER_USE_TIMEOUT' ? 'FAIL' : 'DEGRADED',
      code: message === 'BROWSER_USE_TIMEOUT' ? 'BROWSER_USE_TIMEOUT' : 'BROWSER_USE_PROCESS_UNAVAILABLE',
      detail: message,
      stderr: stderr.slice(-4000),
      capability: BROWSER_USE_CAPABILITY,
      ...evidence,
    };
  }

  if (result.code !== 0) {
    return {
      state: 'FAIL',
      code: 'BROWSER_USE_PROCESS_FAILED',
      exitCode: result.code,
      signal: result.signal,
      stderr: stderr.slice(-4000),
      capability: BROWSER_USE_CAPABILITY,
      ...evidence,
    };
  }

  try {
    const output = JSON.parse(stdout.trim()) as Record<string, unknown>;
    return { ...output, capability: BROWSER_USE_CAPABILITY, providerRevision: BROWSER_USE_REVISION };
  } catch {
    return {
      state: 'FAIL',
      code: 'BROWSER_USE_INVALID_RUNNER_OUTPUT',
      stdout: stdout.slice(-4000),
      stderr: stderr.slice(-4000),
      capability: BROWSER_USE_CAPABILITY,
      ...evidence,
    };
  }
}
