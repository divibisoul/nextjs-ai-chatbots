import { N04OutboundMesh } from './N04OutboundMesh';
import { N04PeerDiscovery, type N04PeerEndpoint } from './N04PeerDiscovery';

export interface N04MeshBootstrapConfig {
  token?: string;
  peers: Partial<Record<'N01' | 'N02' | 'N03' | 'N05' | 'N06', string>>;
}

export class N04MeshBootstrap {
  readonly discovery: N04PeerDiscovery;
  readonly outbound: N04OutboundMesh;

  constructor(config: N04MeshBootstrapConfig) {
    this.discovery = new N04PeerDiscovery({ token: config.token });
    this.outbound = new N04OutboundMesh({ token: config.token });
  }

  async connect(): Promise<N04PeerEndpoint[]> {
    const profiles = Object.entries(configureProfiles(this.discovery, this.outbound, this.discovery))
      .map(([nucleus, baseUrl]) => ({ nucleus, baseUrl, transports: ['HTTP'] as const, capabilities: [] as const }));
    return this.discovery.discover(profiles as never);
  }
}

function configureProfiles(_discovery: N04PeerDiscovery, _outbound: N04OutboundMesh, _unused: N04PeerDiscovery): Record<string, string> {
  const peers: Record<string, string> = {};
  const entries: Array<[string, string | undefined]> = [
    ['N01', process.env.SOUL_MESH_N01_URL],
    ['N02', process.env.SOUL_MESH_N02_URL],
    ['N03', process.env.SOUL_MESH_N03_URL],
    ['N05', process.env.SOUL_MESH_N05_URL],
    ['N06', process.env.SOUL_MESH_N06_URL],
  ];
  for (const [nucleus, url] of entries) if (url) peers[nucleus] = url;
  return peers;
}
