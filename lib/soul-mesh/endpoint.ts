import type { SoulMeshMessage } from './SoulMeshProtocol';

export const NUCLEUS_ID = 'N04' as const;
const NUCLEI = new Set(['N01', 'N02', 'N03', 'N04', 'N05', 'N06']);

export function validateMeshMessage(m: SoulMeshMessage) {
  if (m.protocol !== 'soul-mesh/1') throw new Error('UNSUPPORTED_MESH_PROTOCOL');
  if (!m.id || !m.correlationId) throw new Error('MISSING_MESSAGE_ID');
  if (!NUCLEI.has(m.source) || !NUCLEI.has(m.target) || m.source === m.target) throw new Error('INVALID_NUCLEUS_ROUTE');
  if (m.target !== NUCLEUS_ID) throw new Error('WRONG_TARGET');
  if (!m.capability && m.kind !== 'event') throw new Error('MISSING_CAPABILITY');
  if (!Number.isFinite(m.timestamp)) throw new Error('INVALID_TIMESTAMP');
  return true;
}

function result(message: SoulMeshMessage, payload: unknown, kind: SoulMeshMessage['kind'] = 'response'): SoulMeshMessage {
  return { protocol: 'soul-mesh/1', id: crypto.randomUUID(), correlationId: message.correlationId, source: NUCLEUS_ID, target: message.source, kind, capability: message.capability, payload, timestamp: Date.now() };
}

/** N04 runtime dispatcher. New local capabilities can be registered without replacing the Mesh contract. */
export async function handleMeshMessage(message: SoulMeshMessage, handlers: Record<string, (payload: unknown) => Promise<unknown> | unknown> = {}) {
  validateMeshMessage(message);
  if (message.kind !== 'request') return message;
  if (message.capability === 'mesh.ping') return result(message, { ok: true, nucleus: NUCLEUS_ID, handler: 'N04.mesh.ping', echoed: message.payload, processedAt: Date.now() });
  if (message.capability === 'mesh.describe') return result(message, { nucleus: NUCLEUS_ID, protocol: 'soul-mesh/1', capabilities: ['mesh.ping', 'mesh.describe', 'core.health'], status: 'online' });
  if (message.capability === 'core.health') return result(message, { ok: true, nucleus: NUCLEUS_ID, runtime: 'nextjs-ai-chatbots', timestamp: Date.now() });
  const handler = handlers[message.capability ?? ''];
  if (!handler) return result(message, { code: 'CAPABILITY_HANDLER_NOT_REGISTERED', nucleus: NUCLEUS_ID, capability: message.capability }, 'error');
  try { return result(message, await handler(message.payload)); }
  catch (error) { return result(message, { code: 'CAPABILITY_EXECUTION_ERROR', nucleus: NUCLEUS_ID, detail: error instanceof Error ? error.message : 'Unknown error' }, 'error'); }
}
