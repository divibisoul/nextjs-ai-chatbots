import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'node:http';
import { sendTo } from './peer-client';
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
test('N04 rejects HMAC keys shorter than the shared 32-byte minimum', () => {
  const message = request();
  const weak = 'short-n04-secret';
  assert.throws(
    () => signSoulMeshRequest(message, weak, createSoulMeshNonce()),
    /SOUL_MESH_HMAC_SECRET_TOO_SHORT/,
  );
  assert.equal(
    verifySoulMeshRequest(message, weak, createSoulMeshNonce(), '0'.repeat(64)),
    false,
  );
});

test('N04 peer client rejects an invalid response HMAC on HTTP 200', async () => {
  const originalUrl = process.env.SOUL_MESH_N05_URL;
  const originalSecret = process.env.SOUL_MESH_HMAC_SECRET;
  const originalToken = process.env.SOUL_MESH_TOKEN;
  const originalNodeEnv = process.env.NODE_ENV;
  const server = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const incoming = JSON.parse(Buffer.concat(chunks).toString('utf8')) as SoulMeshMessage;
    const signed = signSoulMeshResponse(incoming, { ok: true, nucleus: 'N05' }, 'response', secret);
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ ...signed.message, nonce: signed.nonce, hmac: '0'.repeat(64) }));
  });

  process.env.NODE_ENV = 'production';
  process.env.SOUL_MESH_HMAC_SECRET = secret;
  delete process.env.SOUL_MESH_TOKEN;

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  try {
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    process.env.SOUL_MESH_N05_URL = `http://127.0.0.1:${address.port}`;
    await assert.rejects(
      sendTo('N05', 'mesh.ping', { probe: 'invalid-response-hmac' }),
      /SOUL_MESH_RESPONSE_HMAC_INVALID/,
    );
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    if (originalUrl === undefined) delete process.env.SOUL_MESH_N05_URL;
    else process.env.SOUL_MESH_N05_URL = originalUrl;
    if (originalSecret === undefined) delete process.env.SOUL_MESH_HMAC_SECRET;
    else process.env.SOUL_MESH_HMAC_SECRET = originalSecret;
    if (originalToken === undefined) delete process.env.SOUL_MESH_TOKEN;
    else process.env.SOUL_MESH_TOKEN = originalToken;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  }
});
