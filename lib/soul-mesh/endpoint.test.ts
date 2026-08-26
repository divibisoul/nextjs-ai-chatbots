import assert from 'node:assert/strict';
import test from 'node:test';
import { handleMeshMessage } from './endpoint';
import { createMeshRequest } from './SoulMeshE2EContract';

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
