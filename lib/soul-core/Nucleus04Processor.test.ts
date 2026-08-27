import assert from 'node:assert/strict';
import test from 'node:test';
import { Nucleus04Processor } from './Nucleus04Processor';
import { NUCLEUS_04_CAPABILITIES } from './Nucleus04Capabilities';
import { createNucleus04MeshHandlers } from './Nucleus04MeshRuntime';

test('Nucleus 04 exposes executable core capabilities', () => {
  const processor = new Nucleus04Processor();
  assert.equal(processor.supports('ai-pilot'), true);
  assert.equal(processor.supports('tool-execution'), true);
  assert.equal(processor.supports('mesh-communication'), true);
  assert.equal(processor.supports('not-a-capability'), false);
});

test('Nucleus 04 binds every advertised capability to a runtime handler', () => {
  const handlers = createNucleus04MeshHandlers();
  for (const capability of NUCLEUS_04_CAPABILITIES) {
    assert.equal(typeof handlers[capability], 'function', `missing handler: ${capability}`);
  }
});

test('Nucleus 04 executes a registered capability handler', async () => {
  const processor = new Nucleus04Processor();
  processor.registerHandler('tool-execution', async (input) => ({ ok: true, input }));

  await assert.doesNotReject(async () => {
    const result = await processor.execute({
      capability: 'tool-execution',
      input: { tool: 'getWeather' },
      requestId: 'tool-test',
    });
    assert.deepEqual(result, { ok: true, input: { tool: 'getWeather' } });
  });
});

test('Nucleus 04 executes the connected AI pilot without coupling to a provider', async () => {
  const processor = new Nucleus04Processor();
  processor.registerPilot({
    id: 'test-pilot',
    execute: async (input) => ({ pilot: 'test-pilot', input }),
  });

  const result = await processor.execute({ capability: 'ai-pilot', input: { text: 'test' } });
  assert.deepEqual(result, { pilot: 'test-pilot', input: { text: 'test' } });
});

test('Nucleus 04 rejects an unsupported capability', async () => {
  const processor = new Nucleus04Processor();
  await assert.rejects(
    processor.execute({ capability: 'not-a-capability' as never, input: null }),
    /Unsupported Nucleus 04 capability/,
  );
});
