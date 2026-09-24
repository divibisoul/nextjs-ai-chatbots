/** Compatibility facade; execution is delegated to the canonical authenticated N04 peer client. */
import type { SoulMeshMessage, SoulNucleus } from './SoulMeshProtocol';
import { sendTo as sendCanonicalTo, PEERS as CANONICAL_PEERS, type N04Peer } from './peer-client';

export type { N04Peer };
export const PEERS = CANONICAL_PEERS;
const ENV: Record<N04Peer, string> = Object.fromEntries(
  CANONICAL_PEERS.map(peer => [peer, `SOUL_MESH_${peer}_URL`]),
) as Record<N04Peer, string>;

export function getConfiguredPeers() {
  return PEERS.map(id => ({
    id,
    url: process.env[ENV[id]]?.trim().replace(/\/$/, '') ?? '',
  })).filter(peer => Boolean(peer.url));
}

export function createRequest(target: N04Peer, capability: string, payload: unknown): SoulMeshMessage {
  const id = crypto.randomUUID();
  return {
    protocol: 'soul-mesh/1',
    contractVersion: '1.1.0',
    id,
    correlationId: id,
    source: 'N04',
    target,
    kind: 'request',
    capability,
    payload,
    timestamp: Date.now(),
    meta: { runtime: 'nextjs-ai-chatbots', transport: 'HTTP', encoding: 'json', version: '1.1.0', nonce: crypto.randomUUID().replaceAll('-', '').padEnd(32, '0').slice(0, 32), traceId: id },
  };
}

export async function sendTo(target: N04Peer, capability: string, payload: unknown, timeoutMs = 15000): Promise<unknown> {
  return (await sendCanonicalTo(target, capability, payload, timeoutMs, 2)).payload;
}

export async function probePeer(target: N04Peer) {
  try {
    return { id: target, reachable: true, details: await sendTo(target, 'mesh.describe', { from: 'N04' }) };
  } catch (error) {
    return { id: target, reachable: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function probeAllPeers() {
  return Promise.all(PEERS.map(probePeer));
}