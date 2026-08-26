import assert from 'node:assert/strict';
import test from 'node:test';
import { Nucleus04HybridCapabilityBridge } from './Nucleus04HybridCapabilityBridge';
import { Nucleus04Processor } from '../soul-core/Nucleus04Processor';

test('N04 hybrid bridge exposes only explicitly registered runtimes', async () => {
  const processor = new Nucleus04Processor();
  const calls: unknown[] = [];
  const bridge = new Nucleus04HybridCapabilityBridge({
    execute: async (capability, input) => {
      calls.push({ capability, input });
      return { capability, input, ok: true };
    },
  });

  bridge.register('tool-execution');
  assert.deepEqual(bridge.executableCapabilities(), ['tool-execution']);
  assert.deepEqual(
    await processor.execute({ capability: 'tool-execution', input: { tool: 'x' } }),
    { capability: 'tool-execution', input: { tool: 'x' }, ok: true },
  );
  assert.equal(calls.length, 0);
});

test('N04 hybrid bridge registers all non-pilot capabilities without replacing the pilot', () => {
  const bridge = new Nucleus04HybridCapabilityBridge({
    execute: async (capability, input) => ({ capability, input }),
  });
  bridge.registerAll();
  assert.equal(bridge.executableCapabilities().includes('ai-pilot'), false);
  assert.equal(bridge.executableCapabilities().includes('tool-execution'), true);
  assert.equal(bridge.executableCapabilities().includes('mesh-communication'), true);
});
