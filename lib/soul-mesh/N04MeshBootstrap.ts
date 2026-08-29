import { N04OutboundMesh } from './N04OutboundMesh';
import { N04PeerDiscovery, type N04PeerEndpoint } from './N04PeerDiscovery';
import type { SoulNucleus, SoulMeshPeerProfile } from './SoulMeshProtocol';

export interface N04MeshBootstrapConfig {
  token?: string;
  peers?: Partial<Record<Exclude<SoulNucleus, 'N04'>, string>>;
}

export class N04MeshBootstrap {
  readonly discovery: N04PeerDiscovery;
  readonly outbound: N04OutboundMesh;
  private readonly peers: Partial<Record<Exclude<SoulNucleus, 'N04'>, string>>;

  constructor(config: N04MeshBootstrapConfig = {}) {
    this.discovery = new N04PeerDiscovery({ token: config.token });
    this.outbound = new N04OutboundMesh({ token: config.token });
    this.peers = config.peers ?? {
      N01: process.env.SOUL_MESH_N01_URL,
      N02: process.env.SOUL_MESH_N02_URL,
      N03: process.env.SOUL_MESH_N03_URL,
      N05: process.env.SOUL_MESH_N05_URL,
      N06: process.env.SOUL_MESH_N06_URL,
    };
  }

  async connect(): Promise<N04PeerEndpoint[]> {
    const profiles: Array<SoulMeshPeerProfile & { baseUrl: string }> = [];
    for (const [nucleus, baseUrl] of Object.entries(this.peers) as Array<[Exclude<SoulNucleus, 'N04'>, string | undefined]>) {
      if (!baseUrl) continue;
      profiles.push({ nucleus, baseUrl, transports: ['HTTP'], capabilities: [] });
    }
    return this.discovery.discover(profiles);
  }
}
