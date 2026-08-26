import { describe, expect, it } from 'vitest';
import { isSoulMeshMessage, normalizeMeshTimestamp } from './SoulMeshProtocol';
import { isN01Capability, N01_CAPABILITIES, N04_IN_CHANNELS, N04_OUT_CHANNELS } from './peer-client';

describe('N01 reference compatibility', () => {
  it('accepts the ISO-8601 timestamp emitted by N01 Android', () => {
    const message = {
      protocol: 'soul-mesh/1', id: '12345678', correlationId: '87654321',
      source: 'N01', target: 'N04', kind: 'response', capability: 'mesh.ping',
      payload: { ok: true }, timestamp: '2026-08-26T21:00:00Z',
    };
    expect(isSoulMeshMessage(message)).toBe(true);
    expect(Number.isFinite(normalizeMeshTimestamp(message.timestamp))).toBe(true);
  });

  it('accepts epoch timestamps used by web nuclei', () => {
    expect(isSoulMeshMessage({
      protocol: 'soul-mesh/1', id: '12345678', correlationId: '87654321',
      source: 'N04', target: 'N01', kind: 'request', capability: 'mesh.ping',
      payload: {}, timestamp: Date.now(),
    })).toBe(true);
  });

  it('supports the ACK emitted by the N01 HTTP transport', () => {
    expect(isSoulMeshMessage({
      protocol: 'soul-mesh/1', id: '12345678', correlationId: '87654321',
      source: 'N01', target: 'N04', kind: 'ack', capability: 'mesh.ping',
      payload: { accepted: true }, timestamp: new Date().toISOString(),
    })).toBe(true);
  });

  it('does not invent Android capabilities outside the verified N01 catalog', () => {
    expect(N01_CAPABILITIES).toEqual(['mesh.ping', 'data.remote']);
    expect(isN01Capability('mesh.ping')).toBe(true);
    expect(isN01Capability('android.battery')).toBe(false);
  });

  it('keeps all five N04 peer directions represented', () => {
    expect(N04_IN_CHANNELS).toHaveLength(5);
    expect(N04_OUT_CHANNELS).toHaveLength(5);
  });
});
