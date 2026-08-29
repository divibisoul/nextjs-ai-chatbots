import { negotiateTransport, type SoulMeshTransportKind } from './SoulMeshProtocol';
import { N04_IN_CHANNELS, N04_OUT_CHANNELS, PEERS, sendTo, type N04Peer } from './peer-client';

export type CooperativeAction = 'offer' | 'request' | 'delegate';

export interface N04CapabilityOffer {
  nucleus: 'N04';
  kind: 'capability.offer';
  capabilities: readonly string[];
  transports: readonly SoulMeshTransportKind[];
  channels: { inbound: readonly string[]; outbound: readonly string[] };
  timestamp: number;
}

export interface N04SupportRequest {
  nucleus: 'N04';
  kind: 'support.request' | 'work.delegate';
  capability: string;
  payload: unknown;
  reason?: string;
  correlationId: string;
  returnTo: 'N04';
  timestamp: number;
}

const LOCAL_TRANSPORTS: readonly SoulMeshTransportKind[] = [
  'IN_PROCESS',
  'WEBVIEW_BRIDGE',
  'LOOPBACK_HTTP',
  'HTTP',
  'REALTIME',
];

export function createN04CapabilityOffer(capabilities: readonly string[]): N04CapabilityOffer {
  return {
    nucleus: 'N04',
    kind: 'capability.offer',
    capabilities,
    transports: LOCAL_TRANSPORTS,
    channels: { inbound: N04_IN_CHANNELS, outbound: N04_OUT_CHANNELS },
    timestamp: Date.now(),
  };
}

export function negotiateN04Transport(remote: readonly SoulMeshTransportKind[]): SoulMeshTransportKind | null {
  return negotiateTransport(LOCAL_TRANSPORTS, remote);
}

export async function offerCapabilities(target: N04Peer, capabilities: readonly string[]): Promise<unknown> {
  return sendTo(target, 'mesh.capability.offer', createN04CapabilityOffer(capabilities));
}

export async function requestSupport(target: N04Peer, capability: string, payload: unknown, reason?: string): Promise<unknown> {
  const correlationId = crypto.randomUUID();
  const request: N04SupportRequest = {
    nucleus: 'N04',
    kind: 'support.request',
    capability,
    payload,
    reason,
    returnTo: 'N04',
    correlationId,
    timestamp: Date.now(),
  };
  return sendTo(target, capability, request);
}

export async function delegateWork(target: N04Peer, capability: string, payload: unknown, reason?: string): Promise<unknown> {
  const correlationId = crypto.randomUUID();
  const request: N04SupportRequest = {
    nucleus: 'N04',
    kind: 'work.delegate',
    capability,
    payload,
    reason,
    returnTo: 'N04',
    correlationId,
    timestamp: Date.now(),
  };
  return sendTo(target, capability, request);
}

export function isKnownN04Peer(value: string): value is N04Peer {
  return (PEERS as readonly string[]).includes(value);
}
