import { selectTransport, TRANSPORTS, type TransportKind } from './HybridTransportRegistry';

export type InteropMode = 'mesh' | 'hybrid';

export interface PeerInteropProfile {
  nucleus: string;
  transports: readonly TransportKind[];
  meshEndpoint?: string;
  realtimeEndpoint?: string;
  webviewBridge?: boolean;
  loopbackHttp?: boolean;
}

export interface InteropDecision {
  mode: InteropMode;
  transport: TransportKind | null;
  bidirectional: boolean;
  reason: string;
}

const LOCAL_TRANSPORTS = TRANSPORTS;

/**
 * Hybrid interoperability is additive to Soul Mesh. Mesh remains the
 * protocol/control plane; transport selection may use any mutually supported
 * channel without creating a second application API.
 */
export function negotiateHybridInterop(peer: PeerInteropProfile): InteropDecision {
  const transport = selectTransport(LOCAL_TRANSPORTS, peer.transports);

  if (!transport) {
    return {
      mode: 'mesh',
      transport: null,
      bidirectional: false,
      reason: `No mutually supported transport for ${peer.nucleus}`,
    };
  }

  return {
    mode: transport === 'HTTP' ? 'mesh' : 'hybrid',
    transport,
    bidirectional: true,
    reason: `Selected ${transport} for bidirectional ${peer.nucleus} interoperability`,
  };
}

export function canPeerCommunicateBidirectionally(peer: PeerInteropProfile): boolean {
  return negotiateHybridInterop(peer).bidirectional;
}
