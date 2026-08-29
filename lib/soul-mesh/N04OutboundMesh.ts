import { createSoulMeshMessage, type SoulMeshMessage, type SoulNucleus } from './SoulMeshProtocol';
import type { N04PeerEndpoint } from './N04PeerDiscovery';

export interface N04OutboundOptions { token?: string; timeoutMs?: number; }

export class N04OutboundMesh {
  constructor(private readonly options: N04OutboundOptions = {}) {}

  async request<T = unknown>(peer: N04PeerEndpoint, capability: string, payload: T, correlationId = crypto.randomUUID()): Promise<SoulMeshMessage> {
    const message = createSoulMeshMessage({
      source: 'N04' as SoulNucleus,
      target: peer.nucleus,
      kind: 'request',
      capability,
      payload,
      correlationId,
      transport: 'HTTP',
    });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 30000);
    try {
      const response = await fetch(`${peer.baseUrl}/api/soul-mesh`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(this.options.token ? { authorization: `Bearer ${this.options.token}` } : {}),
        },
        body: JSON.stringify(message),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`SOUL_MESH_REQUEST_FAILED:${peer.nucleus}:${response.status}`);
      return await response.json() as SoulMeshMessage;
    } finally {
      clearTimeout(timeout);
    }
  }
}
