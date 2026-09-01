import type { SoulMeshMessage } from './SoulMeshProtocol';
import { isSoulMeshMessage } from './SoulMeshProtocol';
import type { Nucleus04ToolContext } from '@/lib/soul-core/Nucleus04ToolRegistry';

export const NUCLEUS_ID = 'N04' as const;
export const SOUL_MESH_CONTRACT_VERSION = '1.1.0' as const;
const NUCLEI = new Set(['N01', 'N02', 'N03', 'N04', 'N05', 'N06', 'N07']);
const MAX_PAYLOAD_BYTES = 1_000_000;
const MAX_CLOCK_SKEW_MS = 30_000;
const REPLAY_WINDOW_MS = 5 * 60_000;
const seenRequests = new Map<string, number>();
export type SoulMeshHandler = (payload: unknown) => Promise<unknown> | unknown;
export type N04MeshRuntimeContext = Nucleus04ToolContext;

function payloadSize(value: unknown): number {
  try { return new TextEncoder().encode(JSON.stringify(value)).byteLength; }
  catch { return Number.POSITIVE_INFINITY; }
}

function acceptOnce(id: string): boolean {
  const now = Date.now();
  for (const [key, timestamp] of seenRequests) if (now - timestamp > REPLAY_WINDOW_MS) seenRequests.delete(key);
  if (seenRequests.has(id)) return false;
  seenRequests.set(id, now);
  return true;
}

export function validateMeshMessage(m: unknown): asserts m is SoulMeshMessage {
  if (!isSoulMeshMessage(m)) throw new Error('INVALID_MESH_MESSAGE');
  if (!NUCLEI.has(m.source) || !NUCLEI.has(m.target) || m.source === m.target) throw new Error('INVALID_NUCLEUS_ROUTE');
  if (m.target !== NUCLEUS_ID) throw new Error('WRONG_TARGET');
  if (m.kind === 'request' && !m.capability?.trim()) throw new Error('MISSING_CAPABILITY');
  if (payloadSize(m.payload) > MAX_PAYLOAD_BYTES) throw new Error('MESH_PAYLOAD_TOO_LARGE');
  if (!Number.isFinite(m.timestamp) || Math.abs(Date.now() - m.timestamp) > MAX_CLOCK_SKEW_MS) throw new Error('MESH_TIMESTAMP_OUT_OF_WINDOW');
  if (m.kind === 'request' && !acceptOnce(m.id)) throw new Error('MESH_REPLAY_DETECTED');
}

function result(message: SoulMeshMessage, payload: unknown, kind: SoulMeshMessage['kind'] = 'response'): SoulMeshMessage {
  return {
    protocol: 'soul-mesh/1',
    contractVersion: SOUL_MESH_CONTRACT_VERSION,
    id: crypto.randomUUID(),
    correlationId: message.correlationId,
    source: NUCLEUS_ID,
    target: message.source,
    kind,
    capability: message.capability,
    payload,
    timestamp: Date.now(),
    meta: { runtime: 'nextjs-ai-chatbots', transport: 'HTTP', encoding: 'json', version: SOUL_MESH_CONTRACT_VERSION, traceId: message.meta?.traceId ?? message.correlationId },
  };
}

export function createN04MeshHandler(context?: N04MeshRuntimeContext) {
  return async function handleMeshMessage(
    message: SoulMeshMessage,
    handlers: Record<string, SoulMeshHandler> = {},
  ): Promise<SoulMeshMessage> {
    validateMeshMessage(message);
    if (message.kind !== 'request') return message;

    const capability = message.capability!;
    const handler = handlers[capability];
    try {
      if (handler) return result(message, await handler(message.payload));
      if (context) {
        const { createNucleus04Runtime } = await import('@/lib/soul-core/Nucleus04Runtime');
        const processor = createNucleus04Runtime(context).processor;
        return result(
          message,
          await processor.execute(
            { capability: capability as any, input: message.payload },
            { ...context, metadata: { mesh: true, source: message.source, correlationId: message.correlationId } } as any,
          ),
        );
      }
      return result(message, { code: 'CAPABILITY_HANDLER_NOT_REGISTERED', nucleus: NUCLEUS_ID, capability }, 'error');
    } catch (error) {
      return result(
        message,
        { code: 'CAPABILITY_EXECUTION_ERROR', nucleus: NUCLEUS_ID, capability, detail: error instanceof Error ? error.message : 'Unknown error' },
        'error',
      );
    }
  };
}

/** Compatibility facade over the single canonical handler; no second implementation. */
export const handleMeshMessage = createN04MeshHandler();
