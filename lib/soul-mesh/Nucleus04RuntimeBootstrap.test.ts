import assert from 'node:assert/strict';
import test from 'node:test';
import { NUCLEUS_04_CAPABILITIES } from '../soul-core/Nucleus04Capabilities';
import { bootstrapNucleus04Runtime } from './Nucleus04RuntimeBootstrap';

test('N04 runtime bootstrap binds the complete capability surface', () => {
  const status = bootstrapNucleus04Runtime(
    {
      execute: async (capability, input) => ({ capability, input }),
    },
    {
      id: 'test-pilot',
      execute: async (input) => ({ pilot: true, input }),
    },
  );

  assert.equal(status.declared.length, NUCLEUS_04_CAPABILITIES.length);
  assert.equal(status.registered.length, 15);
  assert.deepEqual(status.missing, []);
  assert.equal(status.ready, true);
});
