import assert from 'node:assert/strict';
import test from 'node:test';
import { createNucleus04MeshHandlers } from './Nucleus04MeshRuntime';

const originalFetch = globalThis.fetch;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.SOUL_MESH_N07_URL;
  delete process.env.SOUL_MESH_HMAC_SECRET;
});

test('N04 delegates cooperative handshake to N07 with the supplied correlation', async () => {
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
      payload: { accepted: true },
      timestamp: Date.now(),
    }), { status: 200 });
  };

  const handlers = createNucleus04MeshHandlers();
  const result: any = await handlers['cooperation.handshake']({
    kind: 'local',
    nucleus: 'N04',
    capability: 'cooperation.handshake',
    correlationId: 'n04-cooperation-1',
    payload: {
      target: 'N02',
      required_capability: 'gemini.text.generate',
    },
  });

  assert.equal(result.payload.accepted, true);
  assert.equal(body.correlationId, 'n04-cooperation-1');
  assert.equal(body.capability, 'cooperation.handshake');
  assert.deepEqual(body.payload, {
    target: 'N02',
    required_capability: 'gemini.text.generate',
  });
});

test('N04 refuses a cooperation self-target before network use', async () => {
  const handlers = createNucleus04MeshHandlers();
  await assert.rejects(
    handlers['cooperation.exchange']({
      kind: 'local',
      nucleus: 'N04',
      capability: 'cooperation.exchange',
      correlationId: 'n04-self',
      payload: { target: 'N04', capability: 'tool.execute', payload: {} },
    }),
    /INVALID_MESH_PEER/,
  );
});
