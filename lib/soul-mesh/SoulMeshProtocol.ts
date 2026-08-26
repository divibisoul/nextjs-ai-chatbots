export type SoulNucleus = 'N01' | 'N02' | 'N03' | 'N04' | 'N05' | 'N06';
export type SoulMeshKind = 'request' | 'response' | 'event' | 'error';

const NUCLEI = new Set<SoulNucleus>(['N01', 'N02', 'N03', 'N04', 'N05', 'N06']);
const KINDS = new Set<SoulMeshKind>(['request', 'response', 'event', 'error']);

export interface SoulMeshMessage<T = unknown> {
  protocol: 'soul-mesh/1';
  id: string;
  correlationId: string;
  source: SoulNucleus;
  target: SoulNucleus;
  kind: SoulMeshKind;
  capability?: string;
  payload: T;
  timestamp: number;
}

export interface SoulMeshTransport {
  send(message: SoulMeshMessage): Promise<void>;
  onMessage(handler: (message: SoulMeshMessage) => void | Promise<void>): () => void;
}

export function createSoulMeshMessage<T>(input: Omit<SoulMeshMessage<T>, 'protocol' | 'id' | 'timestamp'>): SoulMeshMessage<T> {
  return { protocol: 'soul-mesh/1', id: crypto.randomUUID(), timestamp: Date.now(), ...input };
}

export function isSoulMeshMessage(value: unknown): value is SoulMeshMessage {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const m = value as Record<string, unknown>;
  if (m.protocol !== 'soul-mesh/1') return false;
  if (typeof m.id !== 'string' || m.id.length < 8 || m.id.length > 200) return false;
  if (typeof m.correlationId !== 'string' || m.correlationId.length < 8 || m.correlationId.length > 200) return false;
  if (typeof m.source !== 'string' || !NUCLEI.has(m.source as SoulNucleus)) return false;
  if (typeof m.target !== 'string' || !NUCLEI.has(m.target as SoulNucleus)) return false;
  if (m.source === m.target) return false;
  if (typeof m.kind !== 'string' || !KINDS.has(m.kind as SoulMeshKind)) return false;
  if (m.kind !== 'event' && (typeof m.capability !== 'string' || !m.capability.trim())) return false;
  return Number.isFinite(m.timestamp) && m.timestamp > 0 && 'payload' in m;
}
