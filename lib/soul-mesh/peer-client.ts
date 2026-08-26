import { randomUUID } from 'crypto';
import type { SoulMeshMessage } from './SoulMeshProtocol';

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

function assertResponse(request: SoulMeshMessage, response: unknown): asserts response is SoulMeshMessage {
  if (!response || typeof response !== 'object') throw new Error('SOUL_MESH_INVALID_RESPONSE');
  const candidate = response as SoulMeshMessage;
  if (candidate.protocol !== request.protocol) throw new Error('SOUL_MESH_PROTOCOL_MISMATCH');
  if (candidate.correlationId !== request.correlationId) throw new Error('SOUL_MESH_CORRELATION_MISMATCH');
  if (candidate.source !== request.target || candidate.target !== request.source) {
    throw new Error('SOUL_MESH_ROUTE_MISMATCH');
  }
  if (candidate.kind !== 'response' && candidate.kind !== 'error') {
    throw new Error('SOUL_MESH_INVALID_RESPONSE_KIND');
  }
}

export async function sendTo(
  target: N04Peer,
  capability: string,
  payload: unknown,
  timeoutMs = 15000,
): Promise<SoulMeshMessage> {
  const url = urls[target];
  if (!url) throw new Error(`SOUL_MESH_PEER_URL_NOT_CONFIGURED:${target}`);

  const correlationId = randomUUID();
  const message: SoulMeshMessage = {
    protocol: 'soul-mesh/1',
    id: randomUUID(),
    correlationId,
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
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(message),
      signal: controller.signal,
    });

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new Error(`SOUL_MESH_INVALID_JSON:${target}`);
    }

    assertResponse(message, body);
    if (!response.ok || body.kind === 'error') {
      throw new Error(`SOUL_MESH_REMOTE_ERROR:${target}`);
    }
    return body;
  } finally {
    clearTimeout(timer);
  }
}

export const N04_OUT_CHANNELS = PEERS.map((peer) => `N04.OUT.${peer}`);
export const N04_IN_CHANNELS = PEERS.map((peer) => `N04.IN.${peer}`);
