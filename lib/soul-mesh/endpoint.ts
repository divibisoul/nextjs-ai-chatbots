import type { SoulMeshMessage } from './SoulMeshProtocol';
import { isSoulMeshMessage } from './SoulMeshProtocol';

export const NUCLEUS_ID = 'N04' as const;
const NUCLEI = new Set(['N01', 'N02', 'N03', 'N04', 'N05', 'N06']);
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

export type SoulMeshHandler = (payload: unknown) => Promise<unknown> | unknown;

export function validateMeshMessage(m: unknown): asserts m is SoulMeshMessage {
  if (!isSoulMeshMessage(m)) throw new Error('INVALID_MESH_ENVELOPE');
  if (m.protocol !== 'soul-mesh/1') throw new Error('UNSUPPORTED_MESH_PROTOCOL');
  if (!NUCLEI.has(m.source) || !NUCLEI.has(m.target) || m.source === m.target) throw new Error('INVALID_NUCLEUS_ROUTE');
  if (m.target !== NUCLEUS_ID) throw new Error('WRONG_TARGET');
  if (!m.capability && m.kind !== 'event') throw new Error('MISSING_CAPABILITY');
  if (Math.abs(Date.now() - m.timestamp) > MAX_CLOCK_SKEW_MS) throw new Error('STALE_MESH_MESSAGE');
}

function result(message: SoulMeshMessage, payload: unknown, kind: SoulMeshMessage['kind'] = 'response'): SoulMeshMessage {
  return {
    protocol: 'soul-mesh/1', id: crypto.randomUUID(), correlationId: message.correlationId,
    source: NUCLEUS_ID, target: message.source, kind, capability: message.capability,
    payload, timestamp: Date.now(),
  };
}

export async function handleMeshMessage(message: unknown, handlers: Record<string, SoulMeshHandler> = {}) {
  validateMeshMessage(message);
  if (message.kind !== 'request') return message;

  const handler = handlers[message.capability ?? ''];
  if (!handler) {
    return result(message, { code: 'CAPABILITY_HANDLER_NOT_REGISTERED', nucleus: NUCLEUS_ID, capability: message.capability }, 'error');
  }

  try {
    return result(message, await handler(message.payload));
  } catch (error) {
    return result(message, {
      code: 'CAPABILITY_EXECUTION_ERROR', nucleus: NUCLEUS_ID,
      detail: error instanceof Error ? error.message : 'Unknown error',
    }, 'error');
  }
}
