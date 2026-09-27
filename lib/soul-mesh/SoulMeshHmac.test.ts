import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createSoulMeshNonce,
  signSoulMeshRequest,
  signSoulMeshResponse,
  verifySoulMeshRequest,
  verifySoulMeshResponse,
} from './SoulMeshHmac';
import type { SoulMeshMessage } from './SoulMeshProtocol';

const secret = '0123456789abcdef0123456789abcdef';

function request(): SoulMeshMessage {
  return {
    protocol: 'soul-mesh/1',
    contractVersion: '1.1.0',
    id: 'request-1',
    correlationId: 'corr-1',
    source: 'N07',
    target: 'N04',
    kind: 'request',
    capability: 'mesh.describe',
    payload: { from: 'N07' },
    timestamp: Date.now(),
    meta: {
      runtime: 'n07',
      transport: 'HTTP',
      encoding: 'json',
      version: '1.1.0',
      traceId: 'corr-1',
    },
  };
}

test('N04 verifies a canonical Mesh request signed with the shared secret', () => {
  const message = request();
  const nonce = createSoulMeshNonce();
  const signature = signSoulMeshRequest(message, secret, nonce);
  assert.equal(verifySoulMeshRequest(message, secret, nonce, signature), true);
  assert.equal(verifySoulMeshRequest(message, secret, nonce, signature + '00'), false);
});

test('N04 response signature round-trips against its originating request', () => {
  const message = request();
  const payload = { nucleus: 'N04', status: 'online' };
  const signed = signSoulMeshResponse(message, payload, 'response', secret);
  assert.equal(
    verifySoulMeshResponse(message, signed.message, secret, signed.nonce, signed.hmac),
    true,
  );
  assert.notEqual(signed.message.id, message.id);
});

test('request signature changes with payload', () => {
  const first = request();
  const second = { ...first, payload: { from: 'N07', probe: 'different' } };
  const nonce = createSoulMeshNonce();
  assert.notEqual(
    signSoulMeshRequest(first, secret, nonce),
    signSoulMeshRequest(second, secret, nonce),
  );
});