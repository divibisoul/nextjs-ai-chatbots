/** @deprecated Compatibility facade. Canonical Mesh envelope/types live in lib/soul-mesh/SoulMeshProtocol.ts. */
import {
  SOUL_MESH_PROTOCOL,
  SOUL_MESH_CONTRACT_VERSION,
  SOUL_NUCLEI,
  createSoulMeshMessage,
  validateSoulMeshMessage,
  type SoulNucleus,
  type SoulMeshKind,
  type SoulMeshMessage as CanonicalSoulMeshMessage,
} from '../../lib/soul-mesh/SoulMeshProtocol';

export { SOUL_MESH_PROTOCOL, SOUL_MESH_CONTRACT_VERSION, SOUL_NUCLEI, createSoulMeshMessage, validateSoulMeshMessage };
export type { SoulNucleus, SoulMeshKind };
export type NucleusId = SoulNucleus;
export type CanonicalMessageKind = SoulMeshKind;
export type MessageKind = CanonicalMessageKind | 'ack';
export type SoulMeshMessage = Omit<CanonicalSoulMeshMessage, 'kind'> & { kind: MessageKind };

function toCanonicalMessage(message: SoulMeshMessage): CanonicalSoulMeshMessage {
  const canonical = {
    ...message,
    kind: message.kind === 'ack' ? 'response' : message.kind,
  } as CanonicalSoulMeshMessage;
  validateSoulMeshMessage(canonical);
  return canonical;
}

export function validateMessage(message: SoulMeshMessage, nucleusId: NucleusId): true {
  const canonical = toCanonicalMessage(message);
  if (canonical.target !== nucleusId) throw new Error('Wrong target');
  return true;
}

export async function handleMeshMessage(
  message: SoulMeshMessage,
  nucleusId: NucleusId,
  handlers: Record<string, (payload: unknown) => Promise<unknown> | unknown>,
): Promise<SoulMeshMessage> {
  const canonical = toCanonicalMessage(message);
  if (canonical.target !== nucleusId) throw new Error('Wrong target');
  if (message.kind !== 'request') return message;
  const capability = canonical.capability;
  if (!capability?.trim()) throw new Error('Malformed Mesh message: capability required for request');
  const handler = handlers[capability];
  if (!handler) {
    return createSoulMeshMessage({
      source: nucleusId,
      target: canonical.source,
      kind: 'error',
      capability,
      correlationId: canonical.correlationId,
      payload: { code: 'CAPABILITY_NOT_FOUND' },
      meta: canonical.meta,
      transport: canonical.transport,
    });
  }
  try {
    return createSoulMeshMessage({
      source: nucleusId,
      target: canonical.source,
      kind: 'response',
      capability,
      correlationId: canonical.correlationId,
      payload: await handler(canonical.payload),
      meta: canonical.meta,
      transport: canonical.transport,
    });
  } catch (error) {
    return createSoulMeshMessage({
      source: nucleusId,
      target: canonical.source,
      kind: 'error',
      capability,
      correlationId: canonical.correlationId,
      payload: { code: 'CAPABILITY_EXECUTION_ERROR', detail: error instanceof Error ? error.message : 'Unknown error' },
      meta: canonical.meta,
      transport: canonical.transport,
    });
  }
}
