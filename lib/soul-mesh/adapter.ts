import { randomUUID } from 'crypto';
import type { SoulMeshMessage, SoulNucleus } from './SoulMeshProtocol';

export type N04Peer = Exclude<SoulNucleus, 'N04'>;
const PEERS: readonly N04Peer[] = ['N01', 'N02', 'N03', 'N05', 'N06'];
const ENV: Record<N04Peer, string> = { N01: 'SOUL_MESH_N01_URL', N02: 'SOUL_MESH_N02_URL', N03: 'SOUL_MESH_N03_URL', N05: 'SOUL_MESH_N05_URL', N06: 'SOUL_MESH_N06_URL' };

export function getConfiguredPeers() {
  return PEERS.map((id) => ({ id, url: process.env[ENV[id]]?.trim().replace(/\/$/, '') ?? '' })).filter((peer) => Boolean(peer.url));
}

export function createRequest(target: N04Peer, capability: string, payload: unknown): SoulMeshMessage {
  const id = randomUUID();
  return { protocol: 'soul-mesh/1', id, correlationId: id, source: 'N04', target, kind: 'request', capability, payload, timestamp: Date.now() };
}

export async function sendTo(target: N04Peer, capability: string, payload: unknown, timeoutMs = 15000): Promise<unknown> {
  const peer = getConfiguredPeers().find((item) => item.id === target);
  if (!peer) throw new Error(`SOUL_MESH_PEER_URL_NOT_CONFIGURED:${target}`);
  const message = createRequest(target, capability, payload);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const token = process.env.SOUL_MESH_TOKEN;
    const response = await fetch(`${peer.url}/api/soul-mesh`, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(message), signal: controller.signal, cache: 'no-store' });
    const body = await response.json().catch(() => null) as SoulMeshMessage | null;
    if (!response.ok) throw new Error(`SOUL_MESH_REMOTE_ERROR:${target}:${response.status}`);
    if (!body || body.protocol !== message.protocol || body.correlationId !== message.correlationId || body.source !== target || body.target !== 'N04') throw new Error('SOUL_MESH_RESPONSE_INVALID');
    if (body.kind === 'error') throw new Error(`SOUL_MESH_REMOTE_ERROR:${target}`);
    return body.payload;
  } finally { clearTimeout(timer); }
}

export async function probePeer(target: N04Peer) { try { return { id: target, reachable: true, details: await sendTo(target, 'mesh.describe', { from: 'N04' }) }; } catch (error) { return { id: target, reachable: false, error: error instanceof Error ? error.message : String(error) }; } }
export async function probeAllPeers() { return Promise.all(PEERS.map(probePeer)); }
