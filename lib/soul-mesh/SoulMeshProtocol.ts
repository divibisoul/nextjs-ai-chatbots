export const SOUL_MESH_PROTOCOL = 'soul-mesh/1' as const;
export const SOUL_MESH_CONTRACT_VERSION = '1.1.0' as const;
export const SOUL_NUCLEI = ['N01', 'N02', 'N03', 'N04', 'N05', 'N06', 'N07'] as const;
export type SoulNucleus = typeof SOUL_NUCLEI[number];
export type SoulMeshKind = 'request' | 'response' | 'event' | 'error';
export type SoulMeshTransportKind = 'IN_PROCESS' | 'WEBVIEW_BRIDGE' | 'LOOPBACK_HTTP' | 'HTTP' | 'REALTIME';
export interface SoulMeshPeerProfile { nucleus: SoulNucleus; transports: readonly SoulMeshTransportKind[]; capabilities: readonly string[]; }
export interface SoulMeshMessage<T = unknown> {
  protocol: typeof SOUL_MESH_PROTOCOL;
  contractVersion: typeof SOUL_MESH_CONTRACT_VERSION;
  id: string;
  correlationId: string;
  source: SoulNucleus;
  target: SoulNucleus;
  kind: SoulMeshKind;
  capability?: string;
  payload: T;
  timestamp: number;
  meta?: { runtime?: string; transport?: string; encoding?: string; version?: string; nonce?: string; traceId?: string };
}
export interface SoulMeshTransport { send(message: SoulMeshMessage): Promise<void>; onMessage(handler: (message: SoulMeshMessage) => void | Promise<void>): () => void; }
export function createSoulMeshMessage<T>(input: Omit<SoulMeshMessage<T>, 'protocol' | 'contractVersion' | 'id' | 'timestamp'> & { contractVersion?: typeof SOUL_MESH_CONTRACT_VERSION }): SoulMeshMessage<T> {
  const id = crypto.randomUUID();
  return { ...input, protocol: SOUL_MESH_PROTOCOL, contractVersion: input.contractVersion ?? SOUL_MESH_CONTRACT_VERSION, id, timestamp: Date.now(), correlationId: input.correlationId || id };
}
export function validateSoulMeshMessage(value: unknown): asserts value is SoulMeshMessage {
  if (!value || typeof value !== 'object') throw new Error('INVALID_MESSAGE');
  const m = value as Record<string, unknown>;
  if (m.protocol !== SOUL_MESH_PROTOCOL) throw new Error('INVALID_PROTOCOL');
  if (m.contractVersion !== SOUL_MESH_CONTRACT_VERSION) throw new Error('INVALID_CONTRACT_VERSION');
  if (typeof m.id !== 'string' || !m.id) throw new Error('INVALID_MESSAGE_ID');
  if (typeof m.correlationId !== 'string' || !m.correlationId) throw new Error('INVALID_CORRELATION');
  if (!SOUL_NUCLEI.includes(m.source as SoulNucleus) || !SOUL_NUCLEI.includes(m.target as SoulNucleus)) throw new Error('INVALID_NUCLEUS');
  if (m.source === m.target) throw new Error('SELF_ROUTE_NOT_ALLOWED');
  if (!['request', 'response', 'event', 'error'].includes(m.kind as string)) throw new Error('INVALID_KIND');
  if (m.kind === 'request' && (typeof m.capability !== 'string' || !m.capability.trim())) throw new Error('CAPABILITY_REQUIRED');
  if (typeof m.timestamp !== 'number' || !Number.isFinite(m.timestamp)) throw new Error('INVALID_TIMESTAMP');
  if (Math.abs(Date.now() - m.timestamp) > 30000) throw new Error('MESSAGE_CLOCK_SKEW');
  if (m.meta !== undefined && (!m.meta || typeof m.meta !== 'object')) throw new Error('INVALID_META');
}
export function isSoulMeshMessage(value: unknown): value is SoulMeshMessage { try { validateSoulMeshMessage(value); return true; } catch { return false; } }
