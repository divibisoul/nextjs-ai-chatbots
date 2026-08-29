import { createSoulMeshMessage, type SoulMeshMessage, type SoulNucleus, type SoulMeshPeerProfile, type SoulMeshTransportKind, negotiateTransport } from './SoulMeshProtocol';
import { sendSoulMeshMessage } from './SoulMeshClient';

export interface N04PeerDirectory {
  get(peer: SoulNucleus): SoulMeshPeerProfile | undefined;
  endpoint(peer: SoulNucleus): string | undefined;
}

export interface N04DelegationRequest {
  capability: string;
  payload: unknown;
  preferredPeers?: readonly SoulNucleus[];
  correlationId?: string;
}

export interface N04DelegationResult {
  peer: SoulNucleus;
  transport: SoulMeshTransportKind;
  message: SoulMeshMessage;
}

/**
 * Cooperative layer for N04: local execution remains primary, while work that
 * belongs to another nucleus can be delegated through the canonical Soul Mesh.
 * Transport negotiation keeps the connection hybrid instead of HTTP-only.
 */
export class N04CooperativeOrchestrator {
  constructor(
    private readonly directory: N04PeerDirectory,
    private readonly localTransports: readonly SoulMeshTransportKind[] = ['IN_PROCESS', 'WEBVIEW_BRIDGE', 'LOOPBACK_HTTP', 'HTTP', 'REALTIME'],
  ) {}

  choosePeer(capability: string, preferredPeers: readonly SoulNucleus[] = ['N01', 'N02', 'N03', 'N05', 'N06']): { peer: SoulNucleus; transport: SoulMeshTransportKind; endpoint: string } | undefined {
    for (const peer of preferredPeers) {
      const profile = this.directory.get(peer);
      const endpoint = this.directory.endpoint(peer);
      if (!profile || !endpoint || !profile.capabilities.includes(capability)) continue;
      const transport = negotiateTransport(this.localTransports, profile.transports);
      if (transport) return { peer, transport, endpoint };
    }
    return undefined;
  }

  async delegate(request: N04DelegationRequest): Promise<N04DelegationResult> {
    const selected = this.choosePeer(request.capability, request.preferredPeers);
    if (!selected) {
      throw new Error(`SOUL_MESH_NO_CAPABLE_PEER:${request.capability}`);
    }

    const message = createSoulMeshMessage({
      correlationId: request.correlationId ?? crypto.randomUUID(),
      source: 'N04',
      target: selected.peer,
      kind: 'request',
      capability: request.capability,
      payload: request.payload,
      transport: selected.transport,
    });

    const response = await sendSoulMeshMessage(selected.endpoint, message);
    return { peer: selected.peer, transport: selected.transport, message: response };
  }
}
