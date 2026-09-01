import type { SoulMeshMessage, SoulNucleus } from './SoulMeshProtocol';
import { isSoulMeshMessage, SOUL_MESH_CONTRACT_VERSION } from './SoulMeshProtocol';

export const SOUL_MESH_PROTOCOL_VERSION = 'soul-mesh/1' as const;
export const SOUL_MESH_PEER_COUNT = 5;
export const SOUL_MESH_ROUTE_COUNT = 10;

export function createMeshRequest(
  source: SoulNucleus,
  target: SoulNucleus,
  capability: string,
  payload: unknown,
): SoulMeshMessage {
  const correlationId = crypto.randomUUID();
  return {
    protocol: SOUL_MESH_PROTOCOL_VERSION,
    contractVersion: SOUL_MESH_CONTRACT_VERSION,
    id: crypto.randomUUID(),
    correlationId,
    source,
    target,
    kind: 'request',
    capability,
    payload,
    timestamp: Date.now(),
  };
}

export function validateMeshResponse(
  request: SoulMeshMessage,
  response: unknown,
): response is SoulMeshMessage {
  if (!isSoulMeshMessage(response)) return false;
  return response.protocol === request.protocol &&
    response.contractVersion === request.contractVersion &&
    response.correlationId === request.correlationId &&
    response.source === request.target &&
    response.target === request.source &&
    (response.kind === 'response' || response.kind === 'error');
}
