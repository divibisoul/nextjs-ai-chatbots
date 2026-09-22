import test from 'node:test';
import assert from 'node:assert/strict';
import { CollaborationSessionRunner } from './CollaborationSessionRunner';

const originalFetch = globalThis.fetch;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('research unavailable is skipped and real SARA stages continue', async () => {
  process.env.SARA_BASE_URL = 'http://sara.test';
  process.env.SARA_API_TOKEN = 'token';
  const calls: string[] = [];

  globalThis.fetch = async (input, init) => {
    const path = new URL(String(input)).pathname;
    calls.push(path);
    const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
    assert.equal((body.context as Record<string, unknown>)?.client, 'collaboration');
    return new Response(JSON.stringify(
      path === '/v1/audit'
        ? { operation: 'audit', count: 0 }
        : {
          cycle_id: 's-001:cycle',
          final_state: 'validated',
          converged: true,
          rollback_performed: false,
          execution_report: {},
          trace_hash: 'trace-real',
        },
    ), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'X-Correlation-ID': String((init?.headers as Record<string, string>)?.['X-Correlation-ID'] ?? ''),
      },
    });
  };

  const runner = new CollaborationSessionRunner();
  const report = await runner.run({
    input: 'preservar o contexto existente',
    sessionId: 's-001',
    researchQuery: 'pesquisa opcional',
  });

  assert.equal(report.status, 'completed');
  assert.equal(calls.join(','), '/v1/audit,/v1/cycle');
  assert.equal(report.stages.find((s) => s.stage === 'RESEARCH')?.state, 'skipped');
  assert.equal(report.final_response?.trace_hash, 'trace-real');
});

test('search adapter supplies snippets as evidence context, never as fabricated final output', async () => {
  process.env.SARA_BASE_URL = 'http://sara.test';
  process.env.SARA_API_TOKEN = 'token';
  let cycleBody: Record<string, unknown> = {};

  globalThis.fetch = async (input, init) => {
    const path = new URL(String(input)).pathname;
    if (path === '/v1/cycle') {
      cycleBody = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
    }
    return new Response(JSON.stringify(
      path === '/v1/audit'
        ? { operation: 'audit', count: 0 }
        : {
          cycle_id: 's-002:cycle',
          final_state: 'sara-result',
          converged: true,
          rollback_performed: false,
          execution_report: {},
          trace_hash: 'trace-002',
        },
    ), {
      status: 200,
      headers: { 'content-type': 'application/json', 'X-Correlation-ID': 's-002:cycle' },
    });
  };

  const runner = new CollaborationSessionRunner({
    searchAdapter: { search: async () => ['evidence A', 'evidence B'] },
  });
  const report = await runner.run({
    input: 'avaliar hipótese',
    sessionId: 's-002',
    researchQuery: 'hipótese',
  });

  const context = cycleBody.context as Record<string, unknown>;
  assert.deepEqual(context?.research_snippets, ['evidence A', 'evidence B']);
  assert.equal(report.final_response?.final_state, 'sara-result');
  assert.notEqual(report.final_response?.final_state, 'evidence A');
});

test('validation failure does not fabricate an execute result', async () => {
  process.env.SARA_BASE_URL = 'http://sara.test';
  process.env.SARA_API_TOKEN = 'token';
  let cycleCalled = false;

  globalThis.fetch = async (input) => {
    const path = new URL(String(input)).pathname;
    if (path === '/v1/cycle') cycleCalled = true;
    return new Response(JSON.stringify({ error: { code: 'ETR_REJECTED', message: 'blocked' } }), {
      status: 422,
      headers: { 'content-type': 'application/json', 'X-Correlation-ID': 's-003:cycle' },
    });
  };

  const runner = new CollaborationSessionRunner();
  const report = await runner.run({ input: 'solicitação bloqueada', sessionId: 's-003' });

  assert.equal(report.status, 'error');
  assert.equal(cycleCalled, false);
  assert.equal(report.final_response, undefined);
  assert.equal(report.stages.find((s) => s.stage === 'VALIDATE')?.state, 'error');
  assert.equal(report.stages.find((s) => s.stage === 'REPORT')?.state, 'completed');
});