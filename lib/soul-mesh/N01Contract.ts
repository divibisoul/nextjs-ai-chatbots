import { isSoulMeshMessage, type SoulMeshMessage, type SoulNucleus } from './SoulMeshProtocol';

/**
 * N01 canonical Soul Mesh Contract v1, mirrored from aeternum-core-29.
 * This adapter is intentionally transport-agnostic: N04 can speak the same
 * wire contract over HTTP or another future transport.
 */
export const N01_CONTRACT_VERSION = 'soul-mesh/1' as const;

export type N01ContractKind = 'request' | 'response' | 'event' | 'error' | 'ack';

export interface N01ContractValidation {
  ok: boolean;
  code?: string;
  detail?: string;
}

export function validateN01Contract(message: unknown): N01ContractValidation {
  if (!isSoulMeshMessage(message)) {
    return { ok: false, code: 'MALFORMED_MESSAGE', detail: 'Message does not satisfy Soul Mesh v1 wire validation.' };
  }

  const m = message as SoulMeshMessage;
  if (m.protocol !== N01_CONTRACT_VERSION) return { ok: false, code: 'PROTOCOL_MISMATCH' };
  if (m.source === m.target) return { ok: false, code: 'SELF_ROUTE_FORBIDDEN' };
  if (!m.id.trim() || !m.correlationId.trim()) return { ok: false, code: 'IDENTITY_REQUIRED' };
  if (!m.capability.trim() && m.kind !== 'event') return { ok: false, code: 'CAPABILITY_REQUIRED' };
  return { ok: true };
}

/** N01 capability ownership observed in its actual catalog. */
export const N01_CAPABILITIES = ['mesh.ping', 'data.remote'] as const;
export type N01Capability = typeof N01_CAPABILITIES[number];

export function isN01Capability(value: string): value is N01Capability {
  return (N01_CAPABILITIES as readonly string[]).includes(value);
}

export function createN01Request<T>(capability: N01Capability, payload: T, idFactory = crypto.randomUUID): SoulMeshMessage<T> {
  return {
    protocol: N01_CONTRACT_VERSION,
    id: idFactory(),
    correlationId: idFactory(),
    source: 'N04' as SoulNucleus,
    target: 'N01',
    kind: 'request',
    capability,
    payload,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Request/ACK/response lifecycle required by the N01 contract:
 * discovery -> handshake -> validation -> authorization -> ping -> request
 * -> ACK -> response -> correlation check -> health.
 */
export interface N01LifecycleState {
  discovery: boolean;
  handshake: boolean;
  validation: boolean;
  authorization: boolean;
  ping: boolean;
  request: boolean;
  ack: boolean;
  response: boolean;
  correlation: boolean;
  health: boolean;
}

export function createN01Lifecycle(): N01LifecycleState {
  return {
    discovery: false,
    handshake: false,
    validation: false,
    authorization: false,
    ping: false,
    request: false,
    ack: false,
    response: false,
    correlation: false,
    health: false,
  };
}

export function acceptN01Reply(reply: unknown, request: SoulMeshMessage): N01ContractValidation {
  const validation = validateN01Contract(reply);
  if (!validation.ok) return validation;
  const response = reply as SoulMeshMessage;
  if (response.source !== request.target || response.target !== request.source) {
    return { ok: false, code: 'ROUTE_MISMATCH' };
  }
  if (response.correlationId !== request.correlationId) {
    return { ok: false, code: 'ORPHAN_CORRELATION' };
  }
  if (!['ack', 'response', 'error'].includes(response.kind)) {
    return { ok: false, code: 'INVALID_REPLY_KIND' };
  }
  return { ok: true };
}
