import assert from 'node:assert/strict';
import test from 'node:test';
import { isSoulMeshMessage } from './SoulMeshProtocol';

test('canonical Mesh validator accepts a valid cross-nucleus request', () => {
  assert.equal(isSoulMeshMessage({
    protocol: 'soul-mesh/1', id: 'id', correlationId: 'corr', source: 'N01', target: 'N04',
    kind: 'request', capability: 'ai-pilot', payload: {}, timestamp: Date.now(),
  }), true);
});

test('canonical Mesh validator rejects malformed identity and kind', () => {
  assert.equal(isSoulMeshMessage({
    protocol: 'soul-mesh/1', id: '', correlationId: 'corr', source: 'N01', target: 'N04',
    kind: 'request', capability: 'ai-pilot', payload: {}, timestamp: Date.now(),
  }), false);

  assert.equal(isSoulMeshMessage({
    protocol: 'soul-mesh/1', id: 'id', correlationId: 'corr', source: 'N01', target: 'N04',
    kind: 'invalid', payload: {}, timestamp: Date.now(),
  }), false);
});
