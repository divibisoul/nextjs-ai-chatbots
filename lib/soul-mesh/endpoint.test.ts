import assert from 'node:assert/strict';
import test from 'node:test';
import { handleMeshMessage } from './endpoint';
import { createMeshRequest } from './SoulMeshE2EContract';
import { validateMessage as validateSourceFacade, handleMeshMessage as handleSourceFacade } from '../../src/soul-mesh/endpoint';
import { SOUL_MESH_PROTOCOL as canonicalProtocol, validateSoulMeshMessage } from './SoulMeshProtocol';

test('N04 dispatcher executes a registered hybrid capability and returns the result', async () => {
  const request = createMeshRequest('N02', 'N04', 'context-orchestration', { sourceRuntime: 'N02' });
  const response = await handleMeshMessage(request, {
    'context-orchestration': async (payload) => ({ accepted: true, payload, runtime: 'N04' }),
  });

  assert.equal(response.kind, 'response');
  assert.equal(response.source, 'N04');
  assert.equal(response.target, 'N02');
  assert.equal(response.correlationId, request.correlationId);
  assert.deepEqual(response.payload, {
    accepted: true,
    payload: { sourceRuntime: 'N02' },
    runtime: 'N04',
  });
});

test('N04 dispatcher returns a protocol error when a capability has no handler', async () => {
  const request = createMeshRequest('N06', 'N04', 'capability.not.registered', {});
  const response = await handleMeshMessage(request);

  assert.equal(response.kind, 'error');
  assert.equal(response.source, 'N04');
  assert.equal(response.target, 'N06');
  assert.equal(response.correlationId, request.correlationId);
});

test('source endpoint facade delegates to canonical protocol and responds to the peer', async () => {
  const request = createMeshRequest('N01', 'N04', 'mesh.ping', { probe: true });
  assert.equal(request.protocol, canonicalProtocol);
  assert.equal(validateSourceFacade(request, 'N04'), true);
  const response = await handleSourceFacade(request, 'N04', {
    'mesh.ping': () => ({ ok: true, nucleus: 'N04' }),
  });
  validateSoulMeshMessage(response);
  assert.equal(response.kind, 'response');
  assert.equal(response.source, 'N04');
  assert.equal(response.target, 'N01');
  assert.equal(response.correlationId, request.correlationId);
});

test('legacy ack is retained as an adapter-only envelope', async () => {
  const ack = {
    protocol: canonicalProtocol, contractVersion: '1.1.0', id: 'legacy-ack-id',
    correlationId: 'legacy-ack-correlation', source: 'N01', target: 'N04', kind: 'ack',
    capability: 'mesh.ping', payload: { acknowledged: true }, timestamp: Date.now(),
  };
  assert.equal(validateSourceFacade(ack as never, 'N04'), true);
  const response = await handleSourceFacade(ack as never, 'N04', {});
  assert.equal(response.kind, 'ack');
});
