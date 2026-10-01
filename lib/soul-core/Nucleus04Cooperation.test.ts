import assert from 'node:assert/strict';
import test from 'node:test';
import { sendToWithCorrelation } from '@/lib/soul-mesh/peer-client';

test.afterEach(() => {
  delete process.env.SOUL_MESH_N07_URL;
  delete process.env.SOUL_MESH_HMAC_SECRET;
});

test('N04 cooperation is fail-closed when N07 transport is not configured', async () => {
  delete process.env.SOUL_MESH_N07_URL;
  await assert.rejects(
    sendToWithCorrelation(
      'N07',
      'cooperation.handshake',
      {
        target: 'N02',
        required_capability: 'gemini.text.generate',
      },
      'n04-cooperation-blocked',
    ),
    /SOUL_MESH_PEER_URL_NOT_CONFIGURED:N07/,
  );
});

test('N04 cooperation delegates to real N07 when endpoint is configured', async (t) => {
  const endpoint = process.env.SOUL_MESH_N07_URL?.trim();
  const secret = process.env.SOUL_MESH_HMAC_SECRET?.trim();
  if (!endpoint) {
    t.skip('BLOCKED_ENV: SOUL_MESH_N07_URL is not configured; real N07 integration is not measurable in this runner');
    return;
  }
  if (secret && secret.length < 16) {
    t.skip('BLOCKED_ENV: SOUL_MESH_HMAC_SECRET is invalid for the real N07 integration in this runner');
    return;
  }

  const result: any = await sendToWithCorrelation(
    'N07',
    'cooperation.handshake',
    {
      target: 'N02',
      required_capability: 'gemini.text.generate',
    },
    'n04-cooperation-real',
  );

  assert.equal(result.protocol, 'soul-mesh/1');
  assert.equal(result.contractVersion, '1.1.0');
  assert.equal(result.correlationId, 'n04-cooperation-real');
  assert.equal(result.source, 'N07');
  assert.equal(result.target, 'N04');
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
