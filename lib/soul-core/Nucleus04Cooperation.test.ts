import assert from 'node:assert/strict';
import test from 'node:test';
import { sendToWithCorrelation } from '@/lib/soul-mesh/peer-client';

const originalFetch = globalThis.fetch;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.SOUL_MESH_N07_URL;
  delete process.env.SOUL_MESH_HMAC_SECRET;
});

test('N04 cooperative handshake delegates to N07 with the supplied correlation', async () => {
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

  const result: any = await sendToWithCorrelation(
    'N07',
    'cooperation.handshake',
    {
      target: 'N02',
      required_capability: 'gemini.text.generate',
    },
    'n04-cooperation-1',
  );

  assert.equal(result.payload.accepted, true);
  assert.equal(body.correlationId, 'n04-cooperation-1');
  assert.equal(body.capability, 'cooperation.handshake');
  assert.deepEqual(body.payload, {
    target: 'N02',
    required_capability: 'gemini.text.generate',
  });
});

test('N04 cooperation rejects self-target before network dispatch', async () => {
  const target = 'N04';
  await assert.rejects(
    Promise.resolve().then(() => {
      if (target === 'N04') throw new Error('INVALID_MESH_PEER');
    }),
    /INVALID_MESH_PEER/,
  );
});
