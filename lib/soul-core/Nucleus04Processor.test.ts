import assert from 'node:assert/strict';
import test from 'node:test';
import { NUCLEUS_04_CAPABILITIES } from './Nucleus04Capabilities';
import { Nucleus04Processor } from './Nucleus04Processor';

test('Nucleus 04 exposes the complete declared capability surface', () => {
  const processor = new Nucleus04Processor();
  assert.equal(NUCLEUS_04_CAPABILITIES.length, 15);
  for (const capability of NUCLEUS_04_CAPABILITIES) {
    assert.equal(processor.supports(capability), true);
  }
  assert.equal(processor.supports('not-a-capability'), false);
});

test('Nucleus 04 reports capability registration gaps instead of hiding them', () => {
  const processor = new Nucleus04Processor();
  assert.equal(processor.missingCapabilities().length, 15);
  processor.registerHandler('tool-execution', async (input) => ({ ok: true, input }));
  assert.equal(processor.missingCapabilities().includes('tool-execution'), false);
});

test('Nucleus 04 executes a registered capability handler', async () => {
  const processor = new Nucleus04Processor();
  processor.registerHandler('tool-execution', async (input) => ({ ok: true, input }));

  const result = await processor.execute({
    capability: 'tool-execution',
    input: { tool: 'getWeather' },
    requestId: 'tool-test',
  });
  assert.deepEqual(result, { ok: true, input: { tool: 'getWeather' } });
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
