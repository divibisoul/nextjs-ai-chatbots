export type SoulNucleus = 'N01' | 'N02' | 'N03' | 'N04' | 'N05' | 'N06';
export type SoulMeshKind = 'request' | 'response' | 'event' | 'error' | 'ack';
export type SoulMeshTransportKind = 'IN_PROCESS' | 'WEBVIEW_BRIDGE' | 'LOOPBACK_HTTP' | 'HTTP' | 'REALTIME';

export interface SoulMeshMessage<T = unknown> {
  protocol: 'soul-mesh/1'; id: string; correlationId: string; source: SoulNucleus; target: SoulNucleus;
  kind: SoulMeshKind; capability?: string; payload: T; timestamp: number;
  transport?: SoulMeshTransportKind;
}

export interface SoulMeshTransport {
  kind: SoulMeshTransportKind;
  send(message: SoulMeshMessage): Promise<void>;
  onMessage(handler: (message: SoulMeshMessage) => void | Promise<void>): () => void;
}

export interface SoulMeshPeerProfile { nucleus: SoulNucleus; transports: readonly SoulMeshTransportKind[]; capabilities: readonly string[]; }

export const SOUL_NUCLEI: readonly SoulNucleus[] = ['N01', 'N02', 'N03', 'N04', 'N05', 'N06'];
export const SOUL_MESH_KINDS: readonly SoulMeshKind[] = ['request', 'response', 'event', 'error', 'ack'];
export const SOUL_MESH_TRANSPORTS: readonly SoulMeshTransportKind[] = ['IN_PROCESS', 'WEBVIEW_BRIDGE', 'LOOPBACK_HTTP', 'HTTP', 'REALTIME'];

export function createSoulMeshMessage<T>(input: Omit<SoulMeshMessage<T>, 'protocol' | 'id' | 'timestamp'>): SoulMeshMessage<T> {
  return { protocol: 'soul-mesh/1', id: crypto.randomUUID(), timestamp: Date.now(), ...input };
}

export function isSoulNucleus(value: unknown): value is SoulNucleus { return typeof value === 'string' && (SOUL_NUCLEI as readonly string[]).includes(value); }
export function isSoulMeshTransport(value: unknown): value is SoulMeshTransportKind { return typeof value === 'string' && (SOUL_MESH_TRANSPORTS as readonly string[]).includes(value); }
export function isSoulMeshMessage(value: unknown): value is SoulMeshMessage {
  if (!value || typeof value !== 'object') return false; const m = value as Record<string, unknown>;
  return m.protocol === 'soul-mesh/1' && typeof m.id === 'string' && m.id.length > 0 && typeof m.correlationId === 'string' && m.correlationId.length > 0 && isSoulNucleus(m.source) && isSoulNucleus(m.target) && typeof m.kind === 'string' && (SOUL_MESH_KINDS as readonly string[]).includes(m.kind) && (m.capability === undefined || (typeof m.capability === 'string' && m.capability.length > 0)) && typeof m.timestamp === 'number' && Number.isFinite(m.timestamp) && (m.transport === undefined || isSoulMeshTransport(m.transport));
}

export function negotiateTransport(local: readonly SoulMeshTransportKind[], remote: readonly SoulMeshTransportKind[]): SoulMeshTransportKind | null {
  for (const preferred of SOUL_MESH_TRANSPORTS) if (local.includes(preferred) && remote.includes(preferred)) return preferred;
  return null;
}
