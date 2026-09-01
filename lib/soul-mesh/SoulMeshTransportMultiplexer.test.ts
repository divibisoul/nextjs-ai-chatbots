import assert from 'node:assert/strict';
import test from 'node:test';
import type { SoulMeshMessage, SoulMeshTransport } from './SoulMeshProtocol';
import { SoulMeshTransportMultiplexer } from './SoulMeshTransportMultiplexer';

function transport(send: SoulMeshTransport['send']): SoulMeshTransport {
  return { send, onMessage: () => () => undefined };
}

const message: SoulMeshMessage = {
  protocol: 'soul-mesh/1',
  contractVersion: '1.1.0',
  id: 'id',
  correlationId: 'corr',
  source: 'N04',
  target: 'N01',
  kind: 'request',
  capability: 'mesh.ping',
  payload: {},
  timestamp: Date.now(),
};

test('multiplexer falls back when the primary transport fails', async () => {
  const calls: string[] = [];
  const mux = new SoulMeshTransportMultiplexer([
    { id: 'primary', transport: transport(async () => { calls.push('primary'); throw new Error('offline'); }) },
    { id: 'secondary', transport: transport(async () => { calls.push('secondary'); }) },
  ]);

  await mux.send(message);
  assert.deepEqual(calls, ['primary', 'secondary']);
});

test('multiplexer reports failure only after every transport fails', async () => {
  const mux = new SoulMeshTransportMultiplexer([
    { id: 'http', transport: transport(async () => { throw new Error('timeout'); }) },
    { id: 'realtime', transport: transport(async () => { throw new Error('closed'); }) },
  ]);

  await assert.rejects(() => mux.send(message), /SOUL_MESH_ALL_TRANSPORTS_FAILED/);
});

test('disabled transports are not selected', async () => {
  const calls: string[] = [];
  const mux = new SoulMeshTransportMultiplexer([
    { id: 'disabled', enabled: false, transport: transport(async () => { calls.push('disabled'); }) },
    { id: 'active', transport: transport(async () => { calls.push('active'); }) },
  ]);

  await mux.send(message);
  assert.deepEqual(calls, ['active']);
  assert.deepEqual(mux.availableTransports(), ['active']);
});
