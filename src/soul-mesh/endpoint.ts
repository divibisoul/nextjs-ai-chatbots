export const SOUL_MESH_PROTOCOL = 'soul-mesh/1' as const;
export const SOUL_MESH_CONTRACT_VERSION = '1.1.0' as const;
export const SOUL_NUCLEI = ['N01', 'N02', 'N03', 'N04', 'N05', 'N06', 'N07'] as const;
export type NucleusId = typeof SOUL_NUCLEI[number];
export type CanonicalMessageKind = 'request' | 'response' | 'event' | 'error';
export type MessageKind = CanonicalMessageKind | 'ack';
export type SoulMeshMessage = {
  protocol: typeof SOUL_MESH_PROTOCOL;
  contractVersion: typeof SOUL_MESH_CONTRACT_VERSION;
  id: string;
  correlationId: string;
  source: NucleusId;
  target: NucleusId;
  kind: MessageKind;
  capability?: string;
  payload: unknown;
  timestamp: number;
  meta?: { runtime?: string; transport?: string; encoding?: string; version?: string; nonce?: string; traceId?: string };
};

export function validateMessage(m: SoulMeshMessage, nucleusId: NucleusId) {
  if (m.protocol !== SOUL_MESH_PROTOCOL) throw new Error('Unsupported Mesh protocol');
  if (m.contractVersion !== SOUL_MESH_CONTRACT_VERSION) throw new Error('Unsupported Mesh contract version');
  if (m.target !== nucleusId) throw new Error('Wrong target');
  if (m.source === m.target) throw new Error('Self route');
  if (!m.id || !m.correlationId || !m.capability) throw new Error('Malformed Mesh message');
  if (!Number.isFinite(m.timestamp) || Math.abs(Date.now() - m.timestamp) > 30_000) throw new Error('Stale Mesh message');
  if (!['request', 'response', 'event', 'error', 'ack'].includes(m.kind)) throw new Error('Invalid Mesh kind');
  return true;
}

export async function handleMeshMessage(
  m: SoulMeshMessage,
  nucleusId: NucleusId,
  handlers: Record<string, (p: unknown) => Promise<unknown> | unknown>,
) {
  validateMessage(m, nucleusId);
  // `ack` remains accepted only as a legacy ingress representation; all generated responses are canonical.
  if (m.kind !== 'request') return m;
  const h = handlers[m.capability!];
  if (!h) return { ...m, kind: 'error' as const, target: m.source, source: nucleusId, payload: { code: 'CAPABILITY_NOT_FOUND' } };
  try {
    return { ...m, kind: 'response' as const, target: m.source, source: nucleusId, payload: await h(m.payload) };
  } catch (e) {
    return { ...m, kind: 'error' as const, target: m.source, source: nucleusId, payload: { code: 'CAPABILITY_EXECUTION_ERROR', detail: e instanceof Error ? e.message : String(e) } };
  }
}
