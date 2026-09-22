import test from 'node:test';
import assert from 'node:assert/strict';
import { saraHealth, saraCapabilities, saraState, saraAudit, saraRegenerate, saraTrace } from './SARAClient';

test('N04 exposes additive SARA health and governance operations', async () => {
  const originalFetch = globalThis.fetch;
  const oldUrl = process.env.SARA_BASE_URL;
  const oldToken = process.env.SARA_API_TOKEN;
  type Observed = { path: string; method: string; auth?: string; correlation?: string };
  let observed: Observed | null = null;
  const expectObserved = (): Observed => { assert.ok(observed); return observed; };

  process.env.SARA_BASE_URL = 'http://sara.test';
  delete process.env.SARA_API_TOKEN;

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    const path = new URL(url).pathname;
    observed = {
      path,
      method: String(init?.method ?? 'GET'),
      auth: (init?.headers as Record<string, string> | undefined)?.authorization,
      correlation: (init?.headers as Record<string, string> | undefined)?.['X-Correlation-ID'],
    };
    return new Response(JSON.stringify({ ok: true, path, correlation_id: observed.correlation }), {
      status: 200,
      headers: { 'content-type': 'application/json', 'X-Correlation-ID': observed.correlation ?? '' },
    });
  };

  try {
    const health = await saraHealth();
    assert.equal(health.ok, true);
    assert.equal(expectObserved().path, '/health');
    assert.equal(expectObserved().auth, undefined);

    process.env.SARA_API_TOKEN = 'token';
    await saraCapabilities();
    assert.equal(expectObserved().path, '/v1/capabilities');

    await saraState();
    assert.equal(expectObserved().path, '/v1/state');

    await saraAudit('auditar capacidade', 'n04-audit-001');
    assert.equal(expectObserved().path, '/v1/audit');
    assert.equal(expectObserved().method, 'POST');
    assert.equal(expectObserved().correlation, 'n04-audit-001');

    await saraRegenerate('regenerar sem apagar', 'n04-regenerate-001');
    assert.equal(expectObserved().path, '/v1/regenerate');

    await saraTrace('n04-cycle-001');
    assert.equal(expectObserved().path, '/v1/trace/n04-cycle-001');
  } finally {
    globalThis.fetch = originalFetch;
    if (oldUrl === undefined) delete process.env.SARA_BASE_URL;
    else process.env.SARA_BASE_URL = oldUrl;
    if (oldToken === undefined) delete process.env.SARA_API_TOKEN;
    else process.env.SARA_API_TOKEN = oldToken;
  }
});
