import { afterEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { describeBrowserUseAdapter, runBrowserUse } from './BrowserUseAdapter';

const original = { ...process.env };

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in original)) delete process.env[key];
  }
  Object.assign(process.env, original);
});

describe('Browser Use adapter boundary', () => {
  test('disabled remains DEGRADED', async () => {
    delete process.env.SOUL_N04_BROWSER_USE_ENABLED;
    const state = describeBrowserUseAdapter();
    assert.equal(state.state, 'DEGRADED');
    assert.equal(state.code, 'BROWSER_USE_ADAPTER_DISABLED');

    const result = await runBrowserUse({ task: 'Open example.com' });
    assert.equal(result.state, 'DEGRADED');
    assert.equal(result.code, 'BROWSER_USE_ADAPTER_DISABLED');
  });

  test('missing source remains DEGRADED', () => {
    process.env.SOUL_N04_BROWSER_USE_ENABLED = 'true';
    process.env.SOUL_N04_BROWSER_USE_ROOT = '/definitely/missing/browser-use';
    process.env.OPENAI_API_KEY = 'test';
    const state = describeBrowserUseAdapter();
    assert.equal(state.state, 'DEGRADED');
    assert.equal(state.code, 'BROWSER_USE_SOURCE_NOT_AVAILABLE');
  });

  test('configured source does not become PASS before a real browser transaction', () => {
    process.env.SOUL_N04_BROWSER_USE_ENABLED = 'true';
    process.env.SOUL_N04_BROWSER_USE_ROOT = process.cwd();
    process.env.OPENAI_API_KEY = 'test';
    const state = describeBrowserUseAdapter();
    assert.equal(state.state, 'DEGRADED');
    assert.equal(state.code, 'BROWSER_USE_EXECUTION_NOT_YET_PROVEN');
  });
});
