import assert from 'node:assert/strict';
import test from 'node:test';
import { createNucleus04MeshHandlers } from './Nucleus04MeshRuntime';

const originalFetch = globalThis.fetch;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.SOUL_MESH_N07_URL;
  delete process.env.SOUL_MESH_HMAC_SECRET;
});

test('N04 cooperative handshake delegates to N07 and preserves correlation', async () => {
  process.env.SOUL_MESH_N07_URL = 'http://n07.test';
  let body: any;
  globalThis.fetch = async (_input: any, init?: any) => {
    body = JSON.parse(String(init?.body ?? '{}'));
    return new Response(JSON.stringify({
      protocol: 'soul-mesh/1',
      contractVersion: '1.1.0',
      id: 'n07-response',
      correlationId: body.correlationId,
      source: 'N07',
      target: 'N04',
      kind: 'response',
      capability: body.capability,
      payload: { status: 'ready', accepted: true },
      timestamp: Date.now(),
      meta: { nonce: 'resp-nonce', traceId: body.meta?.traceId },
    }), { status: 200 });
  };

  const handlers = createNucleus04MeshHandlers();
  const result = await handlers['cooperation.handshake']({
    kind: 'local',
    nucleus: 'N04',
    capability: 'cooperation.handshake',
    correlationId: 'n04-coop-handshake',
    payload: {
      target: 'N02',
      required_capability: 'gemini.text.generate',
    },
  });
  assert.equal((result as any).payload.accepted, true);
  assert.equal((result as any).correlationId, 'n04-coop-handshake');
  assert.equal(body.source, 'N04');
  assert.equal(body.target, 'N07');
  assert.equal(body.capability, 'cooperation.handshake');
  assert.equal(body.correlationId, 'n04-coop-handshake');
  assert.equal(body.payload.target, 'N02');
  assert.equal(body.payload.required_capability, 'gemini.text.generate');
});

test('N04 cooperative exchange rejects self-target before transport', async () => {
  const handlers = createNucleus04MeshHandlers();
  await assert.rejects(
    handlers['cooperation.exchange']({
      kind: 'local',
      nucleus: 'N04',
      capability: 'cooperation.exchange',
      correlationId: 'n04-self',
      payload: { target: 'N04', capability: 'x', payload: {} },
    }),
    /INVALID_MESH_PEER/,
  );
});
