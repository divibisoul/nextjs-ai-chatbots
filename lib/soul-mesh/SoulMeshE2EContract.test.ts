import assert from 'node:assert/strict';
import test from 'node:test';
import { createMeshRequest, validateMeshResponse } from './SoulMeshE2EContract';
import { isSoulMeshMessage } from './SoulMeshProtocol';

test('Soul Mesh Nucleus 04 creates a correlated request', () => {
  const request = createMeshRequest('N04', 'N02', 'context-orchestration', { test: true });
  assert.equal(request.protocol, 'soul-mesh/1');
  assert.equal(request.source, 'N04');
  assert.equal(request.target, 'N02');
  assert.ok(request.correlationId);
});

test('Soul Mesh accepts only a correctly correlated reverse response', () => {
  const request = createMeshRequest('N04', 'N02', 'context-orchestration', {});
  const response = {
    ...request,
    id: crypto.randomUUID(),
    source: 'N02' as const,
    target: 'N04' as const,
    kind: 'response' as const,
  };

  assert.equal(validateMeshResponse(request, response), true);
  assert.equal(validateMeshResponse(request, { ...response, correlationId: crypto.randomUUID() }), false);
});

test('Soul Mesh rejects malformed, self-routed and capability-less envelopes', () => {
  const valid = {
    protocol: 'soul-mesh/1' as const,
    id: crypto.randomUUID(),
    correlationId: crypto.randomUUID(),
    source: 'N02' as const,
    target: 'N04' as const,
    kind: 'request' as const,
    capability: 'ai-pilot',
    payload: {},
    timestamp: Date.now(),
  };

  assert.equal(isSoulMeshMessage(valid), true);
  assert.equal(isSoulMeshMessage({ ...valid, target: 'N02' }), false);
  assert.equal(isSoulMeshMessage({ ...valid, capability: undefined }), false);
  assert.equal(isSoulMeshMessage({ ...valid, timestamp: 0 }), false);
  assert.equal(isSoulMeshMessage({ ...valid, kind: 'invalid' }), false);
});
