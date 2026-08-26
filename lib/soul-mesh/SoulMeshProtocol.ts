export const SOUL_MESH_PROTOCOL = 'soul-mesh/1' as const;
export const SOUL_NUCLEI = ['N01', 'N02', 'N03', 'N04', 'N05', 'N06'] as const;
export type SoulNucleus = typeof SOUL_NUCLEI[number];

/** N01 is the reference wire implementation. ACK is supported by its HTTP transport. */
export type SoulMeshKind = 'request' | 'response' | 'event' | 'error' | 'ack';

const KINDS = new Set<SoulMeshKind>(['request', 'response', 'event', 'error', 'ack']);

export interface SoulMeshMessage<T = unknown> {
  protocol: typeof SOUL_MESH_PROTOCOL;
  id: string;
  correlationId: string;
  source: SoulNucleus;
  target: SoulNucleus;
  kind: SoulMeshKind;
  capability: string;
  payload: T;
  /** N01 currently serializes ISO-8601 text; web peers may use epoch milliseconds. */
  timestamp: number | string;
}

export interface SoulMeshTransport {
  send(message: SoulMeshMessage): Promise<void>;
  onMessage(handler: (message: SoulMeshMessage) => void | Promise<void>): () => void;
}

export function isSoulNucleus(value: unknown): value is SoulNucleus {
  return typeof value === 'string' && (SOUL_NUCLEI as readonly string[]).includes(value);
}

export function createSoulMeshMessage<T>(
  input: Omit<SoulMeshMessage<T>, 'protocol' | 'id' | 'timestamp'>,
): SoulMeshMessage<T> {
  return { protocol: SOUL_MESH_PROTOCOL, id: crypto.randomUUID(), timestamp: Date.now(), ...input };
}

export function normalizeMeshTimestamp(timestamp: number | string): number {
  if (typeof timestamp === 'number') return timestamp;
  const epoch = Date.parse(timestamp);
  return Number.isFinite(epoch) ? epoch : Number.NaN;
}

export function isSoulMeshMessage(value: unknown): value is SoulMeshMessage {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const m = value as Record<string, unknown>;
  if (m.protocol !== SOUL_MESH_PROTOCOL) return false;
  if (typeof m.id !== 'string' || m.id.length < 8 || m.id.length > 200) return false;
  if (typeof m.correlationId !== 'string' || m.correlationId.length < 8 || m.correlationId.length > 200) return false;
  if (!isSoulNucleus(m.source) || !isSoulNucleus(m.target) || m.source === m.target) return false;
  if (typeof m.kind !== 'string' || !KINDS.has(m.kind as SoulMeshKind)) return false;
  if (typeof m.capability !== 'string' || !m.capability.trim()) return false;
  if (typeof m.timestamp !== 'number' && typeof m.timestamp !== 'string') return false;
  if (!Number.isFinite(normalizeMeshTimestamp(m.timestamp))) return false;
  return 'payload' in m;
}
