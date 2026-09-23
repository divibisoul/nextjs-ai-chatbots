import { createHmac } from 'node:crypto';
import type { SoulMeshMessage } from './SoulMeshProtocol';
import { isSoulMeshMessage } from './SoulMeshProtocol';
import type { Nucleus04ToolContext } from '@/lib/soul-core/Nucleus04ToolRegistry';
import type { Nucleus04Context } from '@/lib/soul-core/Nucleus04Processor';
import { supportsNucleus04Capability } from '@/lib/soul-core/Nucleus04Capabilities';

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
  const id = crypto.randomUUID();
  const nonce = crypto.randomUUID();
  const timestamp = Date.now();
  const legacy = {
    version: '1.0',
    contractVersion: SOUL_MESH_CONTRACT_VERSION,
    messageId: id,
    source: NUCLEUS_ID,
    target: message.source,
    timestamp,
    nonce,
    correlationId: message.correlationId,
    type: kind === 'error' ? 'ERROR' : 'TASK_RESULT',
    payload: { capability: message.capability ?? '', payload },
  };
  const secret = String(process.env.SOUL_MESH_HMAC_SECRET ?? '').trim();
  const hmac = secret ? createHmac('sha256', secret).update(JSON.stringify(legacy), 'utf8').digest('hex') : '';
  return {
    protocol: 'soul-mesh/1',
    contractVersion: SOUL_MESH_CONTRACT_VERSION,
    id,
    correlationId: message.correlationId,
    source: NUCLEUS_ID,
    target: message.source,
    kind,
    capability: message.capability,
    payload,
    timestamp,
    nonce,
    ...(hmac ? { hmac } : {}),
    meta: { runtime: 'nextjs-ai-chatbots', transport: 'HTTP', encoding: 'json', version: SOUL_MESH_CONTRACT_VERSION, traceId: message.meta?.traceId ?? message.correlationId, nonce },
  } as SoulMeshMessage;
}

export function createN04MeshHandler(context?: N04MeshRuntimeContext) {
  return async function handleMeshMessage(
    message: SoulMeshMessage,
    handlers: Record<string, SoulMeshHandler> = {},
  ): Promise<SoulMeshMessage> {
    validateMeshMessage(message);
    if (message.kind !== 'request') return message;

    const capability = message.capability;
    if (!capability) throw new Error('MISSING_CAPABILITY');
    if (capability === 'octacore.execute') {
      const input = message.payload;
      if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('OCTACORE_N04_PAYLOAD_MUST_BE_OBJECT');
      const value = input as Record<string, unknown>;
      const request = {
        capability: typeof value.capability === 'string' ? value.capability : '',
        payload: value.payload,
        job_id: typeof value.job_id === 'string' ? value.job_id : undefined,
        correlation_id: message.correlationId,
      };
      const { executeOctaCoreN04 } = await import('@/lib/octacore/OctaCoreN04Adapter');
      try {
        return result(message, await executeOctaCoreN04(request, context));
      } catch (error) {
        return result(
          message,
          {
            code: 'OCTACORE_N04_EXECUTION_ERROR',
            detail: error instanceof Error ? error.message : String(error),
          },
          'error',
        );
      }
    }
    if (capability === 'mesh.discovery' || capability === 'mesh.describe' || capability === 'mesh.ping' || capability === 'mesh.handshake') {
      const { createNucleus04MeshHandlers } = await import('@/lib/soul-core/Nucleus04MeshRuntime');
      const meshHandlers = createNucleus04MeshHandlers({ session: context?.session ?? null });
      const meshHandler = (meshHandlers as Record<string, (payload: unknown) => unknown | Promise<unknown>>)[capability];
      if (!meshHandler) throw new Error('MESH_CAPABILITY_NOT_IMPLEMENTED:' + capability);
      return result(message, await meshHandler(message.payload));
    }
    const handler = handlers[capability];
    try {
      if (handler) return result(message, await handler(message.payload));
      if (context) {
        const { createNucleus04Runtime } = await import('@/lib/soul-core/Nucleus04Runtime');
        const processor = createNucleus04Runtime(context).processor;
        return result(
          message,
          await processor.execute(
            {
              capability: supportsNucleus04Capability(capability) ? capability : (() => { throw new Error('UNSUPPORTED_N04_CAPABILITY'); })(),
              input: message.payload,
            },
            {
              ...(context as Nucleus04Context),
              metadata: { mesh: true, source: message.source, correlationId: message.correlationId },
            },
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
