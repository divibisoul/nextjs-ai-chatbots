import { randomUUID } from 'crypto';
import { isSoulMeshMessage, normalizeMeshTimestamp } from './SoulMeshProtocol';
import type { SoulMeshMessage, SoulNucleus } from './SoulMeshProtocol';

export const NUCLEUS_ID = 'N04' as const;
export const PEERS = ['N01', 'N02', 'N03', 'N05', 'N06'] as const;
export type N04Peer = (typeof PEERS)[number];

const urls: Record<N04Peer, string | undefined> = {
  N01: process.env.SOUL_MESH_N01_URL,
  N02: process.env.SOUL_MESH_N02_URL,
  N03: process.env.SOUL_MESH_N03_URL,
  N05: process.env.SOUL_MESH_N05_URL,
  N06: process.env.SOUL_MESH_N06_URL,
};

export const N01_CAPABILITIES = [
  'android.device_info',
  'android.battery',
  'android.memory',
  'android.network',
  'android.events',
  'shizuku.bridge',
  'android.brightness',
  'android.wifi',
  'android.bluetooth',
  'android.airplane_mode',
  'android.background_process',
  'mesh.ping',
] as const;

export type N01Capability = (typeof N01_CAPABILITIES)[number];

function assertResponse(request: SoulMeshMessage, response: unknown): asserts response is SoulMeshMessage {
  if (!isSoulMeshMessage(response)) throw new Error('SOUL_MESH_INVALID_RESPONSE');
  if (response.protocol !== request.protocol) throw new Error('SOUL_MESH_PROTOCOL_MISMATCH');
  if (response.correlationId !== request.correlationId) throw new Error('SOUL_MESH_CORRELATION_MISMATCH');
  if (response.source !== request.target || response.target !== request.source) {
    throw new Error('SOUL_MESH_ROUTE_MISMATCH');
  }
  if (response.kind !== 'response' && response.kind !== 'error' && response.kind !== 'ack') {
    throw new Error('SOUL_MESH_INVALID_RESPONSE_KIND');
  }
  if (!Number.isFinite(normalizeMeshTimestamp(response.timestamp))) {
    throw new Error('SOUL_MESH_INVALID_TIMESTAMP');
  }
}

function assertPeer(target: SoulNucleus): asserts target is N04Peer {
  if (!PEERS.includes(target as N04Peer)) throw new Error(`SOUL_MESH_INVALID_PEER:${target}`);
}

export async function sendTo(
  target: N04Peer,
  capability: string,
  payload: unknown,
  timeoutMs = 15000,
): Promise<SoulMeshMessage> {
  assertPeer(target);
  if (!capability.trim()) throw new Error('SOUL_MESH_CAPABILITY_REQUIRED');
  const url = urls[target];
  if (!url) throw new Error(`SOUL_MESH_PEER_URL_NOT_CONFIGURED:${target}`);

  const message: SoulMeshMessage = {
    protocol: 'soul-mesh/1',
    id: randomUUID(),
    correlationId: randomUUID(),
    source: NUCLEUS_ID,
    target,
    kind: 'request',
    capability,
    payload,
    timestamp: Date.now(),
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const token = process.env.SOUL_MESH_TOKEN;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(message),
      signal: controller.signal,
    });

    let body: unknown;
    try { body = await response.json(); }
    catch { throw new Error(`SOUL_MESH_INVALID_JSON:${target}`); }

    assertResponse(message, body);
    if (!response.ok || body.kind === 'error') throw new Error(`SOUL_MESH_REMOTE_ERROR:${target}`);
    return body;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`SOUL_MESH_TIMEOUT:${target}`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export const N04_OUT_CHANNELS = PEERS.map((peer) => `N04.OUT.${peer}`);
export const N04_IN_CHANNELS = PEERS.map((peer) => `N04.IN.${peer}`);
