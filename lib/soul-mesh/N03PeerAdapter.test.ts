import assert from 'node:assert/strict';
import test from 'node:test';
import { N03_CAPABILITIES } from './N03PeerAdapter';
import { N04_IN_CHANNELS, N04_OUT_CHANNELS } from './peer-client';

test('N04 exposes the N03 peer and canonical channels', () => {
  assert.ok(N03_CAPABILITIES.includes('mesh.ping'));
  assert.ok(N03_CAPABILITIES.includes('mesh.describe'));
  assert.ok(N03_CAPABILITIES.includes('capability.list'));
  assert.ok(N04_IN_CHANNELS.includes('N04.IN.N03'));
  assert.ok(N04_OUT_CHANNELS.includes('N04.OUT.N03'));
});

test('N04 live N03 connectivity', async (t) => {
  if (!process.env.SOUL_MESH_N03_URL || !process.env.SOUL_MESH_TOKEN) {
    t.skip('SOUL_MESH_N03_URL and SOUL_MESH_TOKEN are required for a live E2E check');
    return;
  }

  const { healthN03 } = await import('./N03PeerAdapter');
  const result = await healthN03(5000);
  assert.equal(result.status, 'CONNECTED');
});
