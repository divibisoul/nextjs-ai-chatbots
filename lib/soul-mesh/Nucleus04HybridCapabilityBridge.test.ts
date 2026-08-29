import assert from 'node:assert/strict';
import test from 'node:test';
import { Nucleus04HybridCapabilityBridge } from './Nucleus04HybridCapabilityBridge';
import { nucleus04Processor } from '../soul-core/Nucleus04Processor';

test('N04 hybrid bridge exposes only explicitly registered runtimes', async () => {
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
    await nucleus04Processor.execute({ capability: 'tool-execution', input: { tool: 'x' } }),
    { capability: 'tool-execution', input: { tool: 'x' }, ok: true },
  );
  assert.equal(calls.length, 1);
});

test('N04 hybrid bridge registers the complete executable capability surface', () => {
  const bridge = new Nucleus04HybridCapabilityBridge({
    execute: async (capability, input) => ({ capability, input }),
  });
  bridge.registerAll();
  assert.equal(bridge.executableCapabilities().includes('ai-pilot'), true);
  assert.equal(bridge.executableCapabilities().includes('tool-execution'), true);
  assert.equal(bridge.executableCapabilities().includes('mesh-communication'), true);
});
