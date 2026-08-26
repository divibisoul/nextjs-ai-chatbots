import type { SoulMeshTransportKind, SoulNucleus } from './SoulMeshProtocol';

/** Canonical transport order follows the N01 reference contract. */
export const N01_REFERENCE_TRANSPORTS: readonly SoulMeshTransportKind[] = [
  'IN_PROCESS', 'WEBVIEW_BRIDGE', 'LOOPBACK_HTTP', 'HTTP', 'REALTIME',
];

export interface NucleusTransportProfile {
  nucleus: SoulNucleus;
  transports: readonly SoulMeshTransportKind[];
}

/** N04 advertises only transports for which an implementation can be attached. */
export const N04_TRANSPORT_PROFILE: NucleusTransportProfile = {
  nucleus: 'N04',
  transports: ['IN_PROCESS', 'WEBVIEW_BRIDGE', 'LOOPBACK_HTTP', 'HTTP', 'REALTIME'],
};

export function selectCompatibleTransport(
  local: readonly SoulMeshTransportKind[],
  remote: readonly SoulMeshTransportKind[],
): SoulMeshTransportKind | null {
  for (const transport of N01_REFERENCE_TRANSPORTS) {
    if (local.includes(transport) && remote.includes(transport)) return transport;
  }
  return null;
}

export function buildPeerTransportMatrix(
  local: NucleusTransportProfile,
  peers: readonly NucleusTransportProfile[],
): Readonly<Record<SoulNucleus, SoulMeshTransportKind | null>> {
  return Object.fromEntries(peers.map((peer) => [peer.nucleus, selectCompatibleTransport(local.transports, peer.transports)])) as Record<SoulNucleus, SoulMeshTransportKind | null>;
}
