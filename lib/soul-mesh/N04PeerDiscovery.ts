import type { SoulNucleus, SoulMeshPeerProfile, SoulMeshTransportKind } from './SoulMeshProtocol';

export interface N04PeerEndpoint {
  nucleus: SoulNucleus;
  baseUrl: string;
  transports: readonly SoulMeshTransportKind[];
  capabilities: readonly string[];
  lastSeen: number;
}

export interface N04PeerDiscoveryOptions {
  token?: string;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 5000;

export class N04PeerDiscovery {
  private readonly peers = new Map<SoulNucleus, N04PeerEndpoint>();
  private readonly token?: string;
  private readonly timeoutMs: number;

  constructor(options: N04PeerDiscoveryOptions = {}) {
    this.token = options.token ?? process.env.SOUL_MESH_TOKEN;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async handshake(nucleus: Exclude<SoulNucleus, 'N04'>, baseUrl: string): Promise<N04PeerEndpoint> {
    const normalized = baseUrl.replace(/\/$/, '');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${normalized}/api/soul-mesh/handshake`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
        },
        body: JSON.stringify({ protocol: 'soul-mesh/1', source: 'N04', target: nucleus }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`SOUL_MESH_HANDSHAKE_FAILED:${nucleus}:${response.status}`);
      const body = await response.json() as { accepted?: boolean; nucleus?: SoulNucleus; transports?: SoulMeshTransportKind[]; capabilities?: string[] };
      if (!body.accepted || body.nucleus !== nucleus) throw new Error(`SOUL_MESH_HANDSHAKE_REJECTED:${nucleus}`);
      const peer: N04PeerEndpoint = {
        nucleus,
        baseUrl: normalized,
        transports: body.transports ?? ['HTTP'],
        capabilities: body.capabilities ?? [],
        lastSeen: Date.now(),
      };
      this.peers.set(nucleus, peer);
      return peer;
    } finally {
      clearTimeout(timer);
    }
  }

  async discover(profiles: readonly (SoulMeshPeerProfile & { baseUrl: string })[]): Promise<N04PeerEndpoint[]> {
    const results: N04PeerEndpoint[] = [];
    for (const profile of profiles) {
      if (profile.nucleus === 'N04') continue;
      try { results.push(await this.handshake(profile.nucleus, profile.baseUrl)); } catch { /* peer remains unavailable */ }
    }
    return results;
  }

  get(nucleus: SoulNucleus): N04PeerEndpoint | undefined { return this.peers.get(nucleus); }
  list(): N04PeerEndpoint[] { return [...this.peers.values()]; }
}
